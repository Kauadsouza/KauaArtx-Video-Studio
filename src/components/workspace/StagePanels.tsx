"use client";

import { useTransition } from "react";
import { updatePublishAt } from "@/actions/videos";
import { formatSeconds, type Stage } from "@/lib/stages";
import { blockProgress, type VideoDTO } from "@/lib/types";
import ScriptBlockEditor from "@/components/ScriptBlockEditor";
import AiButton from "@/components/AiButton";
import BlockStatusPanel from "./BlockStatusPanel";
import { SectionTitle, TextField } from "./Field";
import { safeVideoUrl } from "@/lib/safe-url";

/**
 * Cada etapa tem o seu próprio espaço de trabalho, com os campos que fazem
 * sentido ali — em vez de um formulário genérico igual pra tudo.
 */
export default function StagePanel({
  stage,
  video,
}: {
  stage: Stage;
  video: VideoDTO;
}) {
  switch (stage) {
    case "IDEIA":
      return <PainelIdeia video={video} />;
    case "ROTEIRO":
      return <PainelRoteiro video={video} />;
    case "GRAVACAO":
      return <PainelGravacao video={video} />;
    case "EDICAO":
      return <PainelEdicao video={video} />;
    case "THUMBNAIL_TITULO":
      return <PainelTitulo video={video} />;
    case "REVISAO":
      return <PainelRevisao video={video} />;
    case "AGENDADO":
      return <PainelAgendado video={video} />;
    case "POSTADO":
      return <PainelPostado video={video} />;
  }
}

// ---------------------------------------------------------------------------

