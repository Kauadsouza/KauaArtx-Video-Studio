"use client";

import {
  STAGES,
  STAGE_COLORS,
  STAGE_ICONS,
  STAGE_LABELS,
  type Stage,
} from "@/lib/stages";
import { useI18n } from "./I18n";

/**
 * Faixa de contagem por etapa, logo abaixo do cabeçalho.
 * Dá o panorama do pipeline sem precisar contar card na mão.
 */
export default function Dashboard({
  counts,
  total,
}: {
  counts: Record<Stage, number>;
  total: number;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-t border-line/50 px-6 py-2.5">
      <span className="mr-2 shrink-0 text-[11px] tracking-wide text-ink-faint uppercase">
        {t(total)} {total === 1 ? t("vídeo") : t("vídeos")}
      </span>

      {STAGES.map((stage) => {
        const n = counts[stage];
        const color = STAGE_COLORS[stage];
        return (
          <div
            key={stage}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition ${
              n > 0
                ? "border-line bg-surface"
                : "border-line-soft/50 bg-transparent opacity-45"
            }`}
            title={`${n} em ${STAGE_LABELS[stage]}`}
          >
            <span className="text-[11px]">{t(STAGE_ICONS[stage])}</span>
            <span className="text-ink-dim">{t(STAGE_LABELS[stage])}</span>
            <span
              className="font-semibold tabular-nums"
              style={{ color: n > 0 ? color : undefined }}
            >
              {t(n)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
