import type { BlockStatus, Stage } from "@/lib/stages";

/**
 * Formato dos dados que o servidor entrega pro board.
 * Como é single-user com poucos vídeos, carregamos tudo de uma vez
 * (vídeo + roteiro + checklist) e o client só chama Server Actions pra mutar.
 */

export type ScriptBlockDTO = {
  id: string;
  startSeconds: number;
  endSeconds: number;
  content: string;
  order: number;
  recordingStatus: BlockStatus;
  editingStatus: BlockStatus;
  blockNotes: string;
};

export type ChecklistItemDTO = {
  id: string;
  stage: Stage;
  text: string;
  done: boolean;
  order: number;
};

export type VideoDTO = {
  id: string;
  title: string;
  description: string;
  stage: Stage;
  order: number;
  notes: string;
  thumbnailIdea: string;
  createdAt: string;
  updatedAt: string;

  hook: string;
  references: string;
  titleOptions: string;
  finalTitle: string;
  reviewNotes: string;
  publishAt: string | null;
  youtubeDescription: string;
  tags: string;
  videoUrl: string;
  learnings: string;

  scriptBlocks: ScriptBlockDTO[];
  checklistItems: ChecklistItemDTO[];
};

/** Quantos blocos já estão prontos numa etapa que trabalha por bloco. */
export function blockProgress(
  video: VideoDTO,
  kind: "recording" | "editing",
): { done: number; total: number } {
  const total = video.scriptBlocks.length;
  const done = video.scriptBlocks.filter(
    (b) =>
      (kind === "recording" ? b.recordingStatus : b.editingStatus) === "PRONTO",
  ).length;
  return { done, total };
}

/** Progresso do checklist da etapa ATUAL do vídeo (é o que a barrinha mostra). */
export function stageProgress(video: VideoDTO): {
  done: number;
  total: number;
  percent: number;
} {
  const items = video.checklistItems.filter((i) => i.stage === video.stage);
  const done = items.filter((i) => i.done).length;
  const total = items.length;
  return { done, total, percent: total === 0 ? 0 : (done / total) * 100 };
}
