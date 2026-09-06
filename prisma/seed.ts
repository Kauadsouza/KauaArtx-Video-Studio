import { PrismaClient } from "@prisma/client";
import { CHECKLIST_TEMPLATES } from "../src/lib/stages";

const prisma = new PrismaClient();

/**
 * Popula a coluna "Ideia" com os primeiros vídeos do canal.
 *
 * Como a viagem só acontece no fim de 2026, todo o conteúdo até lá é sobre
 * a JORNADA DE PREPARAÇÃO — sem fingir que a viagem já começou.
 *
 * Rodar: npm run db:seed
 * É idempotente: se já existir vídeo com o mesmo título, ele é pulado.
 */
const IDEIAS: { title: string; description: string }[] = [
  {
    title: "Vídeo de abertura do canal",
    description:
      "Quem eu sou, por que decidi documentar tudo (não só a viagem, mas a preparação) e o que esperar dos próximos meses.",
  },
  {
    title: "Por que só vou viajar no fim do ano",
    description:
      "Vídeo transparente explicando por que estou começando a gravar agora mesmo assim. Gera expectativa sem enganar ninguém.",
  },
  {
    title: "Planejando a viagem #1: escolhendo destino e roteiro",
    description: "Mostrar a pesquisa, as decisões e os mapas.",
  },
  {
    title: "Quanto custa se preparar pra morar/viajar fora",
    description: "Conta aberta: Wise, câmbio, orçamento real.",
  },
  {
    title: "Documentos e burocracia: o que ninguém te conta",
    description: "Vistos, ETA, cartas de hospedagem e afins.",
  },
  {
    title: "Contagem regressiva: X meses pra viagem",
    description:
      "O que já resolvi e o que falta. Formato de série — pode repetir todo mês.",
  },
  {
    title: "Bastidores de montar um canal do zero",
    description: "Equipamento, aprendizado de edição, primeiros erros.",
  },
  {
    title: "Perguntas e respostas com quem está acompanhando",
    description:
      "Engajamento — mostra que tem gente real acompanhando a jornada.",
  },
];

async function main() {
  console.log("Semeando ideias iniciais…\n");

  let created = 0;
  let skipped = 0;

  for (const [index, ideia] of IDEIAS.entries()) {
    const exists = await prisma.video.findFirst({
      where: { title: ideia.title },
      select: { id: true },
    });

    if (exists) {
      console.log(`  – já existe: ${ideia.title}`);
      skipped++;
      continue;
    }

    await prisma.video.create({
      data: {
        title: ideia.title,
        description: ideia.description,
        stage: "IDEIA",
        order: index,
        checklistItems: {
          create: CHECKLIST_TEMPLATES.IDEIA.map((text, i) => ({
            stage: "IDEIA" as const,
            text,
            order: i,
          })),
        },
      },
    });

    console.log(`  ✓ criado: ${ideia.title}`);
    created++;
  }

  console.log(`\nPronto. ${created} criados, ${skipped} pulados.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
