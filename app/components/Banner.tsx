"use client";

import { useI18n } from "@/lib/i18n";

/** The prototype notice. It is on every screen and cannot be dismissed. */
export function Banner() {
  const { t } = useI18n();
  return (
    <div role="note" className="bg-sand px-4 py-2 text-center text-label font-semibold text-ink">
      {t("banner")}
    </div>
  );
}
