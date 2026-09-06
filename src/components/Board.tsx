"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

import { STAGES, STAGE_LABELS, isStage, type Stage } from "@/lib/stages";
import type { VideoDTO } from "@/lib/types";
import { createVideo, moveVideo } from "@/actions/videos";

import Column from "./Column";
import VideoCard from "./VideoCard";
import Dashboard from "./Dashboard";
import StudioOverview from "./StudioOverview";
import { logout } from "@/actions/auth";

export default function Board({ initialVideos }: { initialVideos: VideoDTO[] }) {
  // Cópia local dos vídeos: permite drag-and-drop instantâneo sem esperar
  // o round-trip do servidor. As Server Actions revalidam a página e o
  // useEffect abaixo re-sincroniza com a verdade do banco.
  const [videos, setVideos] = useState<VideoDTO[]>(initialVideos);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"studio" | "board">("studio");
  const [error, setError] = useState("");
  const [moving, setMoving] = useState(false);
  const dragSnapshot = useRef<VideoDTO[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [creating, startCreating] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setVideos(initialVideos);
  }, [initialVideos]);

  useEffect(() => {
    if (window.parent === window) return;
    const active = videos.filter((video) => video.stage !== "POSTADO");
    const furthest = [...active].sort((a, b) => STAGES.indexOf(b.stage) - STAGES.indexOf(a.stage))[0];
    window.parent.postMessage({
      type: "ARTX_SYSTEM_STATUS",
      system: "videos",
      state: "ready",
      title: `${videos.length} vídeo${videos.length === 1 ? "" : "s"} no fluxo`,
      detail: furthest ? `Mais avançado: ${furthest.title} · ${STAGE_LABELS[furthest.stage]}`.slice(0, 180) : "Pronto para registrar a próxima ideia.",
    }, "https://artx-hub.vercel.app");
  }, [videos]);

  async function downloadBackup() {
    try {
    const response = await fetch("/api/export", { cache: "no-store" });
    if (!response.ok) { window.alert("Não foi possível gerar o backup agora."); return; }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kauaartx-videos-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    } catch { setError("Não foi possível baixar o backup. Confira a conexão e tente novamente."); }
  }

  const sensors = useSensors(
    // 5px de tolerância: distingue clique (abrir detalhe) de arrasto.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  /** Vídeos agrupados por etapa, já filtrados pela busca. */
  const columns = useMemo(() => {
    const term = query.trim().toLowerCase();
    const map = {} as Record<Stage, VideoDTO[]>;
    for (const stage of STAGES) map[stage] = [];

    for (const v of videos) {
      if (term && !`${v.title} ${v.finalTitle} ${v.description} ${v.notes}`.toLowerCase().includes(term)) continue;
      map[v.stage]?.push(v);
    }
    for (const stage of STAGES) map[stage].sort((a, b) => a.order - b.order);
    return map;
  }, [videos, query]);

  /** Totais reais (sem filtro de busca) pro dashboard do topo. */
  const counts = useMemo(() => {
    const map = {} as Record<Stage, number>;
    for (const stage of STAGES) map[stage] = 0;
    for (const v of videos) map[v.stage]++;
    return map;
  }, [videos]);

  const draggingVideo = draggingId
    ? videos.find((v) => v.id === draggingId)
    : undefined;

  /** Clicar num card abre a tela cheia daquele vídeo. */
  const abrirVideo = (id: string) => router.push(`/video/${id}`);

  /** Descobre em qual coluna um id está (o id pode ser um card ou a própria coluna). */
  function containerOf(id: string): Stage | null {
    if (isStage(id)) return id;
    return videos.find((v) => v.id === id)?.stage ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    dragSnapshot.current = videos;
    setDraggingId(String(event.active.id));
    document.body.classList.add("dragging-active");
  }

  /** Move o card entre colunas já durante o arrasto, pra dar feedback visual. */
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const from = containerOf(activeId);
    const to = containerOf(overId);

    if (!from || !to || from === to) return;

    setVideos((prev) =>
      prev.map((v) => (v.id === activeId ? { ...v, stage: to } : v)),
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggingId(null);
    document.body.classList.remove("dragging-active");
    if (!over) { setVideos(dragSnapshot.current); return; }

    const activeId = String(active.id);
    const overId = String(over.id);
    const targetStage = containerOf(overId);
    if (!targetStage) { setVideos(dragSnapshot.current); return; }

    // Ordena a coluna de destino e calcula onde o card ficou.
    const inTarget = videos
      .filter((v) => v.stage === targetStage)
      .sort((a, b) => a.order - b.order);

    const oldIndex = inTarget.findIndex((v) => v.id === activeId);
    const overIndex = inTarget.findIndex((v) => v.id === overId);
    const newIndex =
      overIndex === -1
        ? Math.max(0, inTarget.length - 1) // soltou no vazio da coluna → fim
        : overIndex;

    const reordered =
      oldIndex === -1
        ? inTarget
        : arrayMove(inTarget, oldIndex, Math.max(0, newIndex));

    // Reescreve os `order` da coluna de destino no estado local…
    setVideos((prev) =>
      prev.map((v) => {
        const idx = reordered.findIndex((r) => r.id === v.id);
        return idx === -1 ? v : { ...v, stage: targetStage, order: idx };
      }),
    );

    // …e persiste no banco.
    const finalIndex = reordered.findIndex((r) => r.id === activeId);
    setMoving(true); setError("");
    try { await moveVideo(activeId, targetStage, Math.max(0, finalIndex)); }
    catch { setVideos(dragSnapshot.current); setError("A mudança de etapa não foi salva. A posição anterior foi restaurada. Tente novamente."); }
    finally { setMoving(false); router.refresh(); }
  }

  function handleNewVideo() {
    const title = window.prompt("Título do novo vídeo:");
    if (title === null) return;
    startCreating(async () => {
      try { const id = await createVideo(title); abrirVideo(id); }
      catch { setError("Não foi possível criar o vídeo. Confira sua sessão e tente novamente."); }
    });
  }

  return (
    <div className="flex min-h-screen flex-col studio-shell">
      {/* ---------------------------------------------------------------- */}
      {/* Topo: identidade, busca, dashboard                                */}
      {/* ---------------------------------------------------------------- */}
      <header className="shrink-0 border-b border-line/70 bg-abyss/50 backdrop-blur">
        <div className="flex flex-wrap items-center gap-4 px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/10 text-base ring-1 ring-teal/25">
              🎬
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-ink">
                ARTX Studio
              </div>
              <div className="text-[11px] text-ink-faint">@KauaArtx</div>
            </div>
          </div>

          <div className="relative w-full sm:ml-4 sm:w-72">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint">
              ⌕
            </span>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); if(e.target.value) setView("board"); }}
              aria-label="Buscar vídeos"
              placeholder="Buscar título, ideia ou anotação…"
              className="w-full rounded-lg border border-line bg-surface py-2 pr-3 pl-8 text-sm outline-none transition focus:border-teal/50 focus:ring-2 focus:ring-teal/15"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-ink-faint transition hover:text-ink"
                aria-label="Limpar busca"
              >
                ×
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => void downloadBackup()}
              className="rounded-lg border border-line px-3 py-2 text-sm text-ink-dim transition hover:text-ink"
            >
              Backup
            </button>
            <button
              onClick={handleNewVideo}
              disabled={creating}
              className="rounded-lg bg-teal px-3.5 py-2 text-sm font-semibold text-abyss transition hover:bg-teal/90 disabled:opacity-50"
            >
              {creating ? "Criando…" : "+ Novo vídeo"}
            </button>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-line px-3 py-2 text-sm text-ink-dim transition hover:border-line hover:text-ink"
                title="Sair"
              >
                Sair
              </button>
            </form>
          </div>
        </div>

        <Dashboard counts={counts} total={videos.length} />
        <nav className="studio-tabs" aria-label="Visão do estúdio"><button aria-pressed={view === "studio"} onClick={()=>setView("studio")}>Meu estúdio</button><button aria-pressed={view === "board"} onClick={()=>setView("board")}>Quadro de produção</button><span>{moving ? "Salvando movimento…" : "Seu processo, no seu ritmo."}</span></nav>
      </header>
      {error && <div className="studio-error" role="alert">{error}<button onClick={()=>setError("")} aria-label="Fechar aviso">×</button></div>}
      {view === "studio" ? <StudioOverview videos={videos} onOpen={abrirVideo} creating={creating} onCreate={async(title,description)=>{setError("");try{const id=await createVideo(title,description);abrirVideo(id);return true;}catch{setError("Não foi possível guardar a ideia. O texto continua no formulário para tentar novamente.");return false;}}} /> : <>

      {/* ---------------------------------------------------------------- */}
      {/* Board: 8 colunas com scroll horizontal                            */}
      {/* ---------------------------------------------------------------- */}
      <DndContext
        // `id` fixo: sem ele o dnd-kit gera os ids de acessibilidade a partir
        // de um contador que difere entre o render do servidor e o do client,
        // o que provoca erro de hidratação do React.
        id="kx-board"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setVideos(dragSnapshot.current);
          setDraggingId(null);
          document.body.classList.remove("dragging-active");
        }}
      >
        <main className={`flex flex-1 gap-4 overflow-x-auto px-6 py-5 ${moving ? "pointer-events-none" : ""}`} aria-busy={moving}>
          {STAGES.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              videos={columns[stage]}
              totalInStage={counts[stage]}
              filtering={query.trim().length > 0}
              onOpen={abrirVideo}
            />
          ))}
        </main>

        {/* Fantasma que segue o cursor durante o arrasto */}
        <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
          {draggingVideo ? (
            <div className="rotate-2 opacity-95">
              <VideoCard video={draggingVideo} onOpen={() => {}} overlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {videos.length === 0 && (
        <div className="px-6 py-5">
          <p className="text-sm text-ink-faint">
            Nenhum vídeo ainda. Clique em{" "}
            <span className="text-teal">+ Novo vídeo</span> para começar, ou guarde sua primeira ideia na aba Meu estúdio.
          </p>
        </div>
      )}
      </>}
    </div>
  );
}
