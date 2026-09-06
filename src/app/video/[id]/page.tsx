import { notFound } from "next/navigation";
import { loadVideo } from "@/lib/queries";
import type { VideoDTO } from "@/lib/types";
import SetupNotice from "@/components/SetupNotice";
import VideoWorkspace from "@/components/workspace/VideoWorkspace";

export const dynamic = "force-dynamic";

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let video: VideoDTO | null;

  // Só a leitura fica no try. notFound() lança um erro de controle interno do
  // Next — se ficasse aqui dentro, o catch o engoliria e a página mostraria
  // "banco desconectado" quando na verdade o vídeo é que não existe.
  try {
    video = await loadVideo(id);
  } catch (error) {
    return <SetupNotice message={(error as Error).message} />;
  }

  if (!video) notFound();

  return <VideoWorkspace video={video} />;
}
