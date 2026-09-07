"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { STAGE_COLORS } from "@/lib/stages";
import { blockProgress, stageProgress, type VideoDTO } from "@/lib/types";
import { useI18n } from "./I18n";

export default function VideoCard({
  video,
  onOpen,
  overlay = false,
}: {
  video: VideoDTO;
  onOpen: (id: string) => void;
  /** true quando renderizado dentro do DragOverlay (o "fantasma" do arrasto). */
  overlay?: boolean;
}) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: video.id, disabled: overlay });

  const { done, total, percent } = stageProgress(video);
  const color = STAGE_COLORS[video.stage];
  const blocks = video.scriptBlocks.length;

  // Em Gravação e Edição o que importa é quantos blocos já saíram.
  const blocksBadge = (() => {
    if (blocks === 0) return null;
    if (video.stage === "GRAVACAO") {
      const p = blockProgress(video, "recording");
      return {
        label: `🎥 ${p.done}/${p.total} gravados`,
        title: `${p.done} de ${p.total} blocos gravados`,
      };
    }
    if (video.stage === "EDICAO") {
      const p = blockProgress(video, "editing");
      return {
        label: `✂️ ${p.done}/${p.total} editados`,
        title: `${p.done} de ${p.total} trechos editados`,
      };
    }
    return null;
  })();

  return (
    <article
      ref={overlay ? undefined : setNodeRef}
      style={
        overlay
          ? undefined
          : { transform: CSS.Translate.toString(transform), transition }
      }
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onClick={() => !isDragging && onOpen(video.id)}
      className={`group cursor-grab rounded-xl border border-line bg-surface p-3 shadow-lg shadow-black/20 transition select-none hover:border-teal/40 hover:bg-surface-2 ${
        isDragging ? "opacity-30" : ""
      } ${overlay ? "cursor-grabbing border-teal/50 shadow-2xl shadow-black/50" : ""}`}
    >
      <h3 className="text-sm leading-snug font-medium text-ink">
        {t(video.title)}
      </h3>

      {video.description && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-faint">
          {t(video.description)}
        </p>
      )}

      {/* Progresso do checklist da etapa atual */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-ink-faint">
          <span>{t("checklist da etapa")}</span>
          <span className="tabular-nums">
            {t(done)}/{t(total)}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${percent}%`,
              background:
                percent === 100
                  ? "linear-gradient(90deg,#4ADE80,#22C55E)"
                  : `linear-gradient(90deg, ${color}, ${color}99)`,
            }}
          />
        </div>
      </div>

      {/* Indicadores: roteiro, progresso da etapa por bloco, thumb, notas */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
            blocks > 0
              ? "bg-teal/12 text-teal"
              : "bg-canvas text-ink-faint/80 ring-1 ring-line-soft"
          }`}
          title={
            blocks > 0
              ? `${blocks} ${blocks === 1 ? "bloco" : "blocos"} de roteiro`
              : t("roteiro ainda não foi quebrado em blocos")
          }
        >
          {blocks > 0
            ? `📝 ${blocks} ${blocks === 1 ? "bloco" : "blocos"}`
            : t("sem roteiro")}
        </span>

        {/* Nas etapas que trabalham por bloco, mostra quantos já saíram */}
        {blocksBadge && (
          <span
            className="rounded-md bg-canvas px-1.5 py-0.5 text-[10px] font-medium text-ink-dim ring-1 ring-line-soft"
            title={t(blocksBadge.title)}
          >
            {t(blocksBadge.label)}
          </span>
        )}

        {video.thumbnailIdea && (
          <span
            className="rounded-md bg-amber/12 px-1.5 py-0.5 text-[10px] font-medium text-amber"
            title={t("tem ideia de thumbnail/título")}
          >
            🖼️
          </span>
        )}
        {video.notes && (
          <span
            className="rounded-md bg-canvas px-1.5 py-0.5 text-[10px] text-ink-faint ring-1 ring-line-soft"
            title="tem notas"
          >
            🗒️
          </span>
        )}
      </div>
    </article>
  );
}
