import { NextResponse } from "next/server";
import { requireSession } from "@/lib/require-session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let ownerId: string;
  try { ownerId = await requireSession(); } catch { return NextResponse.json({ error: "Sessão expirada. Entre pelo Hub." }, { status: 401 }); }
  const [videos, revisions] = await Promise.all([
    prisma.video.findMany({ where: { ownerId }, include: { scriptBlocks: { orderBy: { order: "asc" } }, checklistItems: { orderBy: { order: "asc" } } }, orderBy: [{ stage: "asc" }, { order: "asc" }] }),
    prisma.$queryRaw<Array<{ video_id: string; action: string; snapshot: unknown; created_at: Date }>>`select r.video_id, r.action, r.snapshot, r.created_at from public.video_revisions r join public."Video" v on v.id = r.video_id where v."ownerId" = ${ownerId} order by r.created_at desc limit 1000`,
  ]);
  return NextResponse.json({ version: 1, exportedAt: new Date().toISOString(), videos, revisions }, {
    headers: { "Cache-Control": "no-store", "Content-Disposition": `attachment; filename="kauaartx-videos-${new Date().toISOString().slice(0, 10)}.json"` },
  });
}
