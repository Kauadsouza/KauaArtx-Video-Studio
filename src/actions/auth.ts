"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, PARTITIONED_AUTH_COOKIE } from "@/lib/auth";
import { MEMBER_COOKIE, digest } from '@/lib/member-auth';
import { prisma } from '@/lib/prisma';

/** Encerra somente a sessão deste sistema e volta para a ponte do Hub. */
export async function logout() {
  const store = await cookies();
  const memberToken = store.get(MEMBER_COOKIE)?.value;
  if (memberToken) await prisma.memberSession.deleteMany({ where: { digest: digest(memberToken) } });
  store.delete(AUTH_COOKIE);
  store.delete(PARTITIONED_AUTH_COOKIE);
  store.delete('artx_member');
  redirect("/embed");
}
