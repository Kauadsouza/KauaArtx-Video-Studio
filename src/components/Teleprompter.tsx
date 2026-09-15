"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatSeconds } from "@/lib/stages";
import type { ScriptBlockDTO } from "@/lib/types";
import { useI18n } from "./I18n";

const FONT_STEPS = [22, 28, 36, 46, 58, 72];

/**
 * Leitura do roteiro bloco a bloco, em tela cheia, para usar na hora de gravar.
 * Um bloco por vez, com o tempo planejado daquele trecho e um cronômetro que
 * mostra se você está dentro dele.
 */
export default function Teleprompter({ blocks, title }: { blocks: ScriptBlockDTO[]; title: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  if (!blocks.length) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-teal/12 px-2.5 py-1 text-[11px] font-semibold text-teal transition hover:bg-teal/20"
      >{t(" ▶ Modo leitura ")}</button>
      {open && <TeleprompterStage blocks={blocks} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}

function TeleprompterStage({ blocks, title, onClose }: { blocks: ScriptBlockDTO[]; title: string; onClose: () => void }) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [fontStep, setFontStep] = useState(2);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const stage = useRef<HTMLDivElement>(null);

  const block = blocks[index];
  const planned = Math.max(0, block.endSeconds - block.startSeconds);
  const over = planned > 0 && elapsed > planned;

  const go = useCallback((step: number) => {
    setIndex(current => Math.min(blocks.length - 1, Math.max(0, current + step)));
  }, [blocks.length]);

  // Cada bloco tem o seu próprio tempo: trocar de bloco zera o cronômetro.
  useEffect(() => { setElapsed(0); }, [index]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setElapsed(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    stage.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { onClose(); return; }
      if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); go(1); return; }
      if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); go(-1); return; }
      if (event.key === "+" || event.key === "=") { setFontStep(s => Math.min(FONT_STEPS.length - 1, s + 1)); return; }
      if (event.key === "-") { setFontStep(s => Math.max(0, s - 1)); return; }
      if (event.key.toLowerCase() === "p") setRunning(value => !value);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage.current?.requestFullscreen();
    } catch { /* o navegador pode recusar; a leitura continua funcionando */ }
  }

  return (
    <div
      ref={stage}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={t("Modo leitura do roteiro")}
      className="fixed inset-0 z-50 flex flex-col bg-abyss/98 outline-none backdrop-blur-sm"
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-line/60 px-5 py-3">
        <span className="text-[11px] tracking-wide text-ink-faint uppercase">{t("Modo leitura")}</span>
        <strong className="min-w-0 flex-1 truncate text-sm text-ink">{title}</strong>
        <span className="rounded bg-teal/10 px-2 py-0.5 font-mono text-[11px] text-teal">
          {formatSeconds(block.startSeconds)} → {formatSeconds(block.endSeconds)}
        </span>
        <button type="button" onClick={toggleFullscreen} className="rounded border border-line px-2 py-1 text-[11px] text-ink-faint transition hover:text-ink">{t("Tela cheia")}</button>
        <button type="button" onClick={onClose} aria-label={t("Fechar modo leitura")} className="rounded border border-line px-2 py-1 text-[11px] text-ink-faint transition hover:text-ink">{t("Fechar ✕")}</button>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-6 py-8 sm:px-16">
        <p
          style={{ fontSize: FONT_STEPS[fontStep], lineHeight: 1.45 }}
          className="max-w-4xl text-center font-medium whitespace-pre-wrap text-ink"
        >
          {block.content.trim() || <span className="text-ink-faint italic">{t("Este bloco ainda está sem texto.")}</span>}
        </p>
      </div>

      <footer className="border-t border-line/60 px-5 py-3">
        <div className="mb-3 flex items-center gap-1" aria-hidden="true">
          {blocks.map((item, position) => (
            <span
              key={item.id}
              className={`h-1 flex-1 rounded-full transition ${position === index ? "bg-teal" : position < index ? "bg-teal/30" : "bg-line"}`}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-ink-faint">
            {t("Bloco")} <strong className="text-ink">{index + 1}</strong> {t("de")} {blocks.length}
            {planned > 0 && (
              <>
                {" · "}
                <span className={over ? "text-amber" : "text-ink-faint"}>
                  {formatSeconds(elapsed)} / {formatSeconds(planned)}
                </span>
              </>
            )}
          </span>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setRunning(value => !value)} className="rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-faint transition hover:text-ink">
              {running ? t("Pausar") : t("Iniciar cronômetro")}
            </button>
            <button type="button" onClick={() => setFontStep(s => Math.max(0, s - 1))} disabled={fontStep === 0} aria-label={t("Diminuir texto")} className="rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-faint transition hover:text-ink disabled:opacity-30">A−</button>
            <button type="button" onClick={() => setFontStep(s => Math.min(FONT_STEPS.length - 1, s + 1))} disabled={fontStep === FONT_STEPS.length - 1} aria-label={t("Aumentar texto")} className="rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-faint transition hover:text-ink disabled:opacity-30">A+</button>
            <button type="button" onClick={() => go(-1)} disabled={index === 0} className="rounded-md border border-line px-3 py-1.5 text-xs text-ink transition disabled:opacity-30">{t("← Anterior")}</button>
            <button type="button" onClick={() => go(1)} disabled={index === blocks.length - 1} className="rounded-md bg-teal px-3 py-1.5 text-xs font-semibold text-abyss transition disabled:opacity-30">{t("Próximo →")}</button>
          </div>
        </div>

        <p className="mt-2 text-[11px] text-ink-faint">{t("Setas ou espaço passam o bloco · P inicia e pausa o cronômetro · + e − mudam o tamanho · Esc fecha")}</p>
      </footer>
    </div>
  );
}
