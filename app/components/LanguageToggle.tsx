"use client";

import { LOCALES, useI18n } from "@/lib/i18n";

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div role="group" aria-label={t("lang.label")} className="flex rounded-full border border-line bg-surface p-0.5">
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={locale === option}
          onClick={() => setLocale(option)}
          className={`min-h-[40px] min-w-[44px] rounded-full px-3 text-label font-bold transition-colors ${
            locale === option ? "bg-root text-white" : "text-stone hover:text-ink"
          }`}
        >
          {t(option === "en" ? "lang.en" : "lang.ne")}
        </button>
      ))}
    </div>
  );
}
