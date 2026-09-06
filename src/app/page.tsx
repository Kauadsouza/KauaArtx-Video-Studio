import { loadVideos } from "@/lib/queries";
import type { VideoDTO } from "@/lib/types";
import Board from "@/components/Board";
import SetupNotice from "@/components/SetupNotice";

// Board sempre fresco: nada de cache estático aqui.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  let videos: VideoDTO[];

  try {
    videos = await loadVideos();
  } catch (error) {
    // Banco fora do ar / projeto pausado: em vez de estourar uma stack trace,
    // mostra o passo a passo pra resolver.
    return <SetupNotice message={(error as Error).message} />;
  }

  return <Board initialVideos={videos} />;
}
