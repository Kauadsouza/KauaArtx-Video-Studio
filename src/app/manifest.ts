import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ARTX Video Studio",
    short_name: "ARTX Studio",
    description: "Produção de vídeos do canal KauaArtx.",
    start_url: "/",
    display: "standalone",
    background_color: "#051f20",
    theme_color: "#071d1b",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
