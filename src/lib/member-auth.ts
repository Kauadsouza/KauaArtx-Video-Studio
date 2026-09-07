import 'server-only';
import { randomBytes, scrypt as derive, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { prisma } from './prisma';

const scrypt = promisify(derive);
export const MEMBER_COOKIE = 'artx_member';
export const APPS = ['videos', 'study', 'university'] as const;
export type MemberApp = (typeof APPS)[number];
export function memberApp(value: unknown): MemberApp {
  if (!APPS.includes(value as MemberApp)) throw new Error('Aplicativo inválido.');
  return value as MemberApp;
}
export function digest(value: string) { return createHash('sha256').update(value).digest('hex'); }
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
export async function matchesPassword(password: string, saved: string) {
  const [salt, hash] = saved.split(':');
  const actual = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export async function throttle(key: string, max = 12) {
  const bucket = `${key}:${Math.floor(Date.now() / 900000)}`;
  const row = await prisma.accessThrottle.upsert({ where: { key: bucket }, create: { key: bucket, expiresAt: new Date(Date.now() + 900000) }, update: { attempts: { increment: 1 } } });
  if (row.attempts > max) throw new Error('Muitas tentativas. Aguarde 15 minutos.');
}
export async function issueMemberSession(principal: string, app: MemberApp) {
  const token = randomBytes(32).toString('hex');
  await prisma.memberSession.create({ data: { digest: digest(token), principal, app, expiresAt: new Date(Date.now() + 86400000) } });
  return token;
}
export async function memberIdentity(token: string | undefined, app: MemberApp) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new Error('Entre na sua conta.');
  const session = await prisma.memberSession.findUnique({ where: { digest: digest(token) } });
  if (!session || session.app !== app || session.expiresAt.getTime() <= Date.now()) throw new Error('Sessão expirada. Entre novamente.');
  if (session.principal !== 'owner') {
    const grant = await prisma.memberGrant.findUnique({ where: { memberId_app: { memberId: session.principal, app } } });
    if (grant?.status !== 'approved') throw new Error('Acesso pendente ou revogado.');
  }
  return session.principal;
}
export async function requireHubOwner(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const email = process.env.HUB_ALLOWED_EMAIL?.trim().toLowerCase();
  if (!url || !key || !email || !token || token.length > 8192) throw new Error('Acesso administrativo indisponível.');
  const res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('Sessão administrativa inválida.');
  const user = await res.json();
  if (!user.id || user.email?.toLowerCase() !== email) throw new Error('Apenas o proprietário pode administrar contas.');
  return user.id as string;
}
