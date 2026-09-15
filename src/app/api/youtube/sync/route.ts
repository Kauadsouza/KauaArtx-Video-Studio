import { NextResponse } from "next/server";
import { requireSession } from "@/lib/require-session";
import { prisma } from "@/lib/prisma";
import { fetchYouTubeStats, parseYouTubeId } from "@/lib/youtube";

/**
 * Lê no YouTube os números dos vídeos que já têm link e guarda no banco,
 * fechando o ciclo entre o que você escolheu (título, thumb, gancho) e o
 * que aconteceu depois da publicação.
 */
export async function POST() {
  let ownerId: string;
  try { ownerId = await requireSession(); } catch { return NextResponse.json({ error: "Sessão expirada. Entre pelo Hub." }, { status: 401 }); }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "not_configured", message: "Adicione YOUTUBE_API_KEY nas variáveis do projeto para ler os números do YouTube." }, { status: 503 });
  }

  const videos = await prisma.video.findMany({
    where: { ownerId, NOT: { videoUrl: "" } },
    select: { id: true, videoUrl: true },
  });

  const byId = new Map<string, string[]>();
  let semLink = 0;
  for (const video of videos) {
    const youtubeId = parseYouTubeId(video.videoUrl);
    if (!youtubeId) { semLink += 1; continue; }
    byId.set(youtubeId, [...(byId.get(youtubeId) ?? []), video.id]);
  }
  if (!byId.size) {
    return NextResponse.json({ atualizados: 0, semLink, naoEncontrados: 0, lidoEm: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  }

  let stats;
  try {
    stats = await fetchYouTubeStats([...byId.keys()], apiKey, AbortSignal.timeout(20_000));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "quota_or_key") return NextResponse.json({ error: "O YouTube recusou a chave: confira se ela é válida e se a cota do dia não acabou." }, { status: 502 });
    return NextResponse.json({ error: "Não foi possível falar com o YouTube agora. Tente de novo em alguns minutos." }, { status: 503 });
  }

  const lidoEm = new Date();
  let atualizados = 0;
  for (const item of stats) {
    const alvos = byId.get(item.id) ?? [];
    for (const videoId of alvos) {
      await prisma.video.update({
        where: { id: videoId },
        data: {
          youtubeId: item.id,
          views: item.views,
          likes: item.likes,
          comments: item.comments,
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
          metricsAt: lidoEm,
        },
      });
      atualizados += 1;
    }
  }

  const encontrados = new Set(stats.map(item => item.id));
  const naoEncontrados = [...byId.keys()].filter(id => !encontrados.has(id)).length;

  return NextResponse.json(
    { atualizados, semLink, naoEncontrados, lidoEm: lidoEm.toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
