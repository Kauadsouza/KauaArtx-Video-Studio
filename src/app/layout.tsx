import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Produção · KauaArtx",
  description: "Sistema de gestão de produção de vídeos do canal KauaArtx",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
