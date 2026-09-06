import { requireSession } from "@/lib/require-session";
import { prisma } from "@/lib/prisma";
import type { BlockStatus, Stage } from "@/lib/stages";
import type { VideoDTO } from "@/lib/types";

/**
 * Leitura dos vídeos do banco → DTO serializável.
 *
 * Datas viram string porque o payload atravessa a fronteira server → client,
 * e objetos Date não sobrevivem à serialização do React.
 */

const include = {
  scriptBlocks: { orderBy: { order: "asc" } },
  checklistItems: { orderBy: { order: "asc" } },
} as const;

type Row = Awaited<
  ReturnType<typeof prisma.video.findFirstOrThrow<{ include: typeof include }>>
>;

function toDTO(v: Row): VideoDTO {
  return {
    id: v.id,
    title: v.title,
    description: v.description,
    stage: v.stage as Stage,
    order: v.order,
    notes: v.notes,
    thumbnailIdea: v.thumbnailIdea,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),

    hook: v.hook,
    references: v.references,
    titleOptions: v.titleOptions,
    finalTitle: v.finalTitle,
    reviewNotes: v.reviewNotes,
    publishAt: v.publishAt ? v.publishAt.toISOString() : null,
    youtubeDescription: v.youtubeDescription,
    tags: v.tags,
    videoUrl: v.videoUrl,
    learnings: v.learnings,

    scriptBlocks: v.scriptBlocks.map((b) => ({
      id: b.id,
      startSeconds: b.startSeconds,
      endSeconds: b.endSeconds,
      content: b.content,
      order: b.order,
      recordingStatus: b.recordingStatus as BlockStatus,
      editingStatus: b.editingStatus as BlockStatus,
      blockNotes: b.blockNotes,
    })),

    checklistItems: v.checklistItems.map((c) => ({
      id: c.id,
      stage: c.stage as Stage,
      text: c.text,
      done: c.done,
      order: c.order,
    })),
  };
}

export async function loadVideos(): Promise<VideoDTO[]> {
  await requireSession();
  const videos = await prisma.video.findMany({
    orderBy: [{ stage: "asc" }, { order: "asc" }],
    include,
  });
  return videos.map(toDTO);
}

export async function loadVideo(id: string): Promise<VideoDTO | null> {
  await requireSession();
  const video = await prisma.video.findUnique({ where: { id }, include });
  return video ? toDTO(video) : null;
}
