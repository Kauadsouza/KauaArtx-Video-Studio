import { NextResponse } from "next/server";
import { AUTH_COOKIE, PARTITIONED_AUTH_COOKIE, SESSION_TTL_MS, isAuthConfigured, issueSessionToken } from "@/lib/auth";

type HubUser = { email?: string };

/**
 * Converte um access token já autenticado no ARTX Hub em uma sessão curta
 * exclusiva deste domínio. O token é confirmado diretamente no Supabase.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "JSON required." }, { status: 415 });
  }
  if (!isAuthConfigured()) {
    return NextResponse.json({ error: "Sessão do KauaArtx Video Studio não configurada." }, { status: 503 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const allowedEmail = process.env.HUB_ALLOWED_EMAIL?.trim().toLowerCase();
  if (!supabaseUrl || !supabaseKey || !allowedEmail) {
    return NextResponse.json({ error: "Integração com o ARTX Hub não configurada." }, { status: 503 });
  }

  let accessToken = "";
  try {
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "Request body required." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 10_240) {
        await reader.cancel();
        return NextResponse.json({ error: "Request too large." }, { status: 413 });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body = JSON.parse(new TextDecoder().decode(bytes)) as { accessToken?: unknown };
    if (typeof body.accessToken === "string") accessToken = body.accessToken;
  } catch {
    return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
  }

  if (!accessToken || accessToken.length > 8192 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(accessToken)) return NextResponse.json({ error: "Sessão do Hub ausente ou inválida." }, { status: 401 });

  let userResponse: Response;
  try { userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }); } catch {
    return NextResponse.json({ error: "Authentication is temporarily unavailable." }, { status: 503 });
  }
  if (!userResponse.ok) return NextResponse.json({ error: "Sessão do Hub inválida." }, { status: 401 });

  const user = await userResponse.json() as HubUser;
  if (user.email?.toLowerCase() !== allowedEmail) {
    return NextResponse.json({ error: "Este Hub não possui acesso ao KauaArtx Video Studio." }, { status: 403 });
  }

  const sessionToken = await issueSessionToken();
  if (!sessionToken) return NextResponse.json({ error: "Não foi possível criar a sessão." }, { status: 500 });

  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.delete('artx_member');
  response.cookies.set(AUTH_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  if (process.env.NODE_ENV === "production") {
    response.cookies.set(PARTITIONED_AUTH_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      partitioned: true,
      path: "/",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
  }
  return response;
}
