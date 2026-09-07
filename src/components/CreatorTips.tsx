'use client';
import { useI18n } from './I18n';

export function CreatorTips() {
  const { language } = useI18n();
  const en = language === 'en';
  return <section className="studio-panel"><span className="studio-kicker">{en ? 'BEFORE / AFTER PUBLISHING' : 'ANTES / DEPOIS DE PUBLICAR'}</span><h2>{en ? 'Three checks for your next video' : 'Três cuidados no próximo vídeo'}</h2><div className="creator-tip-grid">
    <article><span aria-hidden="true">▶</span><h3>{en ? 'Deliver the promise' : 'Cumpra a promessa'}</h3><p>{en ? 'Make the opening match the title and thumbnail. Show why the story matters.' : 'Faça a abertura corresponder ao título e à capa. Mostre por que vale acompanhar.'}</p></article>
    <article><span aria-hidden="true">▧</span><h3>{en ? 'Read it at a glance' : 'Entenda de relance'}</h3><p>{en ? 'Check the thumbnail at a small size: one clear subject, readable text, no misleading promise.' : 'Confira a capa pequena: assunto claro, texto legível e nenhuma promessa enganosa.'}</p></article>
    <article><span aria-hidden="true">↗</span><h3>{en ? 'Learn from retention' : 'Aprenda com a retenção'}</h3><p>{en ? 'After publishing, review dips and spikes in YouTube Studio. Record one change for the next script.' : 'Depois de postar, observe quedas e picos no YouTube Studio. Anote uma mudança para o próximo roteiro.'}</p></article>
  </div><details><summary>{en ? 'Official sources · checked 7 September 2026' : 'Fontes oficiais · consultadas em 07/09/2026'}</summary><a href="https://support.google.com/youtube/answer/9314415?hl=pt-BR" target="_blank" rel="noopener noreferrer">YouTube: retenção ↗</a><br/><a href="https://support.google.com/youtube/answer/12340300?hl=pt-BR" target="_blank" rel="noopener noreferrer">YouTube: títulos e miniaturas ↗</a><p>{en ? 'These checks do not guarantee views. No metrics are imported automatically.' : 'Esses cuidados não garantem visualizações. Nenhuma métrica é importada automaticamente.'}</p></details></section>;
}
