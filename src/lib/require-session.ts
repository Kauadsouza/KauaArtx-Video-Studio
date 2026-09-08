import "server-only";
import { cookies } from "next/headers";
import { AUTH_COOKIE, PARTITIONED_AUTH_COOKIE, verifySessionToken } from "./auth";
import { MEMBER_COOKIE, memberIdentity } from './member-auth';
import { prisma } from './prisma';

/** Validate at the data boundary too: middleware alone must never authorize writes. */
export async function requireSession() {
  const store = await cookies();
  const memberToken = store.get(MEMBER_COOKIE)?.value;
  if (memberToken) return memberIdentity(memberToken, 'videos');
  if (await verifySessionToken(store.get(AUTH_COOKIE)?.value ?? store.get(PARTITIONED_AUTH_COOKIE)?.value)) return 'owner';
  throw new Error("Sessão expirada. Entre novamente.");
}

export async function requireVideo(videoId: string) {
  const ownerId = await requireSession();
  if (!await prisma.video.findFirst({ where: { id: videoId, ownerId }, select: { id: true } })) throw new Error('Vídeo indisponível nesta conta.');
  return ownerId;
}
export async function requireBlock(blockId: string) {
  const ownerId = await requireSession();
  if (!await prisma.scriptBlock.findFirst({ where: { id: blockId, video: { ownerId } }, select: { id: true } })) throw new Error('Bloco indisponível nesta conta.');
  return ownerId;
}
export async function requireItem(itemId: string) {
  const ownerId = await requireSession();
  if (!await prisma.checklistItem.findFirst({ where: { id: itemId, video: { ownerId } }, select: { id: true } })) throw new Error('Item indisponível nesta conta.');
  return ownerId;
}
