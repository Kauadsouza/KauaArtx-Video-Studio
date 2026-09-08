import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, PARTITIONED_AUTH_COOKIE, isAuthConfigured, verifySessionToken } from "@/lib/auth";

/**
 * O KauaArtx Video Studio é aberto pelo ARTX Hub. A rota /embed recebe uma sessão
 * Supabase já validada pelo Hub e cria uma sessão curta para este domínio.
 * Assim não existe uma segunda senha e a URL direta não fica aberta ao público.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isEmbedBridge = pathname === "/embed";
  const isHubAuthEndpoint = pathname === "/api/auth/hub";
  const isPublicAsset = pathname === "/icon.svg" || pathname === "/manifest.webmanifest";
  const isPublicPath = isEmbedBridge || isHubAuthEndpoint || isPublicAsset || pathname === '/api/members' || pathname === '/login';

  if (!isAuthConfigured()) {
    if (isPublicPath) return NextResponse.next();
    return NextResponse.redirect(new URL("/embed", request.nextUrl.origin));
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value ?? request.cookies.get(PARTITIONED_AUTH_COOKIE)?.value;
  // Member identity/approval is verified again at every server data boundary.
  const authenticated = await verifySessionToken(token) || /^[a-f0-9]{64}$/.test(request.cookies.get('artx_member')?.value ?? '');

  if (!authenticated && !isPublicPath) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sessão do Hub necessária." }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/embed", request.nextUrl.origin));
    if (token) {
      response.cookies.delete(AUTH_COOKIE);
      response.cookies.delete(PARTITIONED_AUTH_COOKIE);
    }
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
