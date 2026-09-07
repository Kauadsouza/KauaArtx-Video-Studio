import { STAGE_COLORS, STAGE_LABELS, type Stage } from '@/lib/stages';

/** Small vector scene for each production stage; no tracking or external images. */
export function StageArt({ stage }: { stage: Stage }) {
  const drawings: Record<Stage, React.ReactNode> = {
    IDEIA: <><path d="M134 110c-23-30-14-65 20-65s43 35 20 65l-4 16h-32z"/><path d="M141 137h26m-24 9h22M154 19v12m-62 28 12 6m94 0 12-6M109 29l9 11m72-11-9 11"/></>,
    ROTEIRO: <><rect x="104" y="30" width="104" height="129" rx="12"/><path d="M125 59h62m-62 20h40m-40 20h62m-62 20h48m-48 20h27"/></>,
    GRAVACAO: <><rect x="82" y="54" width="121" height="79" rx="16"/><path d="m203 77 39-21v75l-39-20M116 147h62m-30-14v14"/><circle cx="145" cy="94" r="24"/><circle cx="98" cy="68" r="3" fill="currentColor"/></>,
    EDICAO: <><rect x="62" y="42" width="194" height="116" rx="12"/><path d="M77 78h164M77 108h164M113 53v94"/><rect x="128" y="88" width="58" height="10" rx="3"/><rect x="91" y="119" width="134" height="13" rx="3"/></>,
    THUMBNAIL_TITULO: <><rect x="63" y="41" width="195" height="115" rx="13"/><circle cx="117" cy="84" r="21"/><path d="M81 142c0-42 71-42 71 0m16-70h70m-70 21h54m-54 21h64"/></>,
    REVISAO: <><rect x="90" y="34" width="133" height="129" rx="14"/><path d="m111 69 8 8 14-16m-22 42 8 8 14-16m-22 42 8 8 14-16m15-54h52m-52 34h52m-52 34h36"/></>,
    AGENDADO: <><rect x="87" y="42" width="142" height="119" rx="15"/><path d="M88 77h140M119 29v26m76-26v26"/><circle cx="157" cy="117" r="26"/><path d="M157 101v18l13 7"/></>,
    POSTADO: <><rect x="78" y="43" width="151" height="98" rx="17"/><path d="m143 72 37 21-37 21zM102 161l32-8 25 4 29-19 33 3"/><path d="m234 42 14-14m-92 1V15m-85 23L58 27"/></>,
  };
  return <div className="studio-stage-art" style={{ color: STAGE_COLORS[stage] }}><svg viewBox="0 0 320 190" role="img" aria-label={`Ilustração: ${STAGE_LABELS[stage]}`}><circle cx="156" cy="98" r="83" fill="currentColor" opacity=".07"/><circle cx="265" cy="36" r="13" fill="currentColor" opacity=".15"/><circle cx="53" cy="148" r="20" fill="currentColor" opacity=".1"/><g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">{drawings[stage]}</g></svg></div>;
}
