"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import {
  STAGE_COLORS,
  STAGE_ICONS,
  STAGE_LABELS,
  type Stage,
} from "@/lib/stages";
import type { VideoDTO } from "@/lib/types";
import VideoCard from "./VideoCard";

export default function Column({
  stage,
  videos,
  totalInStage,
  filtering,
  onOpen,
}: {
  stage: Stage;
  videos: VideoDTO[];
  totalInStage: number;
  filtering: boolean;
  onOpen: (id: string) => void;
}) {
  // A coluna inteira é uma área de drop — dá pra soltar no vazio embaixo.
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const color = STAGE_COLORS[stage];

  return (
    <section className="flex w-[300px] shrink-0 flex-col">
      {/* Cabeçalho da coluna */}
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className="text-sm">{STAGE_ICONS[stage]}</span>
        <h2 className="text-sm font-semibold tracking-tight text-ink">
          {STAGE_LABELS[stage]}
        </h2>
        <span
          className="ml-auto rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums"
          style={{ background: `${color}1A`, color }}
          title={
            filtering
              ? `${videos.length} exibidos de ${totalInStage} na etapa`
              : `${totalInStage} vídeos nesta etapa`
          }
        >
          {filtering ? `${videos.length}/${totalInStage}` : totalInStage}
        </span>
      </div>

      {/* Fio colorido identificando a etapa */}
      <div
        className="mb-3 h-[3px] w-full rounded-full"
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}22)`,
        }}
      />

      {/* Lista de cards */}
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2.5 overflow-y-auto rounded-xl border border-dashed p-2 transition-colors ${
          isOver
            ? "border-teal/50 bg-teal/[0.04]"
            : "border-line-soft/70 bg-surface/25"
        }`}
      >
        <SortableContext
          items={videos.map((v) => v.id)}
          strategy={verticalListSortingStrategy}
        >
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} onOpen={onOpen} />
          ))}
        </SortableContext>

        {videos.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-8">
            <span className="text-xs text-ink-faint/70">
              {filtering ? "nenhum resultado" : "vazio"}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
