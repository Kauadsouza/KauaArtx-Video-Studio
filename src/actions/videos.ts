"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/require-session";
import { prisma } from "@/lib/prisma";
import {
  CHECKLIST_TEMPLATES,
  STAGES,
  BLOCK_STATUSES,
  nextStage,
  prevStage,
  type BlockStatus,
  type Stage,
} from "@/lib/stages";

/**
 * Todas as mutações do sistema vivem aqui, como Server Actions.
 * Nada de API REST separada: os componentes client chamam essas funções
 * direto e o Next cuida do transporte.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Garante que o vídeo tenha o checklist padrão daquela etapa.
 * Só cria se ainda não existir nenhum item — assim, se você editou/apagou
 * itens e voltou pra etapa depois, o sistema não ressuscita o template.
 */
async function ensureChecklistForStage(videoId: string, stage: Stage) {
  const existing = await prisma.checklistItem.count({
    where: { videoId, stage },
  });
  if (existing > 0) return;

  const template = CHECKLIST_TEMPLATES[stage] ?? [];
  if (template.length === 0) return;

  await prisma.checklistItem.createMany({
    data: template.map((text, index) => ({
      videoId,
      stage,
      text,
      order: index,
    })),
  });
}

/** Próxima posição livre no fim de uma coluna. */
async function nextOrderInStage(stage: Stage): Promise<number> {
  const last = await prisma.video.findFirst({
    where: { stage },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return last ? last.order + 1 : 0;
}

function refresh() {
  // "layout" revalida toda a árvore abaixo do layout raiz — board (/) E as
  // telas cheias (/video/[id]). Revalidar só "/" deixava o workspace exibindo
  // dados velhos depois de cada edição.
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Vídeo
// ---------------------------------------------------------------------------

export async function createVideo(title: string, description = "") {
  await requireSession();
  const clean = title.trim() || "Vídeo sem título";
  if (clean.length > 300 || description.length > 5000) throw new Error("Reduza o título ou a descrição da ideia.");
  const order = await nextOrderInStage("IDEIA");

  const video = await prisma.video.create({
    data: {
      title: clean,
      description: description.trim(),
      stage: "IDEIA",
      order,
      // Já nasce com o checklist da etapa "Ideia" preenchido.
      checklistItems: {
        create: CHECKLIST_TEMPLATES.IDEIA.map((text, index) => ({
          stage: "IDEIA" as Stage,
          text,
          order: index,
        })),
      },
    },
  });

  refresh();
  return video.id;
}

/** Campos de texto livre — todos salvos do mesmo jeito (onBlur no cliente). */
const TEXT_FIELDS = [
  "description",
  "notes",
  "thumbnailIdea",
  "hook",
  "references",
  "titleOptions",
  "finalTitle",
  "reviewNotes",
  "youtubeDescription",
  "tags",
  "videoUrl",
  "learnings",
] as const;

export type VideoTextField = (typeof TEXT_FIELDS)[number];

export async function updateVideoField(
  videoId: string,
  field: VideoTextField | "title",
  value: string,
) {
  await requireSession();
  if (typeof value !== "string" || value.length > (field === "title" ? 300 : 30000)) throw new Error("Texto acima do limite permitido.");
  // Título tem tratamento próprio: nunca pode ficar vazio.
  if (field === "title") {
    await prisma.video.update({
      where: { id: videoId },
      data: { title: value.trim() || "Vídeo sem título" },
    });
    refresh();
    return;
  }

  if (!TEXT_FIELDS.includes(field)) return;

  await prisma.video.update({
    where: { id: videoId },
    data: { [field]: value },
  });
  refresh();
}

/** Data/hora de publicação (etapa Agendado). String vazia limpa o campo. */
export async function updatePublishAt(videoId: string, value: string) {
  await requireSession();
  const parsed = value ? new Date(value) : null;
  await prisma.video.update({
    where: { id: videoId },
    data: {
      publishAt: parsed && !Number.isNaN(parsed.valueOf()) ? parsed : null,
    },
  });
  refresh();
}

export async function deleteVideo(videoId: string) {
  await requireSession();
  // ScriptBlock e ChecklistItem somem junto (onDelete: Cascade no schema).
  await prisma.video.delete({ where: { id: videoId } });
  refresh();
}

/**
 * Move o vídeo para uma etapa/posição específica. É o que o drag-and-drop chama.
 * `newOrder` é a posição desejada dentro da coluna de destino.
 */
export async function moveVideo(
  videoId: string,
  toStage: Stage,
  newOrder: number,
) {
  await requireSession();
  if (!STAGES.includes(toStage) || !Number.isSafeInteger(newOrder) || newOrder < 0) throw new Error("Etapa ou posição inválida.");
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { stage: true },
  });
  if (!video) return;

  await prisma.$transaction(async (tx) => {
    // Abre espaço na coluna de destino empurrando quem está a partir da posição.
    await tx.video.updateMany({
      where: { stage: toStage, order: { gte: newOrder }, id: { not: videoId } },
      data: { order: { increment: 1 } },
    });

    await tx.video.update({
      where: { id: videoId },
      data: { stage: toStage, order: newOrder },
    });
  });

  await ensureChecklistForStage(videoId, toStage);
  refresh();
}

/** Botão "Avançar etapa". */
export async function advanceStage(videoId: string) {
  await requireSession();
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { stage: true },
  });
  if (!video) return;

  const target = nextStage(video.stage as Stage);
  if (!target) return; // já está em POSTADO

  const order = await nextOrderInStage(target);
  await prisma.video.update({
    where: { id: videoId },
    data: { stage: target, order },
  });
  await ensureChecklistForStage(videoId, target);
  refresh();
}

