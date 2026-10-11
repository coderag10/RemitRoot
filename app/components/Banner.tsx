import { t } from "@/lib/i18n";

/** The prototype notice. It is on every screen and cannot be dismissed. */
export function Banner() {
  return (
    <div role="note" className="bg-sand px-4 py-2 text-center text-label font-medium text-ink">
      {t("banner")}
    </div>
  );
}
