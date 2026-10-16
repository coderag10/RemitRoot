"use client";

import Link from "next/link";
import type { ProceedsRecord, Series } from "@/lib/chain/program";
import { explorerAddress } from "@/lib/env";
import { formatDate, formatNumber, formatPercent, formatUsd, formatUsdWhole } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { Pill, Progress } from "./ui/Amount";
import { Icon } from "./ui/Icon";

export function bondStatus(series: Series, now: number): "open" | "matured" | "full" {
  if (now >= series.maturityTs) return "matured";
  if (series.totalPrincipal >= series.cap) return "full";
  return "open";
}

export function StatusPill({ series, now }: { series: Series; now: number }) {
  const { t } = useI18n();
  const status = bondStatus(series, now);
  return (
    <Pill tone={status === "open" ? "root" : status === "matured" ? "marigold" : "stone"}>
      {t(status === "open" ? "bond.status.open" : status === "matured" ? "bond.status.matured" : "bond.status.full")}
    </Pill>
  );
}

/** A series in the bond list: terms, status and how much it has raised. */
export function BondCard({ series, now }: { series: Series; now: number }) {
  const { t, locale } = useI18n();
  const matured = now >= series.maturityTs;
  const raised = t("bond.raised", { raised: formatUsd(series.totalPrincipal, locale), cap: formatUsdWhole(series.cap, locale) });
  return (
    <Link
      href={`/bond/${series.id}`}
      className="group flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card transition-colors hover:border-root/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-heading font-semibold text-root-deep">{series.name}</p>
          <p className="text-label text-stone">
            {t("bond.rate", { rate: formatPercent(series.couponBps, locale) })} ·{" "}
            {t(matured ? "bond.maturedOn" : "bond.matures", { date: formatDate(series.maturityTs, locale) })}
          </p>
        </div>
        <StatusPill series={series} now={now} />
      </div>
      <Progress value={series.totalPrincipal} max={series.cap} label={raised} />
      <div className="flex items-center justify-between text-label">
        <span className="tabular font-semibold">{raised}</span>
        <span className="flex items-center gap-1 text-stone">
          {formatNumber(series.saverCount, locale)} {t("bond.savers")}
          <Icon name="chevron" size={16} className="text-root transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/** Vault balance against what is owed to savers today, so anyone can judge solvency. */
export function SolvencyMeter({ vault, owed }: { vault: bigint; owed: bigint }) {
  const { t, locale } = useI18n();
  const covered = vault >= owed;
  const gap = owed - vault;
  const scale = vault > owed ? vault : owed;
  const percent = (value: bigint) => (scale > BigInt(0) ? Number((value * BigInt(1000)) / scale) / 10 : 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2" aria-hidden="true">
        <div className="h-4 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-root transition-[width] duration-500" style={{ width: `${percent(vault)}%` }} />
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-ink/70 transition-[width] duration-500" style={{ width: `${percent(owed)}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="border-l-4 border-root pl-3">
          <p className="text-label font-medium text-stone">{t("bond.vault")}</p>
          <p className="tabular text-heading font-bold">{formatUsd(vault, locale)}</p>
        </div>
        <div className="border-l-4 border-ink/70 pl-3">
          <p className="text-label font-medium text-stone">{t("bond.owed")}</p>
          <p className="tabular text-heading font-bold">{formatUsd(owed, locale)}</p>
        </div>
      </div>
      <p className="text-label text-stone">{t("bond.owedNote")}</p>
      <p className={`flex gap-2 font-semibold ${covered ? "text-leaf" : "text-brick"}`}>
        <Icon name={covered ? "shield" : "alert"} className="mt-1 shrink-0" />
        {covered ? t("bond.solvency.covered") : t("bond.solvency.short", { gap: formatUsd(gap, locale) })}
      </p>
    </div>
  );
}

/** The issuer's recorded uses of funds, each linked to its record on the explorer. */
export function ProceedsList({ records }: { records: ProceedsRecord[] }) {
  const { locale } = useI18n();
  return (
    <ul className="flex flex-col divide-y divide-line">
      {records.map((record) => (
        <li key={record.address.toBase58()} className="flex items-start gap-3 py-3">
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper text-root">
            <Icon name="issuer" size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold">{record.purpose}</p>
              <p className="tabular shrink-0 font-bold">{formatUsd(record.amount, locale)}</p>
            </div>
            <a
              href={explorerAddress(record.address)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[40px] items-center gap-1 text-label text-root underline"
            >
              {formatDate(record.ts, locale, true)}
              <Icon name="external" size={14} />
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
