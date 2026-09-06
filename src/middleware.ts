import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, isAuthConfigured, verifySessionToken } from "@/lib/auth";

/**
 * O Sistema de Vídeos é aberto pelo ARTX Hub. A rota /embed recebe uma sessão
 * Supabase já validada pelo Hub e cria uma sessão curta para este domínio.
 * Assim não existe uma segunda senha e a URL direta não fica aberta ao público.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isEmbedBridge = pathname === "/embed";
  const isHubAuthEndpoint = pathname === "/api/auth/hub";
  const isPublicPath = isEmbedBridge || isHubAuthEndpoint;

  if (!isAuthConfigured()) {
    if (isPublicPath) return NextResponse.next();
    return NextResponse.redirect(new URL("/embed", request.nextUrl.origin));
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const authenticated = await verifySessionToken(token);

  if (!authenticated && !isPublicPath) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sessão do Hub necessária." }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/embed", request.nextUrl.origin));
    if (token) response.cookies.delete(AUTH_COOKIE);
    return response;
  }

  if (authenticated && isEmbedBridge) {
    return NextResponse.redirect(new URL("/", request.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
