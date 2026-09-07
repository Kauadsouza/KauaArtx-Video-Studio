"use client";

import { useState, useTransition } from "react";
import { setBlockStatus, updateBlockNotes } from "@/actions/videos";
import {
  BLOCK_STATUSES,
  BLOCK_STATUS_COLORS,
  BLOCK_STATUS_LABELS,
  formatSeconds,
} from "@/lib/stages";
import type { ScriptBlockDTO } from "@/lib/types";
import { useI18n } from "../I18n";

/**
 * Os blocos do roteiro vistos como lista de tarefas — usado tanto na etapa de
 * GRAVAÇÃO ("bloco 1 gravado, bloco 2 em produção") quanto na de EDIÇÃO
 * ("editar 0:00–0:15"). É o mesmo bloco, só muda qual status está sendo mexido.
 */
export default function BlockStatusPanel({
  blocks,
  kind,
}: {
  blocks: ScriptBlockDTO[];
  kind: "recording" | "editing";
}) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState("");
  function changeStatus(id: string, status: (typeof BLOCK_STATUSES)[number]) {
    start(async () => { try { await setBlockStatus(id, kind, status); setNotice(status === "EM_PROGRESSO" ? "Bloco reaberto: em produção." : "Status salvo. Você pode alterá-lo a qualquer momento."); } catch { setNotice("Não foi possível salvar. Tente novamente."); } });
  }

  if (blocks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-soft px-4 py-10 text-center">
        <p className="text-sm text-ink-dim">{t(" O roteiro ainda não foi quebrado em blocos. ")}</p>
        <p className="mt-1 text-xs text-ink-faint">{t(" Volte na etapa ")}<strong className="text-teal">{t("Roteiro")}</strong>{t(" e crie os blocos — eles aparecem aqui automaticamente. ")}</p>
      </div>
    );
  }

  const statusOf = (b: ScriptBlockDTO) =>
    kind === "recording" ? b.recordingStatus : b.editingStatus;

  return (
    <div><p className="mb-3 text-sm text-ink-dim">Marcou por engano? Reabra qualquer bloco sem perder o roteiro.</p><p role="status" className="mb-3 text-sm text-teal">{notice}</p><ul className="space-y-2">
      {blocks.map((block, index) => {
        const status = statusOf(block);
        const color = BLOCK_STATUS_COLORS[status];

        return (
          <li
            key={block.id}
            className="rounded-xl border border-line bg-surface p-3.5 transition"
            style={
              status === "PRONTO"
                ? { borderColor: `${color}55`, background: `${color}0A` }
                : undefined
            }
          >
            <div className="flex flex-wrap items-start gap-3">
              {/* Identificação do bloco */}
              <div className="w-28 shrink-0">
                <div className="font-mono text-[11px] text-ink-faint">{t(" bloco ")}{index + 1}
                </div>
                <div
                  className="font-mono text-xs font-semibold"
                  style={{ color }}
                >
                  {formatSeconds(block.startSeconds)}–
                  {formatSeconds(block.endSeconds)}
                </div>
              </div>

              {/* Conteúdo do roteiro — só leitura aqui, edita-se na etapa Roteiro */}
              <p
                className={`flex-1 text-sm leading-relaxed ${
                  status === "PRONTO" ? "text-ink-faint" : "text-ink-dim"
                }`}
              >
                {block.content || (
                  <span className="text-ink-faint italic">{t(" (bloco sem texto) ")}</span>
                )}
              </p>

              {/* Seletor de status */}
              <div className="flex w-full flex-wrap gap-2">
                {BLOCK_STATUSES.map((s) => {
                  const active = s === status;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => changeStatus(block.id, s)}
                      disabled={pending}
                      aria-pressed={active}
                      title={t(BLOCK_STATUS_LABELS[s])}
                      className={`min-h-11 rounded-md px-3 py-2 text-sm font-medium transition ${
                        active
                          ? "text-abyss"
                          : "text-ink-faint hover:text-ink"
                      }`}
                      style={
                        active
                          ? { background: BLOCK_STATUS_COLORS[s] }
                          : { background: "var(--color-canvas)" }
                      }
                    >
                      {t(BLOCK_STATUS_LABELS[s])}
                    </button>
                  );
                })}
                {status === "PRONTO" && <button className="min-h-11 rounded-lg border border-line px-3 text-sm text-teal" disabled={pending} onClick={() => changeStatus(block.id, "EM_PROGRESSO")}>↶ Voltar para em produção</button>}
              </div>
            </div>

            {/* Observações do bloco */}
            <input
              defaultValue={block.blockNotes}
              placeholder={
                kind === "recording"
                  ? t("obs. da gravação: take, luz, áudio…")
                  : t("obs. da edição: corte, trilha, legenda…")
              }
              onBlur={(e) => {
                if (e.target.value === block.blockNotes) return;
                const value = e.target.value;
                start(async () => { try { await updateBlockNotes(block.id, value); setNotice("Observação salva."); } catch { setNotice("Observação não salva. Tente novamente."); } });
              }}
              className="mt-2.5 w-full rounded-lg border border-line-soft bg-canvas px-3 py-1.5 text-xs outline-none transition focus:border-teal/40"
            />
          </li>
        );
      })}
    </ul></div>
  );
}
