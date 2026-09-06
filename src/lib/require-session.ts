import "server-only";
import { cookies } from "next/headers";
import { AUTH_COOKIE, verifySessionToken } from "./auth";

/** Validate at the data boundary too: middleware alone must never authorize writes. */
export async function requireSession() {
  const store = await cookies();
  if (!await verifySessionToken(store.get(AUTH_COOKIE)?.value)) {
    throw new Error("Sessão expirada. Abra o KauaArtx Video Studio pelo Hub novamente.");
  }
}
