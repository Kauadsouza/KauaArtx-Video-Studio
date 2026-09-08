/**
 * Autenticação single-user.
 *
 * Desenho:
 *   - A senha vive só em APP_PASSWORD (nunca é gravada no cookie).
 *   - Ao acertar a senha, emitimos um token de sessão assinado com HMAC-SHA256
 *     usando AUTH_SECRET: `<expiraEm>.<assinatura>`.
 *   - O cookie NÃO é derivado da senha. Se o cookie vazar, não dá pra descobrir
 *     a senha a partir dele; e o token expira sozinho.
 *   - Trocar AUTH_SECRET invalida todas as sessões de uma vez.
 *
 * Usa Web Crypto (não `node:crypto`) porque o middleware roda no Edge Runtime.
 */

export const AUTH_COOKIE = "kx_session";
/** Sessão isolada por site superior para Safari/CHIPS quando o Studio roda no Hub. */
export const PARTITIONED_AUTH_COOKIE = "kx_session_hub";

/** Duração da sessão: 7 dias. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return toHex(digest);
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return toHex(signature);
}

/** Comparação em tempo constante — não vaza informação por timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * O app está configurado pra autenticar?
 * Se faltar qualquer segredo, o sistema FECHA (ninguém entra) em vez de abrir.
 */
export function isAuthConfigured(): boolean {
  return !!process.env.AUTH_SECRET;
}

/** Confere a senha digitada. Compara hashes pra não vazar o tamanho da senha. */
export async function passwordMatches(given: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  const [a, b] = await Promise.all([sha256(given), sha256(expected)]);
  return safeEqual(a, b);
}

/** Cria um token de sessão assinado, válido por SESSION_TTL_MS. */
export async function issueSessionToken(): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const signature = await hmac(secret, String(expiresAt));
  return `${expiresAt}.${signature}`;
}

/** Valida assinatura + expiração do token vindo do cookie. */
export async function verifySessionToken(
  token: string | undefined,
): Promise<boolean> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !token) return false;

  const separator = token.indexOf(".");
  if (separator <= 0) return false;

  const expiresAt = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;

  const expected = await hmac(secret, expiresAt);
  return safeEqual(signature, expected);
}
