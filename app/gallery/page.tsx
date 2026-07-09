"use client";

import DobGallery from "@/components/DobGallery";
import ConnectWallet from "@/components/ConnectWallet";
import LanguageToggle from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n";

export default function GalleryPage() {
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
              {t("galleryBadge")}
            </div>
            <h1 className="section-title mt-6 max-w-4xl text-5xl font-semibold leading-[0.95] md:text-7xl">
              {t("galleryTitle")}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)] md:text-xl">
              {t("galleryDescription")}
            </p>
          </div>

          <div className="rounded-[30px] bg-[#172033] p-6 text-white shadow-[0_24px_80px_rgba(23,32,51,0.2)]">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[#f4b183]">
              {t("collection")}
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>{t("galleryStep1")}</p>
              <p>{t("galleryStep2")}</p>
              <p>{t("galleryStep3")}</p>
            </div>
            <div className="mt-6 rounded-[24px] bg-white/10 p-4 text-sm text-slate-200">
              {t("galleryNote")}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <ConnectWallet />
        <section className="glass-panel rounded-[32px] p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            {t("entry")}
          </p>
          <h2 className="section-title mt-3 text-3xl font-semibold md:text-4xl">{t("assetEntry")}</h2>
          <div className="mt-6 grid gap-4 text-sm leading-7 text-[var(--muted)]">
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] px-5 py-4">
              {t("entryHome")}
            </div>
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] px-5 py-4">
              {t("entryGallery")}
            </div>
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] px-5 py-4">
              {t("entryFuture")}
            </div>
          </div>
        </section>
      </div>

      <DobGallery />
    </main>
  );
}
