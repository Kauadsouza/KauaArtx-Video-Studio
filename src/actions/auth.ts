"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE } from "@/lib/auth";

/** Encerra somente a sessão deste sistema e volta para a ponte do Hub. */
export async function logout() {
  const store = await cookies();
  store.delete(AUTH_COOKIE);
  redirect("/embed");
}
