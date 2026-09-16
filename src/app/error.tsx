"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Antes, uma consulta quebrada derrubava o quadro sem dizer nada. Aqui a falha
 * fica visível, recuperável, e com o identificador que aparece no log da Vercel.
 */
export default function StudioError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Falha no Video Studio:", error.message, error.digest ?? "");
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-line bg-surface p-6">
        <span className="text-[11px] tracking-wide text-ink-faint uppercase">Algo falhou</span>
        <h1 className="text-xl font-semibold text-ink">O estúdio não conseguiu carregar.</h1>
        <p className="text-sm leading-relaxed text-ink-faint">
          Seus vídeos e roteiros continuam salvos no banco. Tente de novo; se o erro repetir, o banco pode estar fora do ar.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={reset} className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-abyss">Tentar de novo</button>
          <Link href="/" className="rounded-lg border border-line px-3 py-2 text-sm text-ink-faint transition hover:text-ink">Voltar ao quadro</Link>
        </div>
        {error.digest && <p className="text-xs text-ink-faint">Código do erro: <code>{error.digest}</code></p>}
      </div>
    </main>
  );
}
