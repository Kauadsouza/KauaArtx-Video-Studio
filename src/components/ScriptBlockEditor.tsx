"use client";

import { useTransition } from "react";
import {
  addScriptBlock,
  deleteScriptBlock,
  moveScriptBlock,
  updateScriptBlock,
} from "@/actions/videos";
import { formatSeconds } from "@/lib/stages";
import type { ScriptBlockDTO } from "@/lib/types";
import AiButton from "./AiButton";
import { useI18n } from "./I18n";

/**
 * O editor de roteiro "mastigado": o vídeo vira uma lista de blocos de tempo
 * ("0-15s: falo tal coisa"), na ordem em que serão gravados.
 */
export default function ScriptBlockEditor({
  videoId,
  blocks,
  videoTitle,
}: {
  videoId: string;
  blocks: ScriptBlockDTO[];
  videoTitle: string;
}) {
  const { t } = useI18n();
  const [, startTransition] = useTransition();
  const totalSeconds = blocks.reduce(
    (max, b) => Math.max(max, b.endSeconds),
    0,
  );

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-ink">{t("Roteiro em blocos")}</h3>
        {blocks.length > 0 && (
          <span className="rounded-md bg-canvas px-1.5 py-0.5 text-[11px] text-ink-faint ring-1 ring-line-soft">
            {t(blocks.length)} {blocks.length === 1 ? t("bloco") : t("blocos")} · ~
            {formatSeconds(totalSeconds)}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <AiButton
            field="script"
            context={{ videoId, title: videoTitle, blocks }}
          />
          <button
            onClick={() => startTransition(() => addScriptBlock(videoId))}
            className="rounded-md bg-teal/12 px-2.5 py-1 text-[11px] font-semibold text-teal transition hover:bg-teal/20"
          >{t(" + adicionar bloco ")}</button>
        </div>
      </div>

      {blocks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-soft px-3 py-6 text-center text-xs text-ink-faint">{t(" Nenhum bloco ainda. Quebre o vídeo em pedaços de tempo — comece pelo gancho de 0 a 15s. ")}</p>
      ) : (
        <ul className="space-y-2">
          {blocks.map((block, index) => (
            <li
              key={block.id}
              className="rounded-lg border border-line bg-canvas/60 p-2.5"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-[11px] text-ink-faint">
                  #{index + 1}
                </span>

                <div className="flex items-center gap-1 font-mono text-xs">
                  <input
                    type="number"
                    min={0}
                    defaultValue={block.startSeconds}
                    onBlur={(e) =>
                      startTransition(() =>
                        updateScriptBlock(block.id, {
                          startSeconds: Number(e.target.value),
                        }),
                      )
                    }
                    className="w-14 rounded border border-line bg-surface px-1.5 py-0.5 text-center outline-none focus:border-teal/50"
                  />
                  <span className="text-ink-faint">–</span>
                  <input
                    type="number"
                    min={0}
                    defaultValue={block.endSeconds}
                    onBlur={(e) =>
                      startTransition(() =>
                        updateScriptBlock(block.id, {
                          endSeconds: Number(e.target.value),
                        }),
                      )
                    }
                    className="w-14 rounded border border-line bg-surface px-1.5 py-0.5 text-center outline-none focus:border-teal/50"
                  />
                  <span className="text-ink-faint">s</span>
                </div>

                <span className="rounded bg-teal/10 px-1.5 py-0.5 font-mono text-[10px] text-teal">
                  {formatSeconds(block.startSeconds)} →{" "}
                  {formatSeconds(block.endSeconds)}
                </span>

                <div className="ml-auto flex items-center gap-0.5">
                  <IconBtn
                    label={t("Mover para cima")}
                    disabled={index === 0}
                    onClick={() =>
                      startTransition(() => moveScriptBlock(block.id, -1))
                    }
                  >
                    ↑
                  </IconBtn>
                  <IconBtn
                    label={t("Mover para baixo")}
                    disabled={index === blocks.length - 1}
                    onClick={() =>
                      startTransition(() => moveScriptBlock(block.id, 1))
                    }
                  >
                    ↓
                  </IconBtn>
                  <IconBtn
                    label="Remover bloco"
                    danger
                    onClick={() =>
                      startTransition(() => deleteScriptBlock(block.id))
                    }
                  >
                    ×
                  </IconBtn>
                </div>
              </div>

              <textarea
                defaultValue={block.content}
                rows={2}
                placeholder="O que falo / mostro nesse trecho…"
                onBlur={(e) =>
                  startTransition(() =>
                    updateScriptBlock(block.id, { content: e.target.value }),
                  )
                }
                className="w-full resize-y rounded border border-line bg-surface px-2.5 py-2 text-sm leading-relaxed outline-none focus:border-teal/50"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={t(label)}
      aria-label={t(label)}
      className={`flex h-6 w-6 items-center justify-center rounded text-xs transition disabled:opacity-25 ${
        danger
          ? "text-ink-faint hover:bg-rose/12 hover:text-rose"
          : "text-ink-faint hover:bg-surface-2 hover:text-ink"
      }`}
    >
      {t(children)}
    </button>
  );
}
