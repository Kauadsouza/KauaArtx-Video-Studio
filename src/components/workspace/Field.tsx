"use client";

import { useRef, useState, useTransition } from "react";
import { updateVideoField, type VideoTextField } from "@/actions/videos";

/**
 * Campo de texto que salva sozinho ao sair (onBlur). Não existe botão "salvar"
 * em lugar nenhum do sistema — some a fricção de anotar.
 */
export function TextField({
  videoId,
  field,
  label,
  hint,
  value,
  rows = 4,
  placeholder,
  mono = false,
}: {
  videoId: string;
  field: VideoTextField | "title";
  label: string;
  hint?: string;
  value: string;
  rows?: number;
  placeholder?: string;
  mono?: boolean;
}) {
  const [pending, start] = useTransition();
  const latest = useRef(value);
  const saved = useRef(value);
  const [error, setError] = useState("");
  const [savedOnce, setSavedOnce] = useState(false);
  function persist(text: string) {
    latest.current = text;
    if (text === saved.current && !error) return;
    setError(""); setSavedOnce(false);
    start(async () => {
      try { await updateVideoField(videoId, field, text); saved.current = text; setSavedOnce(latest.current === text); }
      catch { setError("Não foi salvo. Seu texto continua aqui; tente novamente antes de sair."); }
    });
  }

  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-2">
        <span className="text-sm font-medium text-ink">{label}</span>
        {hint && <span className="text-xs text-ink-faint">{hint}</span>}
        {pending && (
          <span className="ml-auto text-[11px] text-teal">salvando…</span>
        )}
        {!pending && savedOnce && <span className="ml-auto text-[11px] text-teal">salvo</span>}
      </span>

      {rows === 1 ? (
        <input
          defaultValue={value}
          maxLength={field === "title" ? 300 : 30000}
          onChange={e => { latest.current = e.target.value; setSavedOnce(false); }}
          placeholder={placeholder}
          onBlur={(e) => {
            persist(e.target.value);
          }}
          className={`w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm outline-none transition focus:border-teal/50 focus:ring-2 focus:ring-teal/15 ${
            mono ? "font-mono" : ""
          }`}
        />
      ) : (
        <textarea
          defaultValue={value}
          maxLength={30000}
          onChange={e => { latest.current = e.target.value; setSavedOnce(false); }}
          rows={rows}
          placeholder={placeholder}
          onBlur={(e) => {
            persist(e.target.value);
          }}
          className={`w-full resize-y rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm leading-relaxed outline-none transition focus:border-teal/50 focus:ring-2 focus:ring-teal/15 ${
            mono ? "font-mono" : ""
          }`}
        />
      )}
      {error && <span className="mt-2 block text-xs text-rose" role="alert">{error} <button type="button" disabled={pending} className="underline" onClick={()=>persist(latest.current)}>Tentar salvar</button></span>}
    </label>
  );
}

/** Cabeçalho de seção dentro de um painel de etapa. */
export function SectionTitle({
  children,
  hint,
  action,
}: {
  children: React.ReactNode;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <h3 className="text-sm font-semibold text-ink">{children}</h3>
      {hint && <span className="text-xs text-ink-faint">{hint}</span>}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}
