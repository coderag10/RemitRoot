"use client";

import { MAX_SAVE_BPS } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import { t } from "@/lib/i18n";
import { split } from "@/lib/program";
import { Amount } from "./ui";

const SNAP_PERCENTS = [0, 5, 10, 15, 20, 25, 30, 40, 50];

/** The centrepiece: moving the slider shows live what the family gets and what is saved. */
export function SplitSlider({
  amount,
  saveBps,
  couponBps,
  onChange,
}: {
  amount: bigint;
  saveBps: number;
  couponBps: number;
  onChange: (saveBps: number) => void;
}) {
  const percent = saveBps / 100;
  const { saved, family } = split(amount, saveBps);
  const nearestSnap = SNAP_PERCENTS.reduce(
    (best, value, index) => (Math.abs(value - percent) < Math.abs(SNAP_PERCENTS[best] - percent) ? index : best),
    0,
  );
  // Twelve monthly transfers; each earns simple interest for the months it has been held.
  const yearSaved = saved * BigInt(12);
  const yearInterest = (yearSaved * BigInt(couponBps)) / BigInt(20_000);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-4 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className="bg-marigold" style={{ width: `${100 - percent}%` }} />
        <div className="bg-root" style={{ width: `${percent}%` }} />
      </div>

      <div className="flex items-end gap-3">
        <label className="flex flex-1 flex-col gap-1 text-label font-medium text-stone">
          {t("send.shareLabel")}
          <input
            type="range"
            min={0}
            max={SNAP_PERCENTS.length - 1}
            step={1}
            value={nearestSnap}
            aria-valuetext={t("send.sharePercent", { percent })}
            onChange={(event) => onChange(SNAP_PERCENTS[Number(event.target.value)] * 100)}
            className="h-12 w-full"
          />
        </label>
        <label className="flex items-center gap-1 text-heading font-bold">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_SAVE_BPS / 100}
            value={percent}
            aria-label={t("send.shareLabel")}
            onChange={(event) => {
              const value = Math.round(Number(event.target.value));
              if (Number.isFinite(value)) onChange(Math.min(MAX_SAVE_BPS, Math.max(0, value * 100)));
            }}
            className="h-12 w-16 rounded-control border border-line bg-surface text-center tabular-nums"
          />
          %
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Amount label={t("send.familyGets")} value={formatUsd(family)} tone="marigold" />
        <Amount label={t("send.youSave")} value={formatUsd(saved)} tone="root" />
      </div>

      <p className="text-label text-stone">
        <span className="font-medium text-ink">{t("send.projection.title")}</span>{" "}
        {t("send.projection.text", { saved: formatUsd(yearSaved), interest: formatUsd(yearInterest) })}
        <br />
        {t("send.projection.note")}
      </p>
    </div>
  );
}
