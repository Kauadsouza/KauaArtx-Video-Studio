import 'server-only';
import { createHash } from 'node:crypto';
import { prisma } from './prisma';

/**
 * O que sobrou aqui depois que o serviço de contas foi para o Hub.
 *
 * Criar conta, entrar, sair e aprovar acontecem no Hub — ele é o único ponto
 * que centraliza, e enquanto isso morava aqui dentro um deploy deste sistema
 * derrubava o login de todos os outros.
 *
 * Este sistema não emite sessão nem guarda senha. Ele só precisa responder uma
 * pergunta, no servidor, a cada pedido: de quem é este cookie? A conferência é
 * feita no banco, e não na palavra do navegador.
 *
 * Quando as contas saírem deste banco e forem para o do Hub, esta leitura vira
 * uma pergunta ao Hub e este arquivo some.
 */

export const MEMBER_COOKIE = 'artx_member';

/** O token nunca é guardado em claro: no banco fica só o resumo dele. */
export function digest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * De quem é esta sessão, neste sistema.
 *
 * A permissão é conferida a cada pedido, não só na entrada: o acesso pode ter
 * sido revogado no Hub enquanto a pessoa estava com a tela aberta.
 */
export async function memberIdentity(token: string | undefined, app: 'videos') {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new Error('Entre na sua conta.');
  const session = await prisma.memberSession.findUnique({ where: { digest: digest(token) } });
  if (!session || session.app !== app || session.expiresAt.getTime() <= Date.now()) {
    throw new Error('Sessão expirada. Entre novamente.');
  }
  if (session.principal !== 'owner') {
    const grant = await prisma.memberGrant.findUnique({ where: { memberId_app: { memberId: session.principal, app } } });
    if (grant?.status !== 'approved') throw new Error('Acesso pendente ou revogado.');
  }
  return session.principal;
}