/** Botão "Voltar etapa". */
export async function regressStage(videoId: string) {
  await requireSession();
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { stage: true },
  });
  if (!video) return;

  const target = prevStage(video.stage as Stage);
  if (!target) return; // já está em IDEIA

  const order = await nextOrderInStage(target);
  await prisma.video.update({
    where: { id: videoId },
    data: { stage: target, order },
  });
  await ensureChecklistForStage(videoId, target);
  refresh();
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export async function toggleChecklistItem(itemId: string, done: boolean) {
  await requireSession();
  await prisma.checklistItem.update({ where: { id: itemId }, data: { done } });
  refresh();
}

export async function addChecklistItem(
  videoId: string,
  stage: Stage,
  text: string,
) {
  await requireSession();
  const clean = text.trim();
  if (!clean) return;

  const last = await prisma.checklistItem.findFirst({
    where: { videoId, stage },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.checklistItem.create({
    data: { videoId, stage, text: clean, order: last ? last.order + 1 : 0 },
  });
  refresh();
}

export async function updateChecklistItem(itemId: string, text: string) {
  await requireSession();
  await prisma.checklistItem.update({
    where: { id: itemId },
    data: { text: text.trim() },
  });
  refresh();
}

export async function deleteChecklistItem(itemId: string) {
  await requireSession();
  await prisma.checklistItem.delete({ where: { id: itemId } });
  refresh();
}

/** Reordena um item pra cima (-1) ou pra baixo (+1) dentro da etapa. */
export async function moveChecklistItem(itemId: string, direction: -1 | 1) {
  await requireSession();
  const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
  if (!item) return;

  const neighbour = await prisma.checklistItem.findFirst({
    where: {
      videoId: item.videoId,
      stage: item.stage,
      order: direction === -1 ? { lt: item.order } : { gt: item.order },
    },
    orderBy: { order: direction === -1 ? "desc" : "asc" },
  });
  if (!neighbour) return;

  await prisma.$transaction([
    prisma.checklistItem.update({
      where: { id: item.id },
      data: { order: neighbour.order },
    }),
    prisma.checklistItem.update({
      where: { id: neighbour.id },
      data: { order: item.order },
    }),
  ]);
  refresh();
}

// ---------------------------------------------------------------------------
// Blocos de roteiro
// ---------------------------------------------------------------------------

export async function addScriptBlock(videoId: string) {
  await requireSession();
  const last = await prisma.scriptBlock.findFirst({
    where: { videoId },
    orderBy: { order: "desc" },
  });

  // Novo bloco começa onde o anterior terminou e dura 15s por padrão.
  const start = last ? last.endSeconds : 0;

  await prisma.scriptBlock.create({
    data: {
      videoId,
      startSeconds: start,
      endSeconds: start + 15,
      content: "",
      order: last ? last.order + 1 : 0,
    },
  });
  refresh();
}

export async function updateScriptBlock(
  blockId: string,
  data: { startSeconds?: number; endSeconds?: number; content?: string },
) {
  await requireSession();
  await prisma.scriptBlock.update({
    where: { id: blockId },
    data: {
      ...(data.startSeconds !== undefined
        ? { startSeconds: Math.max(0, Math.floor(data.startSeconds)) }
        : {}),
      ...(data.endSeconds !== undefined
        ? { endSeconds: Math.max(0, Math.floor(data.endSeconds)) }
        : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
    },
  });
  refresh();
}

/**
 * Muda o estado de um bloco na etapa de gravação ou de edição.
 * É o que faz "bloco 1 gravado, bloco 2 em produção" funcionar.
 */
export async function setBlockStatus(
  blockId: string,
  kind: "recording" | "editing",
  status: BlockStatus,
) {
  await requireSession();
  if (!["recording", "editing"].includes(kind) || !BLOCK_STATUSES.includes(status)) throw new Error("Status inválido.");
  await prisma.scriptBlock.update({
    where: { id: blockId },
    data:
      kind === "recording"
        ? { recordingStatus: status }
        : { editingStatus: status },
  });
  refresh();
}

/** Observações específicas de um bloco (take ruim, corte a fazer, etc.) */
export async function updateBlockNotes(blockId: string, notes: string) {
  await requireSession();
  await prisma.scriptBlock.update({
    where: { id: blockId },
    data: { blockNotes: notes },
  });
  refresh();
}

export async function deleteScriptBlock(blockId: string) {
  await requireSession();
  await prisma.scriptBlock.delete({ where: { id: blockId } });
  refresh();
}

export async function moveScriptBlock(blockId: string, direction: -1 | 1) {
  await requireSession();
  const block = await prisma.scriptBlock.findUnique({ where: { id: blockId } });
  if (!block) return;

  const neighbour = await prisma.scriptBlock.findFirst({
    where: {
      videoId: block.videoId,
      order: direction === -1 ? { lt: block.order } : { gt: block.order },
    },
    orderBy: { order: direction === -1 ? "desc" : "asc" },
  });
  if (!neighbour) return;

  await prisma.$transaction([
    prisma.scriptBlock.update({
      where: { id: block.id },
      data: { order: neighbour.order },
    }),
    prisma.scriptBlock.update({
      where: { id: neighbour.id },
      data: { order: block.order },
    }),
  ]);
  refresh();
}
