/**
 * O roteiro é uma linha do tempo contínua: cada bloco começa exatamente onde
 * o anterior terminou. Editar um tempo move a fronteira e os blocos seguintes
 * acompanham, mantendo a duração que cada um já tinha.
 */

export type TimelineBlock = { id: string; startSeconds: number; endSeconds: number; order: number };

export const MIN_BLOCK_SECONDS = 1;

function seconds(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

/**
 * Aplica uma edição de tempo e devolve a lista inteira já coerente.
 *
 * Editar o início de um bloco move a fronteira com o bloco anterior; editar o
 * fim move a fronteira com o próximo. Nos dois casos, todos os blocos abaixo
 * deslizam junto preservando a própria duração.
 */
export function cascadeTimeline(
  blocks: TimelineBlock[],
  editedId: string,
  patch: { startSeconds?: number; endSeconds?: number },
): TimelineBlock[] {
  const line = [...blocks].sort((a, b) => a.order - b.order).map(block => ({ ...block }));
  const index = line.findIndex(block => block.id === editedId);
  if (index < 0) return line;

  const durations = line.map(block => Math.max(MIN_BLOCK_SECONDS, block.endSeconds - block.startSeconds));
  const edited = line[index];

  if (patch.startSeconds !== undefined) {
    const previous = line[index - 1];
    // Um bloco nunca começa antes do anterior ter espaço para existir.
    const floorStart = previous ? previous.startSeconds + MIN_BLOCK_SECONDS : 0;
    edited.startSeconds = Math.max(floorStart, seconds(patch.startSeconds));
    if (previous) previous.endSeconds = edited.startSeconds;
    edited.endSeconds = edited.startSeconds + durations[index];
  }

  if (patch.endSeconds !== undefined) {
    edited.endSeconds = Math.max(edited.startSeconds + MIN_BLOCK_SECONDS, seconds(patch.endSeconds));
    durations[index] = edited.endSeconds - edited.startSeconds;
  }

  for (let position = index + 1; position < line.length; position += 1) {
    line[position].startSeconds = line[position - 1].endSeconds;
    line[position].endSeconds = line[position].startSeconds + durations[position];
  }

  return line;
}

/** Só os blocos cujos tempos realmente mudaram, para não gravar linha à toa. */
export function changedBlocks(before: TimelineBlock[], after: TimelineBlock[]): TimelineBlock[] {
  const previous = new Map(before.map(block => [block.id, block]));
  return after.filter(block => {
    const original = previous.get(block.id);
    return !original || original.startSeconds !== block.startSeconds || original.endSeconds !== block.endSeconds;
  });
}
