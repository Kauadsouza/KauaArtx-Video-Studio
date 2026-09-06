/**
 * Definição central das 8 etapas do fluxo de produção.
 *
 * Tudo que é "por etapa" (rótulo, cor, checklist padrão) mora aqui.
 * Se um dia você quiser mexer nos textos do checklist, é só editar
 * CHECKLIST_TEMPLATES abaixo — nada mais no código precisa mudar.
 */

export const STAGES = [
  "IDEIA",
  "ROTEIRO",
  "GRAVACAO",
  "EDICAO",
  "THUMBNAIL_TITULO",
  "REVISAO",
  "AGENDADO",
  "POSTADO",
] as const;

export type Stage = (typeof STAGES)[number];

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

/** Rótulo bonito pra mostrar na tela. */
export const STAGE_LABELS: Record<Stage, string> = {
  IDEIA: "Ideia",
  ROTEIRO: "Roteiro",
  GRAVACAO: "Gravação",
  EDICAO: "Edição",
  THUMBNAIL_TITULO: "Thumbnail / Título",
  REVISAO: "Revisão",
  AGENDADO: "Agendado",
  POSTADO: "Postado",
};

/**
 * Cor de destaque de cada etapa.
 *
 * Deriva da paleta verde escolhida (#051F20 → #DAF1DE): as etapas iniciais
 * usam os tons profundos e vão clareando conforme o vídeo avança, então a
 * própria cor comunica o progresso.
 */
export const STAGE_COLORS: Record<Stage, string> = {
  IDEIA: "#4A7C6F",
  ROTEIRO: "#235347",
  GRAVACAO: "#2F7A66",
  EDICAO: "#3F9E82",
  THUMBNAIL_TITULO: "#63B99B",
  REVISAO: "#8EB69B",
  AGENDADO: "#B4D9C4",
  POSTADO: "#DAF1DE",
};

/** Uma linha explicando o que se faz em cada etapa (mostrada no workspace). */
export const STAGE_HINTS: Record<Stage, string> = {
  IDEIA: "Anote a ideia solta, o gancho e as referências. Nada precisa estar pronto aqui.",
  ROTEIRO: "Escreva o roteiro quebrado em blocos de tempo. Estes blocos vão te seguir até a edição.",
  GRAVACAO: "Marque cada bloco conforme grava. O roteiro vira sua lista de gravação.",
  EDICAO: "Os mesmos blocos, agora como tarefas de edição por trecho de tempo.",
  THUMBNAIL_TITULO: "Teste títulos, escolha um, e descreva a thumbnail.",
  REVISAO: "Assista inteiro e anote o que precisa corrigir antes de publicar.",
  AGENDADO: "Data, descrição do YouTube e tags. Tudo pronto pra subir.",
  POSTADO: "Link do vídeo e o que você aprendeu pro próximo.",
};

// ---------------------------------------------------------------------------
// Estado dos blocos nas etapas de gravação e edição
// ---------------------------------------------------------------------------

export const BLOCK_STATUSES = ["PENDENTE", "EM_PROGRESSO", "PRONTO"] as const;
export type BlockStatus = (typeof BLOCK_STATUSES)[number];

export const BLOCK_STATUS_LABELS: Record<BlockStatus, string> = {
  PENDENTE: "Pendente",
  EM_PROGRESSO: "Em produção",
  PRONTO: "Pronto",
};

export const BLOCK_STATUS_COLORS: Record<BlockStatus, string> = {
  PENDENTE: "#5A7A70",
  EM_PROGRESSO: "#F5B84B",
  PRONTO: "#63B99B",
};

/** Emoji/ícone curtinho por etapa — ajuda a bater o olho e reconhecer a coluna. */
export const STAGE_ICONS: Record<Stage, string> = {
  IDEIA: "💡",
  ROTEIRO: "📝",
  GRAVACAO: "🎥",
  EDICAO: "✂️",
  THUMBNAIL_TITULO: "🖼️",
  REVISAO: "🔍",
  AGENDADO: "📅",
  POSTADO: "🚀",
};

export function nextStage(stage: Stage): Stage | null {
  const i = STAGES.indexOf(stage);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

export function prevStage(stage: Stage): Stage | null {
  const i = STAGES.indexOf(stage);
  return i > 0 ? STAGES[i - 1] : null;
}

/**
 * Checklists padrão de cada etapa.
 *
 * São apenas um PONTO DE PARTIDA: eles são copiados para o banco quando o
 * vídeo entra na etapa pela primeira vez. Depois disso viram itens normais
 * que você pode editar, remover ou reordenar livremente — mudar o texto aqui
 * não altera vídeos que já passaram pela etapa.
 */
export const CHECKLIST_TEMPLATES: Record<Stage, string[]> = {
  IDEIA: [
    "Definir tema central do vídeo",
    "Definir gancho (hook) dos primeiros 5 segundos",
    "Pesquisar 2-3 referências de vídeos parecidos",
    "Checar se a ideia combina com a fase atual (morando em Oxford e contando viagens, histórias e evolução)",
  ],
  ROTEIRO: [
    "Escrever gancho inicial (0-15s)",
    "Quebrar o resto do vídeo em blocos de tempo (usar o editor de blocos)",
    "Definir call-to-action final (inscrever-se, comentar, etc.)",
    "Revisar se o roteiro está claro e direto",
  ],
  GRAVACAO: [
    "Preparar cenário/luz/áudio",
    "Gravar todos os blocos do roteiro",
    "Gravar takes extras de segurança (b-roll)",
    "Conferir se áudio e vídeo gravaram bem antes de desmontar o set",
  ],
  EDICAO: [
    "Selecionar melhores tomadas",
    "Cortar/montar sequência",
    "Corrigir cor",
    "Ajustar áudio/trilha sonora",
    "Adicionar legendas",
    "Exportar vídeo final",
  ],
  THUMBNAIL_TITULO: [
    "Testar pelo menos 3 opções de título",
    "Criar a thumbnail",
    "Escolher a combinação final título + thumbnail",
  ],
  REVISAO: [
    "Assistir o vídeo inteiro do início ao fim",
    "Checar erros de corte, áudio ou informação",
    "Pedir feedback de alguém de confiança",
  ],
  AGENDADO: [
    "Definir data e horário de postagem",
    "Escrever descrição do vídeo pro YouTube",
    "Definir tags/SEO",
    "Programar postagem",
  ],
  POSTADO: [
    "Compartilhar o vídeo nas redes sociais",
    "Responder comentários nas primeiras 24h",
    "Anotar aprendizados pro próximo vídeo",
  ],
};

/** Formata segundos como "0:15" pra exibição nos blocos de roteiro. */
export function formatSeconds(total: number): string {
  const safe = Math.max(0, Math.floor(total || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
