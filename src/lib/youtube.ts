/**
 * Leitura dos números públicos de um vídeo no YouTube (Data API v3).
 *
 * Só usa chave de API: views, likes e comentários são dados públicos.
 * CTR e retenção vivem na YouTube Analytics API e exigem OAuth do dono do
 * canal — ficam para uma segunda etapa, quando a conta for autorizada.
 */

const ID = /^[A-Za-z0-9_-]{11}$/;
const PATH_PREFIXES = ["shorts", "embed", "live", "v"];

/** Extrai o id de 11 caracteres de qualquer formato de link do YouTube. */
export function parseYouTubeId(value: string): string | null {
  const clean = value.trim();
  if (!clean) return null;
  if (ID.test(clean)) return clean;

  let url: URL;
  try {
    url = new URL(clean.startsWith("http") ? clean : `https://${clean}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return ID.test(id) ? id : null;
  }
  if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "music.youtube.com") return null;

  const fromQuery = url.searchParams.get("v") ?? "";
  if (ID.test(fromQuery)) return fromQuery;

  const [first, second] = url.pathname.split("/").filter(Boolean);
  if (first && PATH_PREFIXES.includes(first.toLowerCase()) && second && ID.test(second)) return second;
  return null;
}

export type YouTubeStats = {
  id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string | null;
};

function count(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : 0;
}

type ApiItem = {
  id?: unknown;
  snippet?: { title?: unknown; publishedAt?: unknown };
  statistics?: { viewCount?: unknown; likeCount?: unknown; commentCount?: unknown };
};

/**
 * Busca as estatísticas de até 50 ids por chamada, que é o limite da API.
 * Ids que o YouTube não devolve (vídeo removido ou privado) simplesmente não
 * aparecem no resultado — quem chama decide o que fazer com a ausência.
 */
export async function fetchYouTubeStats(ids: string[], apiKey: string, signal?: AbortSignal): Promise<YouTubeStats[]> {
  const unique = [...new Set(ids.filter(id => ID.test(id)))];
  const stats: YouTubeStats[] = [];

  for (let start = 0; start < unique.length; start += 50) {
    const batch = unique.slice(start, start + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,statistics");
    url.searchParams.set("id", batch.join(","));
    url.searchParams.set("key", apiKey);

    const response = await fetch(url, { cache: "no-store", signal });
    if (!response.ok) throw new Error(response.status === 403 ? "quota_or_key" : "youtube_unavailable");

    const data = await response.json() as { items?: ApiItem[] };
    for (const item of data.items ?? []) {
      if (typeof item.id !== "string" || !ID.test(item.id)) continue;
      const publishedAt = typeof item.snippet?.publishedAt === "string" ? item.snippet.publishedAt : null;
      stats.push({
        id: item.id,
        title: typeof item.snippet?.title === "string" ? item.snippet.title.slice(0, 300) : "",
        views: count(item.statistics?.viewCount),
        likes: count(item.statistics?.likeCount),
        comments: count(item.statistics?.commentCount),
        publishedAt: publishedAt && Number.isFinite(Date.parse(publishedAt)) ? publishedAt : null,
      });
    }
  }

  return stats;
}
