import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/components/I18n";

export const metadata: Metadata = {
  title: "Produção · KauaArtx",
  description: "Sistema de gestão de produção de vídeos do canal KauaArtx",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased"><I18nProvider>{children}</I18nProvider></body>
    </html>
  );
}
