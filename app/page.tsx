"use client";

import ConnectWallet from "@/components/ConnectWallet";
import LanguageToggle from "@/components/LanguageToggle";
import MintWorkbench from "@/components/MintWorkbench";
import { useI18n } from "@/lib/i18n";

export default function Home() {
  const { t } = useI18n();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-6 md:px-10 md:py-10">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>

      <section className="glass-panel overflow-hidden rounded-[36px]">
        <div className="grid gap-10 px-6 py-8 md:px-10 md:py-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="inline-flex rounded-md border border-[rgba(23,32,51,0.1)] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {t("heroBadge")}
            </div>
            <h1 className="section-title mt-6 max-w-4xl text-5xl font-semibold leading-[0.95] md:text-7xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)] md:text-xl">
              {t("heroDescription")}
            </p>
          </div>

          <div className="rounded-[30px] bg-[#172033] p-6 text-white shadow-[0_24px_80px_rgba(23,32,51,0.2)]">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[#f4b183]">
              {t("howItWorks")}
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>{t("homeStep1")}</p>
              <p>{t("homeStep2")}</p>
              <p>{t("homeStep3")}</p>
            </div>
            <div className="mt-6 rounded-[24px] bg-white/10 p-4 text-sm text-slate-200">
              {t("feeHint")}
            </div>
            <a
              href="/gallery"
              className="mt-4 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#172033]"
            >
              {t("openGallery")}
            </a>
          </div>
        </div>
      </section>

      <ConnectWallet />

      <MintWorkbench />
    </main>
  );
}
