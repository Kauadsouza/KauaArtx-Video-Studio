import Link from "next/link";
import { useI18n } from "./I18n";

export default function SetupNotice({ message }: { message: string }) {
  const { t } = useI18n();
  return <main className="mx-auto max-w-xl p-10"><div className="rounded-2xl border border-line bg-surface p-8"><p className="text-xs tracking-widest text-teal">{t("ESTÚDIO KAUAARTX")}</p><h1 className="mt-3 text-2xl font-semibold text-ink">{t("Seu estúdio está temporariamente indisponível.")}</h1><p className="mt-4 text-sm leading-7 text-ink-dim">{message || "Não foi possível carregar seus vídeos. Tente novamente em alguns instantes. Nenhuma alteração foi enviada."}</p><Link href="/" className="mt-6 inline-block rounded-lg bg-teal px-5 py-3 text-abyss">{t("Tentar novamente")}</Link></div></main>;
}
