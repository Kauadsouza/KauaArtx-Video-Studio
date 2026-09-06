"use client";

import { useState } from "react";

/** Assistente editorial privado, autenticado e limitado no servidor. */
export default function AiButton({
  field,
  context,
  onResult,
}: {
  /** Qual campo estamos gerando: "script" | "title" | "thumbnail". */
  field: "script" | "title" | "thumbnail";
  /** Contexto do vídeo que será enviado como prompt. */
  context: Record<string, unknown>;
  onResult?: (text: string) => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "unavailable" | "success">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [result, setResult] = useState("");
  const [mode, setMode] = useState<"ai" | "local">("local");

  async function handleClick() {
    setMessage("");
    setStatus("loading");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, context }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("unavailable");
        setMessage(data?.error ?? "IA não configurada ainda.");
        return;
      }

      const generated = typeof data.text === "string" ? data.text : "";
      setMode(data.mode === "ai" ? "ai" : "local");
      setResult(generated);
      setStatus("success");
      onResult?.(generated);
    } catch {
      setStatus("unavailable");
      setMessage("Não foi possível falar com a rota de IA.");
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        title="Gerar uma sugestão editorial com IA"
        className="rounded-md border border-line bg-canvas px-2 py-1 text-[11px] font-medium text-ink-faint transition hover:border-teal/40 hover:text-teal disabled:opacity-50"
      >
        {status === "loading" ? "…" : "✨ Gerar com IA"}
      </button>

      {status === "unavailable" && (
        <span
          role="status"
          className="animate-fade-in absolute top-full right-0 z-20 mt-1 w-56 rounded-lg border border-amber/30 bg-surface-2 px-2.5 py-2 text-[11px] leading-relaxed text-amber shadow-xl"
          onClick={() => setStatus("idle")}
        >
          {message}
        </span>
      )}
      {status === "success" && result && (
        <span className="animate-fade-in absolute top-full right-0 z-30 mt-1 flex w-[min(420px,80vw)] flex-col gap-2 rounded-lg border border-teal/30 bg-surface-2 p-3 text-[11px] leading-relaxed text-ink shadow-xl">
          <strong className="text-teal">{mode === "ai" ? "Sugestão gerada por IA" : "Sugestão editorial local"}</strong>
          <span className="max-h-64 overflow-auto whitespace-pre-wrap">{result}</span>
          <span className="flex justify-end gap-2">
            <button type="button" className="rounded border border-line px-2 py-1" onClick={async () => { await navigator.clipboard.writeText(result); setMessage("Copiado."); }}>Copiar</button>
            <button type="button" className="rounded bg-teal px-2 py-1 font-semibold text-abyss" onClick={() => setStatus("idle")}>Fechar</button>
          </span>
          {message && <small className="text-teal">{message}</small>}
        </span>
      )}
    </span>
  );
}
