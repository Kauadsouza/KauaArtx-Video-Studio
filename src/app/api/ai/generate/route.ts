import { requireSession } from "@/lib/require-session";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const MAX_BODY_BYTES = 64 * 1024;
const ALLOWED_CONTEXT = ["title", "description", "hook", "notes", "references", "script"] as const;

function contextFrom(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const result: Record<string, string> = {};
  let total = 0;
  for (const key of ALLOWED_CONTEXT) {
    if (typeof input[key] !== "string") continue;
    const clean = input[key].trim().slice(0, 4000);
    total += clean.length;
    if (total > 12000) throw new Error("context_too_large");
    result[key] = clean;
  }
  return result;
}

const PROMPTS: Record<string, (ctx: Record<string, string>) => string> = {
  script: (ctx) => `Escreva um roteiro para o vídeo "${ctx.title || "sem título"}". Contexto confirmado pelo criador:\n${ctx.description || ctx.notes || "nenhum contexto adicional"}\n\nEntregue blocos de tempo práticos, começando com um gancho de 0 a 15 segundos, desenvolvimento e chamada final. Não invente fatos, datas, lugares ou experiências. Quando faltar informação, use uma marcação [CONFIRMAR].`,
  title: (ctx) => `Crie 5 opções de título para YouTube sobre "${ctx.title || "ideia em definição"}". Contexto: ${ctx.description || ctx.hook || "sem descrição"}. Escreva em português natural, com clareza e curiosidade, sem clickbait enganoso. Explique em uma linha por que cada opção funciona.`,
  thumbnail: (ctx) => `Crie 3 conceitos de thumbnail para "${ctx.title || "vídeo em definição"}". Contexto: ${ctx.description || ctx.hook || "sem descrição"}. Para cada conceito, detalhe composição, expressão, fundo, contraste e texto sobreposto de até 4 palavras. Não invente cenários que não estejam no contexto.`,
};

function localSuggestion(field: string, ctx: Record<string, string>): string {
  const title = ctx.title || "meu próximo vídeo";
  if (field === "script") return [
    `0–15s · GANCHO\nAbra com a mudança central de “${title}” e diga por que vale acompanhar até o fim.`,
    "15–45s · CONTEXTO\nExplique onde você estava, o que queria fazer e quais fatos ainda precisam ser confirmados. Use [CONFIRMAR] onde faltar detalhe.",
    "45–120s · HISTÓRIA\nConte os acontecimentos em ordem, alternando fala direta, imagens de apoio e uma observação pessoal concreta.",
    "120–180s · VIRADA\nMostre o momento mais difícil, inesperado ou transformador sem exagerar o que aconteceu.",
    "180–240s · APRENDIZADO\nDiga o que mudou na sua forma de pensar ou agir e conecte com sua fase atual em Oxford.",
    "FINAL · CTA\nConvide quem vive uma fase parecida a comentar e acompanhar o próximo capítulo do canal.",
  ].join("\n\n");
  if (field === "title") return [
    `1. ${title} — contado do jeito que aconteceu`,
    `2. O que ninguém me explicou antes de ${title.toLowerCase()}`,
    `3. ${title}: acertos, erros e o que eu aprendi`,
    `4. Como ${title.toLowerCase()} mudou meus próximos passos`,
    `5. A verdade sobre ${title.toLowerCase()}`,
  ].join("\n");
  return [
    "1. Rosto em primeiro plano à esquerda, cenário real ao fundo e texto curto: “COMEÇOU AQUI”. Contraste claro entre rosto e fundo.",
    "2. Composição dividida antes/depois, um elemento concreto da história em cada lado e texto: “NOVA FASE”.",
    "3. Plano aberto no local real, expressão de surpresa contida e uma seta gráfica apontando para o detalhe principal. Texto: “EU CONSEGUI?”.",
  ].join("\n\n");
}

export async function POST(request: Request) {
  try { await requireSession(); } catch { return NextResponse.json({ error: "Sessão expirada. Entre pelo Hub." }, { status: 401 }); }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BODY_BYTES) return NextResponse.json({ error: "Pedido maior que 64 KB." }, { status: 413 });

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return NextResponse.json({ error: "Pedido maior que 64 KB." }, { status: 413 });

  let body: { field?: unknown; context?: unknown };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  if (typeof body.field !== "string" || !PROMPTS[body.field]) return NextResponse.json({ error: "Campo inválido. Use script, title ou thumbnail." }, { status: 400 });

  let context: Record<string, string>;
  try { context = contextFrom(body.context); } catch { return NextResponse.json({ error: "Contexto grande demais." }, { status: 413 }); }

  const baseUrl = process.env.LLM_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  const claimed = await prisma.$queryRaw<Array<{ accepted: boolean }>>`select public.claim_video_generation() as accepted`;
  if (!claimed[0]?.accepted) return NextResponse.json({ error: "Limite de 20 gerações por hora atingido. Tente novamente mais tarde." }, { status: 429 });
  const fallback = () => NextResponse.json({ text: localSuggestion(body.field as string, context), mode: "local" }, { headers: { "Cache-Control": "no-store" } });
  if (!baseUrl || !apiKey || !model) return fallback();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 2000,
        messages: [
          { role: "system", content: "Você é o assistente editorial privado do canal @KauaArtx. Kauã mora em Oxford e cria conteúdo sobre viagens, histórias reais e evolução pessoal. Use somente fatos fornecidos no pedido." },
          { role: "user", content: PROMPTS[body.field](context) },
        ],
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`provider_${response.status}`);
    const result = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    const text = result.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new Error("empty_response");
    return NextResponse.json({ text: text.trim(), mode: "ai" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Falha na geração editorial:", error instanceof Error ? error.message : "unknown");
    return fallback();
  } finally { clearTimeout(timer); }
}
