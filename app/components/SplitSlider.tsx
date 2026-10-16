"use client";

import { projection, split } from "@/lib/chain/math";
import { LIMITS } from "@/lib/chain/program";
import { formatPercent, formatUsd } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { Amount } from "./ui/Amount";

const SNAP_PERCENTS = [0, 5, 10, 15, 20, 25, 30, 40, 50].filter((p) => p * 100 <= LIMITS.maxSaveBps);

/** The centrepiece: moving the slider shows, live, what the family gets and what is saved. */
export function SplitSlider({
  amount,
  saveBps,
  couponBps,
  onChange,
  disabled,
}: {
  amount: bigint;
  saveBps: number;
  /** The chosen bond's rate, for the 12-month illustration; null when no bond is open. */
  couponBps: number | null;
  onChange: (saveBps: number) => void;
  disabled?: boolean;
}) {
  const { t, locale } = useI18n();
  const percent = saveBps / 100;
  const { saved, family } = split(amount, saveBps);
  const nearest = SNAP_PERCENTS.reduce(
    (best, value, index) => (Math.abs(value - percent) < Math.abs(SNAP_PERCENTS[best] - percent) ? index : best),
    0,
  );
  const year = couponBps === null ? null : projection(amount, saveBps, couponBps);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-5 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className="bg-marigold transition-[width] duration-300 ease-out" style={{ width: `${100 - percent}%` }} />
        <div className="bg-root transition-[width] duration-300 ease-out" style={{ width: `${percent}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Amount label={t("send.familyGets")} value={formatUsd(family, locale)} tone="marigold" />
        <Amount label={t("send.youSave")} value={formatUsd(saved, locale)} tone="root" />
      </div>

      <div className="flex items-end gap-3">
        <div className="flex flex-1 flex-col">
          <label htmlFor="share-range" className="text-label font-semibold text-stone">
            {t("send.shareLabel")}
          </label>
          <input
            id="share-range"
            type="range"
            className="split-range"
            min={0}
            max={SNAP_PERCENTS.length - 1}
            step={1}
            value={nearest}
            disabled={disabled}
            aria-valuetext={t("send.sharePercent", { percent: formatPercent(saveBps, locale) })}
            onChange={(event) => onChange(SNAP_PERCENTS[Number(event.target.value)] * 100)}
          />
          <div className="flex justify-between text-label text-stone" aria-hidden="true">
            <span>0%</span>
            <span>{LIMITS.maxSaveBps / 100}%</span>
          </div>
        </div>
        <div className="flex items-center gap-1 pb-6">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={LIMITS.maxSaveBps / 100}
            value={percent}
            disabled={disabled}
            aria-label={t("send.shareLabel")}
            onChange={(event) => {
              const value = Math.round(Number(event.target.value));
              if (Number.isFinite(value)) onChange(Math.min(LIMITS.maxSaveBps, Math.max(0, value * 100)));
            }}
            className="tabular h-12 w-16 rounded-control border border-line bg-surface text-center text-heading font-bold focus:border-root"
          />
          <span className="text-heading font-bold" aria-hidden="true">
            %
          </span>
        </div>
      </div>

      {year && saved > BigInt(0) && (
        <div className="rounded-control bg-root-soft p-3">
          <p className="text-label font-semibold text-root-deep">{t("send.projection.title")}</p>
          <p className="font-semibold">
            {t("send.projection.text", { saved: formatUsd(year.saved, locale), interest: formatUsd(year.interest, locale) })}
          </p>
          <p className="text-label text-stone">{t("send.projection.note")}</p>
        </div>
      )}
    </div>
  );
}
