"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VideoDTO } from "@/lib/types";
import { useI18n } from "./I18n";

type SyncResult = { atualizados: number; semLink: number; naoEncontrados: number; lidoEm: string };

function useNumberFormat() {
  const { locale } = useI18n();
  return (value: number) => new Intl.NumberFormat(locale, { notation: value >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

/** Lê de novo os números do YouTube e recarrega os dados da página. */
export function SyncYouTubeButton({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function sync() {
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/youtube/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setStatus("error");
        setMessage(data?.message ?? data?.error ?? t("Não foi possível atualizar agora."));
        return;
      }
      const result = data as SyncResult;
      setStatus("done");
      setMessage(
        result.atualizados
          ? `${result.atualizados} ${result.atualizados === 1 ? t("vídeo atualizado") : t("vídeos atualizados")}.`
          : t("Nenhum vídeo com link do YouTube para atualizar."),
      );
      router.refresh();
    } catch {
      setStatus("error");
      setMessage(t("Não foi possível falar com o servidor."));
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={sync}
        disabled={status === "loading"}
        className={`rounded-md border border-line bg-canvas font-medium text-ink-faint transition hover:border-teal/40 hover:text-teal disabled:opacity-50 ${compact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs"}`}
      >
        {status === "loading" ? t("Lendo o YouTube…") : t("Atualizar números")}
      </button>
      {message && (
        <small role="status" className={status === "error" ? "text-amber" : "text-ink-faint"}>{message}</small>
      )}
    </span>
  );
}

/** Números de um vídeo já publicado. */
export function VideoNumbers({ video }: { video: VideoDTO }) {
  const { t, locale } = useI18n();
  const format = useNumberFormat();
  const hasNumbers = video.views !== null;

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] tracking-wide text-ink-faint uppercase">{t("Desempenho no YouTube")}</span>
        <SyncYouTubeButton compact />
      </div>

      {hasNumbers ? (
        <>
          <div className="flex flex-wrap gap-6">
            {[
              [t("visualizações"), video.views],
              [t("curtidas"), video.likes],
              [t("comentários"), video.comments],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <strong className="block text-2xl font-medium text-ink">{format(Number(value ?? 0))}</strong>
                <span className="text-[11px] text-ink-faint">{String(label)}</span>
              </div>
            ))}
          </div>
          <small className="block text-ink-faint">
            {video.metricsAt
              ? `${t("Lido em")} ${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date(video.metricsAt))}`
              : ""}
            {video.publishedAt ? ` · ${t("publicado em")} ${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" }).format(new Date(video.publishedAt))}` : ""}
          </small>
        </>
      ) : (
        <p className="text-sm text-ink-faint">
          {video.videoUrl
            ? t("Ainda sem números. Toque em atualizar para ler o YouTube.")
            : t("Cole o link do vídeo acima para acompanhar visualizações, curtidas e comentários.")}
        </p>
      )}
    </div>
  );
}

/**
 * O ciclo fechado: publicados do mais visto ao menos visto, junto com o
 * título, o gancho e a thumbnail que você escolheu para cada um.
 */
export function PerformancePanel({ videos, onOpen }: { videos: VideoDTO[]; onOpen: (id: string) => void }) {
  const { t } = useI18n();
  const format = useNumberFormat();
  const [open, setOpen] = useState<string | null>(null);

  const published = videos.filter(video => video.stage === "POSTADO");
  const measured = published.filter(video => video.views !== null).sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  const media = measured.length ? Math.round(measured.reduce((total, video) => total + (video.views ?? 0), 0) / measured.length) : 0;

  return (
    <section className="studio-panel">
      <span className="studio-kicker">{t("O QUE FUNCIONOU")}</span>
      <h2>{t("Do mais visto ao menos visto")}</h2>
      <p className="studio-muted">{t("Os números vêm da API pública do YouTube. Use para comparar decisões, não para se cobrar.")}</p>
      <SyncYouTubeButton />

      {!published.length && <p className="studio-muted">{t("Quando um vídeo chegar em POSTADO com o link preenchido, ele aparece aqui.")}</p>}

      {published.length > 0 && !measured.length && (
        <p className="studio-muted">{t("Você tem vídeos publicados, mas ainda sem números lidos. Toque em atualizar.")}</p>
      )}

      {measured.length > 0 && (
        <>
          <div className="studio-stats">
            <div><strong>{format(measured[0].views ?? 0)}</strong><span>{t("melhor resultado")}</span></div>
            <div><strong>{format(media)}</strong><span>{t("média por vídeo")}</span></div>
            <div><strong>{measured.length}</strong><span>{t("vídeos medidos")}</span></div>
          </div>

          <ol className="mt-4 space-y-2">
            {measured.map((video, index) => {
              const expanded = open === video.id;
              const title = video.finalTitle.trim() || video.title;
              return (
                <li key={video.id} className="rounded-xl border border-line bg-surface">
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : video.id)}
                    aria-expanded={expanded}
                    className="flex w-full items-center gap-3 p-3 text-left"
                  >
                    <span className="w-6 shrink-0 text-sm text-ink-faint tabular-nums">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-medium text-ink">{title}</strong>
                      <span className="text-[11px] text-ink-faint">
                        {format(video.views ?? 0)} {t("visualizações")} · {format(video.likes ?? 0)} {t("curtidas")} · {format(video.comments ?? 0)} {t("comentários")}
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-ink-faint">{expanded ? "−" : "+"}</span>
                  </button>

                  {expanded && (
                    <div className="space-y-3 border-t border-line/60 p-3 text-sm">
                      <div>
                        <span className="text-[11px] tracking-wide text-ink-faint uppercase">{t("Gancho escolhido")}</span>
                        <p className="whitespace-pre-wrap text-ink">{video.hook.trim() || t("não registrado")}</p>
                      </div>
                      <div>
                        <span className="text-[11px] tracking-wide text-ink-faint uppercase">{t("Ideia de thumbnail")}</span>
                        <p className="whitespace-pre-wrap text-ink">{video.thumbnailIdea.trim() || t("não registrada")}</p>
                      </div>
                      {video.learnings.trim() && (
                        <div>
                          <span className="text-[11px] tracking-wide text-ink-faint uppercase">{t("Aprendizados")}</span>
                          <p className="whitespace-pre-wrap text-ink">{video.learnings}</p>
                        </div>
                      )}
                      <button type="button" onClick={() => onOpen(video.id)} className="rounded-md border border-line px-2 py-1 text-xs text-ink-faint transition hover:border-teal/40 hover:text-teal">
                        {t("Abrir o vídeo")}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
