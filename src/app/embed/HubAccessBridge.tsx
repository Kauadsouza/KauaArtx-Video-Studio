"use client";

import { useEffect, useState } from "react";

const hubOrigins = [
  process.env.NEXT_PUBLIC_HUB_ORIGIN ?? "https://artx-hub.vercel.app",
  "http://localhost:3030",
];

export default function HubAccessBridge() {
  const [status, setStatus] = useState("Confirmando acesso pelo ARTX Hub...");

  useEffect(() => {
    if (window.parent === window) {
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
      <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-teal/10 text-xl text-teal ring-1 ring-teal/25">🎬</span>
      <p className="text-xs font-semibold tracking-[0.16em] text-teal">ARTX HUB</p>
      <h1 className="mt-2 text-lg font-semibold text-ink">KauaArtx Video Studio</h1>
      <p className="mt-2 text-sm leading-6 text-ink-dim">{status}</p>
    </div>
  </main>;
}
