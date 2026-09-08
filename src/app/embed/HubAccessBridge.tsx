"use client";

import { useEffect, useState } from "react";
import { useI18n, LanguageSwitch } from "@/components/I18n";

const hubOrigins = [
  process.env.NEXT_PUBLIC_HUB_ORIGIN ?? "https://artx-hub.vercel.app",
  "http://localhost:3030",
];

export default function HubAccessBridge() {
  const { t } = useI18n();
  const [status, setStatus] = useState("Confirmando acesso pelo ARTX Hub...");
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    if (window.parent === window) {
      setStandalone(true);
      setStatus("Abra este sistema pelo ARTX Hub para acessar sua produção de vídeos.");
      return;
    }

    function announceReady() {
      for (const origin of hubOrigins) {
        window.parent.postMessage({ type: "ARTX_VIDEO_EMBED_READY" }, origin);
      }
    }

    async function receiveHubSession(event: MessageEvent) {
      if (event.source !== window.parent || !hubOrigins.includes(event.origin) || event.data?.type !== "ARTX_HUB_AUTH") return;
      const accessToken = event.data.accessToken;
      if (typeof accessToken !== "string") return;

      setStatus("Abrindo seu estúdio de produção...");
      const response = await fetch("/api/auth/hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });

      if (!response.ok) {
        setStatus("Não foi possível validar o acesso pelo Hub. Atualize esta aba e tente novamente.");
        return;
      }
      window.location.replace("/");
    }

    window.addEventListener("message", receiveHubSession);
    announceReady();
    return () => window.removeEventListener("message", receiveHubSession);
  }, []);

  return <main className="flex min-h-screen items-center justify-center bg-abyss p-8 text-center">
    <div className="max-w-sm rounded-2xl border border-line bg-surface p-7 shadow-2xl shadow-black/30">
      <img className="mx-auto mb-4 h-12 w-12 rounded-xl" src="/icon.svg" alt="" />
      <p className="text-xs font-semibold tracking-[0.16em] text-teal">ARTX HUB</p>
      <h1 className="mt-2 text-lg font-semibold text-ink">KauaArtx Video Studio</h1>
      <p className="mt-2 text-sm leading-6 text-ink-dim">{t(status)}</p>
      {standalone && <a className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-teal px-5 py-3 text-sm font-semibold text-abyss" href="/login">Entrar ou criar conta</a>}
      <div className="mt-5"><LanguageSwitch /></div>
    </div>
  </main>;
}
