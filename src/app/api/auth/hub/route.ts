import { NextResponse } from "next/server";
import { AUTH_COOKIE, SESSION_TTL_MS, isAuthConfigured, issueSessionToken } from "@/lib/auth";

type HubUser = { email?: string };

/**
 * Converte um access token já autenticado no ARTX Hub em uma sessão curta
 * exclusiva deste domínio. O token é confirmado diretamente no Supabase.
 */
export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json({ error: "Sessão do Sistema de Vídeos não configurada." }, { status: 503 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const allowedEmail = process.env.HUB_ALLOWED_EMAIL?.trim().toLowerCase();
  if (!supabaseUrl || !supabaseKey || !allowedEmail) {
    return NextResponse.json({ error: "Integração com o ARTX Hub não configurada." }, { status: 503 });
  }

  let accessToken = "";
  try {
    const body = await request.json() as { accessToken?: unknown };
    if (typeof body.accessToken === "string") accessToken = body.accessToken;
  } catch {
    return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
  }

  if (!accessToken) return NextResponse.json({ error: "Sessão do Hub ausente." }, { status: 401 });

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!userResponse.ok) return NextResponse.json({ error: "Sessão do Hub inválida." }, { status: 401 });

  const user = await userResponse.json() as HubUser;
  if (user.email?.toLowerCase() !== allowedEmail) {
    return NextResponse.json({ error: "Este Hub não possui acesso ao Sistema de Vídeos." }, { status: 403 });
  }

  const sessionToken = await issueSessionToken();
  if (!sessionToken) return NextResponse.json({ error: "Não foi possível criar a sessão." }, { status: 500 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return response;
}
