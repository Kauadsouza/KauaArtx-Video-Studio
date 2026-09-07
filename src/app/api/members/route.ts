import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { digest, hashPassword, matchesPassword, memberApp, memberIdentity, issueMemberSession, requireHubOwner, throttle, MEMBER_COOKIE } from '@/lib/member-auth';

export const runtime = 'nodejs';
const allowed = new Set(['https://artx-hub.vercel.app', 'https://sat-simulado.vercel.app', 'https://university-path-six.vercel.app', 'https://sistema-videos.vercel.app']);
function headers(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin && !allowed.has(origin)) throw new Error('Origem não permitida.');
  return { 'Cache-Control': 'no-store', 'Vary': 'Origin', ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}) };
}
export function OPTIONS(request: Request) {
  try { return new Response(null, { status: 204, headers: { ...headers(request), 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } }); }
  catch { return new Response(null, { status: 403 }); }
}
async function read(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('Envie JSON.');
  const reader = request.body?.getReader(); if (!reader) throw new Error('Pedido vazio.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 2_000_000) { await reader.cancel(); throw new Error('Pedido muito grande.'); } chunks.push(value); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}
export async function POST(request: Request) {
  let responseHeaders: Record<string, string>;
  try { responseHeaders = headers(request); } catch { return NextResponse.json({ error: 'Origem não permitida.' }, { status: 403 }); }
  try {
    const body = await read(request);
    const action = body.action;
    const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
    let result: unknown = { ok: true };
    let cookie: string | undefined;
    if (action === 'admin-list' || action === 'admin-decide') {
      await requireHubOwner(token);
      if (action === 'admin-list') result = await prisma.memberGrant.findMany({ select: { app: true, status: true, memberId: true, updatedAt: true, member: { select: { username: true, createdAt: true } } }, orderBy: { updatedAt: 'desc' }, take: 500 });
      else {
        const app = memberApp(body.app); const memberId = String(body.memberId ?? '');
        if (!['approved', 'rejected', 'revoked'].includes(String(body.status))) throw new Error('Decisão inválida.');
        await prisma.$transaction(async tx => {
          await tx.memberGrant.update({ where: { memberId_app: { memberId, app } }, data: { status: String(body.status) } });
          await tx.memberSession.deleteMany({ where: { principal: memberId, app } });
        });
      }
    } else if (action === 'owner') {
      await requireHubOwner(token);
      const app = memberApp(body.app);
      result = { token: await issueMemberSession('owner', app), principal: 'owner', owner: true };
    } else if (action === 'register' || action === 'login') {
      const username = String(body.username ?? '').trim().toLowerCase();
      const password = String(body.password ?? ''); const app = memberApp(body.app);
      if (!/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(username) || password.length < 10 || password.length > 128) throw new Error('Use um nome de 3–32 caracteres (letras, números, ponto ou traço) e uma senha de 10–128 caracteres.');
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
      await throttle(`ip:${digest(ip)}`, 30); await throttle(`user:${username}`);
      const account = await prisma.memberAccount.findUnique({ where: { username } });
      if (action === 'register') {
        if (account) throw new Error('Nome indisponível. Se a conta é sua, entre para pedir acesso a este sistema.');
        await prisma.memberAccount.create({ data: { username, passwordHash: await hashPassword(password), grants: { create: { app, status: 'pending' } } } });
        result = { pending: true, message: 'Conta criada. Aguarde a aprovação do administrador no Hub.' };
      } else {
        if (!account) { await hashPassword(password); throw new Error('Nome ou senha incorretos.'); }
        if (!await matchesPassword(password, account.passwordHash)) throw new Error('Nome ou senha incorretos.');
        const grant = await prisma.memberGrant.upsert({ where: { memberId_app: { memberId: account.id, app } }, create: { memberId: account.id, app }, update: {} });
        if (grant.status !== 'approved') result = { pending: true, message: grant.status === 'pending' ? 'Aguardando aprovação no Hub.' : 'Acesso não autorizado. Fale com o administrador.' };
        else { const session = await issueMemberSession(account.id, app); result = { token: session, principal: account.id, username: account.username, owner: false }; if (app === 'videos') cookie = session; }
      }
    } else {
      const app = memberApp(body.app); const principal = await memberIdentity(token, app);
      if (action === 'session') result = { principal, owner: principal === 'owner' };
      else if (action === 'logout') { await prisma.memberSession.deleteMany({ where: { digest: digest(token) } }); }
      else if (action === 'load') result = await prisma.memberState.findUnique({ where: { principal_app: { principal, app } }, select: { payload: true, revision: true } });
      else if (action === 'save') {
        if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload) || !Number.isSafeInteger(body.revision)) throw new Error('Planejamento inválido.');
        const revision = Number(body.revision);
        if (revision === 0) { await prisma.memberState.create({ data: { principal, app, payload: body.payload as object } }); result = { revision: 1 }; }
        else {
          const updated = await prisma.memberState.updateMany({ where: { principal, app, revision }, data: { payload: body.payload as object, revision: { increment: 1 } } });
          if (!updated.count) throw new Error('Outra sessão alterou seus dados. Recarregue antes de salvar.');
          result = { revision: revision + 1 };
        }
      } else throw new Error('Ação inválida.');
    }
    const response = NextResponse.json(result, { headers: responseHeaders });
    if (cookie) {
      response.cookies.delete('kx_session');
      response.cookies.set(MEMBER_COOKIE, cookie, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 86400 });
    }
    return response;
  } catch (error) {
    // Never expose database queries, connection details or credential material.
    const safe = error instanceof Error && !/Prisma|prisma|Unique constraint|Invalid `|\n/.test(error.message) ? error.message : 'Não foi possível concluir. Seus dados foram preservados; tente novamente.';
    return NextResponse.json({ error: safe }, { status: 400, headers: responseHeaders });
  }
}
