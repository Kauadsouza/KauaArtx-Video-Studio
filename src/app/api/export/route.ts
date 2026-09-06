import { NextResponse } from "next/server";
import { requireSession } from "@/lib/require-session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try { await requireSession(); } catch { return NextResponse.json({ error: "Sessão expirada. Entre pelo Hub." }, { status: 401 }); }
  const [videos, revisions] = await Promise.all([
    prisma.video.findMany({ include: { scriptBlocks: { orderBy: { order: "asc" } }, checklistItems: { orderBy: { order: "asc" } } }, orderBy: [{ stage: "asc" }, { order: "asc" }] }),
    prisma.$queryRaw<Array<{ video_id: string; action: string; snapshot: unknown; created_at: Date }>>`select video_id, action, snapshot, created_at from public.video_revisions order by created_at desc limit 1000`,
  ]);
  return NextResponse.json({ version: 1, exportedAt: new Date().toISOString(), videos, revisions }, {
    headers: { "Cache-Control": "no-store", "Content-Disposition": `attachment; filename="kauaartx-videos-${new Date().toISOString().slice(0, 10)}.json"` },
  });
}