function PainelIdeia({ video }: { video: VideoDTO }) {
  return (
    <div className="space-y-6">
      <TextField
        videoId={video.id}
        field="description"
        label="Do que se trata"
        hint="em uma ou duas frases"
        value={video.description}
        rows={3}
        placeholder="A ideia solta, do jeito que veio na cabeça…"
      />
      <TextField
        videoId={video.id}
        field="hook"
        label="Gancho"
        hint="os primeiros 5 segundos — o que segura a pessoa"
        value={video.hook}
        rows={3}
        placeholder="Ex: 'Faltam 8 meses pra viagem e eu ainda não tenho passaporte.'"
      />
      <TextField
        videoId={video.id}
        field="references"
        label="Referências"
        hint="uma por linha"
        value={video.references}
        rows={4}
        placeholder={"https://youtube.com/...\nvídeo do fulano sobre orçamento"}
      />
      <TextField
        videoId={video.id}
        field="notes"
        label="Notas livres"
        value={video.notes}
        rows={4}
        placeholder="Qualquer coisa que não cabe nos campos acima."
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function PainelRoteiro({ video }: { video: VideoDTO }) {
  const total = video.scriptBlocks.reduce(
    (max, b) => Math.max(max, b.endSeconds),
    0,
  );

  return (
    <div className="space-y-6">
      {video.hook && (
        <div className="rounded-xl border border-teal/25 bg-teal/[0.06] p-3.5">
          <div className="mb-1 text-[11px] font-medium tracking-wide text-teal uppercase">
            gancho definido na etapa Ideia
          </div>
          <p className="text-sm leading-relaxed text-ink-dim">{video.hook}</p>
        </div>
      )}

      <ScriptBlockEditor
        videoId={video.id}
        blocks={video.scriptBlocks}
        videoTitle={video.title}
      />

      {total > 0 && (
        <p className="text-xs text-ink-faint">
          Duração planejada: <strong>{formatSeconds(total)}</strong>. Estes
          blocos vão reaparecer nas etapas de Gravação e Edição.
        </p>
      )}

      <TextField
        videoId={video.id}
        field="notes"
        label="Notas do roteiro"
        value={video.notes}
        rows={4}
        placeholder="O que cortar, o que ainda falta pesquisar…"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function PainelGravacao({ video }: { video: VideoDTO }) {
  const { done, total } = blockProgress(video, "recording");

  return (
    <div className="space-y-5">
      <SectionTitle hint={`${done} de ${total} blocos gravados`}>
        Lista de gravação
      </SectionTitle>
      <BlockStatusPanel blocks={video.scriptBlocks} kind="recording" />
      <TextField
        videoId={video.id}
        field="notes"
        label="Notas da gravação"
        value={video.notes}
        rows={3}
        placeholder="Equipamento, luz, o que deu errado…"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function PainelEdicao({ video }: { video: VideoDTO }) {
  const { done, total } = blockProgress(video, "editing");

  return (
    <div className="space-y-5">
      <SectionTitle hint={`${done} de ${total} trechos editados`}>
        Tarefas de edição por trecho
      </SectionTitle>
      <BlockStatusPanel blocks={video.scriptBlocks} kind="editing" />
      <TextField
        videoId={video.id}
        field="notes"
        label="Notas da edição"
        value={video.notes}
        rows={3}
        placeholder="Trilha escolhida, correção de cor, legendas…"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function PainelTitulo({ video }: { video: VideoDTO }) {
  const opcoes = video.titleOptions
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle
          hint="uma por linha — escreva pelo menos 3"
          action={
            <AiButton
              field="title"
              context={{ title: video.title, description: video.description }}
            />
          }
        >
          Opções de título
        </SectionTitle>
        <TextField
          videoId={video.id}
          field="titleOptions"
          label=""
          value={video.titleOptions}
          rows={5}
          placeholder={
            "Faltam 8 meses pra viagem e eu tô começando do zero\nComecei a gravar antes de viajar — e é de propósito\nO plano de 8 meses até a viagem"
          }
        />
        {opcoes.length > 0 && (
          <p className="mt-1.5 text-xs text-ink-faint">
            {opcoes.length} {opcoes.length === 1 ? "opção" : "opções"} escritas
            {opcoes.length < 3 && " — o checklist pede pelo menos 3"}
          </p>
        )}
      </div>

      <TextField
        videoId={video.id}
        field="finalTitle"
        label="Título escolhido"
        hint="o que vai pro YouTube"
        value={video.finalTitle}
        rows={1}
        placeholder="Cole aqui a opção vencedora"
      />

      <div>
        <SectionTitle
          action={
            <AiButton
              field="thumbnail"
              context={{ title: video.title, description: video.description }}
            />
          }
        >
          Ideia de thumbnail
        </SectionTitle>
        <TextField
          videoId={video.id}
          field="thumbnailIdea"
          label=""
          value={video.thumbnailIdea}
          rows={4}
          placeholder="O que aparece, expressão do rosto, texto sobreposto…"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function PainelRevisao({ video }: { video: VideoDTO }) {
  const { done, total } = blockProgress(video, "editing");

  return (
    <div className="space-y-6">
      {total > 0 && done < total && (
        <div className="rounded-xl border border-amber/30 bg-amber/[0.06] p-3.5 text-sm text-amber">
          Ainda faltam {total - done} de {total} trechos na edição.
        </div>
      )}

      <TextField
        videoId={video.id}
        field="reviewNotes"
        label="O que precisa corrigir"
        hint="assista inteiro e vá anotando com o tempo"
        value={video.reviewNotes}
        rows={8}
        placeholder={
          "0:42 — corte seco demais\n1:15 — áudio baixo\n2:03 — falei o nome errado da cidade"
        }
        mono
      />

      {video.finalTitle && (
        <div className="rounded-xl border border-line bg-surface p-3.5">
          <div className="text-[11px] tracking-wide text-ink-faint uppercase">
            título escolhido
          </div>
          <p className="mt-1 text-sm text-ink">{video.finalTitle}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function PainelAgendado({ video }: { video: VideoDTO }) {
  const [, start] = useTransition();

  // <input type="datetime-local"> quer "YYYY-MM-DDTHH:mm" no horário local.
  const paraInput = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">
          Data e hora da postagem
        </span>
        <input
          type="datetime-local"
          defaultValue={paraInput(video.publishAt)}
          onBlur={(e) =>
            start(() => updatePublishAt(video.id, e.target.value))
          }
          className="rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm outline-none transition focus:border-teal/50"
        />
      </label>

      <TextField
        videoId={video.id}
        field="youtubeDescription"
        label="Descrição do YouTube"
        hint="o texto que vai embaixo do vídeo"
        value={video.youtubeDescription}
        rows={8}
        placeholder={"Sobre o que é o vídeo…\n\n📍 Me acompanhe: @KauaArtx"}
      />

      <TextField
        videoId={video.id}
        field="tags"
        label="Tags / SEO"
        hint="separadas por vírgula"
        value={video.tags}
        rows={2}
        placeholder="vlog de viagem, planejamento, mochilão, preparação"
      />

      {video.finalTitle && (
        <div className="rounded-xl border border-line bg-surface p-3.5">
          <div className="text-[11px] tracking-wide text-ink-faint uppercase">
            título escolhido
          </div>
          <p className="mt-1 text-sm text-ink">{video.finalTitle}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function PainelPostado({ video }: { video: VideoDTO }) {
  const videoUrl = safeVideoUrl(video.videoUrl);
  return (
    <div className="space-y-6">
      <TextField
        videoId={video.id}
        field="videoUrl"
        label="Link do vídeo"
        value={video.videoUrl}
        rows={1}
        placeholder="https://youtube.com/watch?v=..."
      />

      {videoUrl && (
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal/12 px-3 py-2 text-sm font-medium text-teal transition hover:bg-teal/20"
        >
          Abrir no YouTube ↗
        </a>
      )}

      <TextField
        videoId={video.id}
        field="learnings"
        label="Aprendizados pro próximo vídeo"
        hint="o que funcionou, o que você faria diferente"
        value={video.learnings}
        rows={8}
        placeholder={
          "O que deu certo:\n\nO que eu faria diferente:\n\nComentários que se repetiram:"
        }
      />
    </div>
  );
}
