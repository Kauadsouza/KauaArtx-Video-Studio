"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  advanceStage,
  moveVideo,
  deleteVideo,
  regressStage,
  updateVideoField,
} from "@/actions/videos";
import {
  STAGES,
  STAGE_COLORS,
  STAGE_HINTS,
  STAGE_ICONS,
  STAGE_LABELS,
  nextStage,
  prevStage,
  type Stage,
} from "@/lib/stages";
import { stageProgress, type VideoDTO } from "@/lib/types";
import ChecklistEditor from "@/components/ChecklistEditor";
import StagePanel from "./StagePanels";
import { useI18n, LanguageSwitch } from "../I18n";
import { StageArt } from "../StageArt";

/**
 * Tela cheia de um vídeo.
 *
 * A etapa ATUAL do vídeo (video.stage) é onde ele está no fluxo. Mas dá pra
 * *olhar* qualquer etapa sem mover o vídeo — por isso `viewing` é separado de
 * `video.stage`. Só os botões Avançar/Voltar mudam a etapa de verdade.
 */
export default function VideoWorkspace({ video }: { video: VideoDTO }) {
  const { t } = useI18n();
  const [viewing, setViewing] = useState<Stage>(video.stage);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const color = STAGE_COLORS[viewing];
  const forward = nextStage(video.stage);
  const backward = prevStage(video.stage);

  const checklist = video.checklistItems
    .filter((i) => i.stage === viewing)
    .sort((a, b) => a.order - b.order);

  const { done, total } = stageProgress(video);
  const isCurrent = viewing === video.stage;

  return (
    <div className="flex min-h-screen flex-col video-workspace">
      {/* ---------------------------------------------------------------- */}
      {/* Cabeçalho                                                         */}
      {/* ---------------------------------------------------------------- */}
      <header className="shrink-0 border-b border-line/70 bg-abyss/50 backdrop-blur">
        <div className="flex items-center gap-4 px-6 py-3.5">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-dim transition hover:border-teal/40 hover:text-ink"
          >
            ← Board
          </Link>

          <input
            aria-label={t("Título do vídeo")}
            maxLength={300}
            defaultValue={video.title}
            onBlur={(e) => {
              if (e.target.value === video.title) return;
              const title = e.target.value;
              start(async () => { try { await updateVideoField(video.id, "title", title); setError(""); } catch { setError("O título não foi salvo. Confira a conexão e tente novamente antes de sair."); } });
            }}
            className="min-w-0 flex-1 bg-transparent text-lg font-semibold tracking-tight text-ink outline-none focus:text-teal"
          />

          <span
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{ background: `${STAGE_COLORS[video.stage]}1A`, color: STAGE_COLORS[video.stage] }}
            title={t("Etapa atual do vídeo")}
          >
            <LanguageSwitch /> {t(STAGE_ICONS[video.stage])} {t(STAGE_LABELS[video.stage])}
            <span className="opacity-70">
              · {t(done)}/{t(total)}
            </span>
          </span>
        </div>

        {/* Navegação entre etapas */}
        <nav className="flex gap-1 overflow-x-auto px-6 pb-2.5">
          {STAGES.map((s) => {
            const atual = s === video.stage;
            const vendo = s === viewing;
            const passou = STAGES.indexOf(s) < STAGES.indexOf(video.stage);

            return (
              <button
                key={s}
                onClick={() => setViewing(s)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
                  vendo
                    ? "border-transparent font-semibold text-abyss"
                    : "border-line text-ink-dim hover:text-ink"
                }`}
                style={
                  vendo
                    ? { background: STAGE_COLORS[s] }
                    : passou
                      ? { opacity: 0.75 }
                      : { opacity: 0.5 }
                }
                title={atual ? t("Etapa atual do vídeo") : t(STAGE_LABELS[s])}
              >
                <span>{t(STAGE_ICONS[s])}</span>
                {t(STAGE_LABELS[s])}
                {atual && !vendo && (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: STAGE_COLORS[s] }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </header>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-3"><label className="text-sm text-ink-dim" htmlFor="production-stage">Mover vídeo para</label><select id="production-stage" className="min-h-11 rounded-lg border border-line bg-surface px-3 text-sm" value={video.stage} disabled={pending} onChange={event => { const target = event.target.value as Stage; start(async () => { try { await moveVideo(video.id, target, 0); setViewing(target); setError(""); } catch { setError("Não foi possível mover o vídeo. A etapa anterior foi mantida."); } }); }}>{STAGES.map(stage => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}</select><small className="text-ink-faint">Pode voltar sem apagar roteiro, notas ou checklists.</small></div>
      {error && <p className="studio-error" role="alert">{t(error)}</p>}

      {/* ---------------------------------------------------------------- */}
      {/* Corpo: painel da etapa + checklist lateral                        */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="min-w-0 flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 studio-stage-heading">
              <StageArt stage={viewing} />
              <h2
                className="flex items-center gap-2 text-base font-semibold"
                style={{ color }}
              >
                {t(STAGE_ICONS[viewing])} {t(STAGE_LABELS[viewing])}
                {!isCurrent && (
                  <span className="rounded-md bg-canvas px-2 py-0.5 text-[11px] font-normal text-ink-faint ring-1 ring-line-soft">{t(" apenas visualizando — o vídeo está em")}{" "}
                    {t(STAGE_LABELS[video.stage])}
                  </span>
                )}
              </h2>
              <p className="mt-1 text-sm text-ink-faint">
                {t(STAGE_HINTS[viewing])}
              </p>
            </div>

            <StagePanel stage={viewing} video={video} />
          </div>
        </main>

        {/* Checklist da etapa que está sendo vista */}
        <aside className="w-full lg:w-80 shrink-0 overflow-y-auto border-t lg:border-l border-line/70 bg-surface/30 px-5 py-6">
          <ChecklistEditor
            videoId={video.id}
            stage={viewing}
            items={checklist}
          />
        </aside>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Rodapé: mover o vídeo entre etapas                                */}
      {/* ---------------------------------------------------------------- */}
      <footer className="flex flex-wrap shrink-0 items-center gap-2 border-t border-line bg-surface-2/40 px-4 py-3.5">
        <DeleteButton videoId={video.id} title={t(video.title)} />

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() =>
              start(async () => {
                try { await regressStage(video.id); if (backward) setViewing(backward); setError(""); }
                catch { setError("Não foi possível voltar a etapa. Tente novamente."); }
              })
            }
            disabled={!backward || pending}
            className="rounded-lg border border-line px-3.5 py-2 text-sm text-ink-dim transition hover:text-ink disabled:opacity-35"
          >{t(" ← Voltar etapa ")}</button>

          <button
            onClick={() =>
              start(async () => {
                try { await advanceStage(video.id); if (forward) setViewing(forward); setError(""); }
                catch { setError("Não foi possível avançar a etapa. Tente novamente."); }
              })
            }
            disabled={!forward || pending}
            className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-abyss transition hover:bg-teal/90 disabled:opacity-35"
          >
            {forward ? `Avançar para ${STAGE_LABELS[forward]} →` : "Postado 🎉"}
          </button>
        </div>
      </footer>
    </div>
  );
}

function DeleteButton({ videoId, title }: { videoId: string; title: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      onClick={() => {
        if (!window.confirm(`Excluir "${title}"? Isso não tem volta.`)) return;
        start(async () => {
          await deleteVideo(videoId);
          // Sem isso a página ficaria apontando pra um vídeo que não existe mais.
          router.push("/");
        });
      }}
      disabled={pending}
      className="rounded-lg px-2.5 py-2 text-xs text-ink-faint transition hover:bg-rose/10 hover:text-rose disabled:opacity-50"
    >{t(" Excluir vídeo ")}</button>
  );
}
