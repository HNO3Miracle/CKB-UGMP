"use client";

import { useI18n } from "@/lib/i18n";

export default function LanguageToggle() {
  const { language, toggleLanguage, t } = useI18n();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:border-[var(--accent)]"
      aria-label={language === "zh" ? "Switch to English" : "切换到中文"}
    >
      {t("languageSwitch")}
    </button>
  );
}
