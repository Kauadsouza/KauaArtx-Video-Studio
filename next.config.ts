import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança aplicados a todas as rotas.
 *
 * Como é uma ferramenta pessoal exposta numa URL pública, o objetivo é reduzir
 * a superfície: não ser indexado, não ser embutido em iframe de terceiros e
 * não vazar a URL via Referer.
 */
const securityHeaders = [
  // Fora do Google e afins — é ferramenta privada, não conteúdo público.
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  // Impede que o app seja embutido em iframe (clickjacking).
  { key: "Content-Security-Policy", value: "frame-ancestors https://artx-hub.vercel.app" },
  // Navegador não tenta adivinhar o tipo do conteúdo.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Não manda a URL do app pra sites externos.
  { key: "Referrer-Policy", value: "no-referrer" },
  // Nenhuma API sensível do navegador é usada por este app.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Força HTTPS nas próximas visitas.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Não anuncia "X-Powered-By: Next.js".
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
