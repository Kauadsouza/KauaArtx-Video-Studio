import type { MetadataRoute } from "next";

/** Ferramenta pessoal: nenhum buscador deve indexar nada aqui. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
