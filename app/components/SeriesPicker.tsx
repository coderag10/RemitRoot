"use client";

import { isOpen, type Series } from "@/lib/chain/program";
import { formatDate, formatPercent } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

/** Which bond the savings go into. Only open series can be chosen. */
export function SeriesPicker({
  series,
  selected,
  onSelect,
  now,
}: {
  series: Series[];
  selected: Series | null;
  onSelect: (series: Series) => void;
  now: number;
}) {
  const { t, locale } = useI18n();
  const open = series.filter((s) => isOpen(s, now));
  if (open.length === 0) return <p className="text-label text-stone">{t("send.series.none")}</p>;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-label font-semibold text-stone">{t("send.series.title")}</legend>
      {[...open].reverse().map((s) => {
        const checked = selected?.address.equals(s.address) ?? false;
        return (
          <label
            key={s.address.toBase58()}
            className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-control border px-3 py-2 ${
              checked ? "border-root bg-root-soft" : "border-line bg-surface hover:border-root/50"
            }`}
          >
            <input
              type="radio"
              name="series"
              className="h-5 w-5 accent-[var(--color-root)]"
              checked={checked}
              onChange={() => onSelect(s)}
            />
            <span className="min-w-0">
              <span className="block font-semibold">{s.name}</span>
              <span className="block text-label text-stone">
                {t("send.series.terms", { rate: formatPercent(s.couponBps, locale), date: formatDate(s.maturityTs, locale) })}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
