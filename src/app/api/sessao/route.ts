import { NextResponse } from "next/server";
import { MEMBER_COOKIE, memberIdentity } from "@/lib/member-auth";

/**
 * Transforma o token emitido pelo Hub em cookie deste domínio.
 *
 * O login deixou de acontecer aqui: quem atende contas agora é o Hub, que é o
 * único ponto que centraliza. Só que cookie não atravessa domínio — o Hub não
 * tem como gravar o cookie deste sistema, e as páginas daqui dependem dele
 * para saber de quem é a sessão no servidor.
 *
 * Então o navegador traz o token, e este sistema confere e grava o seu próprio
 * cookie. Conferir é o ponto: um token que este sistema não reconhece não vira
 * sessão, mesmo tendo chegado por aqui.
 */

export const runtime = "nodejs";

/* Só a própria origem. A rota grava cookie; aceitar de fora seria deixar outro
   site escolher com qual sessão este navegador entra aqui. */
function mesmaOrigem(request: Request) {
  const origem = request.headers.get("origin");
  return !origem || origem === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!mesmaOrigem(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Envie JSON." }, { status: 415 });
  }

  let token: unknown;
  try {
    ({ token } = (await request.json()) as { token?: unknown });
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const resposta = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });

  // token nulo é como a tela pede para sair: o cookie sai junto.
  if (token === null) {
    resposta.cookies.delete(MEMBER_COOKIE);
    return resposta;
  }

  if (typeof token !== "string") return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });

  try {
    await memberIdentity(token, "videos");
  } catch {
    // A mensagem é sempre a mesma: dizer se o token é inválido, expirado ou
    // revogado seria contar a quem está tentando em que pé ele está.
    return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  }

  resposta.cookies.set(MEMBER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 86400,
  });
  return resposta;
}
