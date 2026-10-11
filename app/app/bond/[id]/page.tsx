"use client";

import { useParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { Amount, Card, ErrorNotice, Skeleton } from "@/components/ui";
import { explorerAddress } from "@/lib/config";
import { errorText } from "@/lib/errors";
import { formatDate, formatUsd } from "@/lib/format";
import { useLoad, useNow } from "@/lib/hooks";
import { t } from "@/lib/i18n";
import { fetchBondState } from "@/lib/program";

function Bond() {
  const { id } = useParams<{ id: string }>();
  const now = useNow(30_000);
  const load = useCallback(
    async () => (/^\d+$/.test(id) ? fetchBondState(Number(id), Math.floor(Date.now() / 1000)) : null),
    [id],
  );
  const { data, error, loading, reload } = useLoad(load);

  if (loading && !data) {
    return (
      <Card>
        <Skeleton lines={6} />
      </Card>
    );
  }
  if (!data) {
    return <ErrorNotice message={error ? errorText(error) : t("bond.notFound")} onRetry={error ? reload : undefined} />;
  }

  const { series, vault, proceeds, owed } = data;
  const matured = now >= series.maturityTs;
  const raisedPercent = series.cap > BigInt(0) ? Number((series.totalPrincipal * BigInt(100)) / series.cap) : 0;

  return (
    <>
      <div>
        <h1 className="text-title font-bold text-root-deep">{series.name}</h1>
        <p className="text-stone">
          {t("bond.rate", { rate: series.couponBps / 100 })} ·{" "}
          {t(matured ? "bond.maturedOn" : "bond.matures", { date: formatDate(series.maturityTs) })}
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-semibold">
            {t("bond.raised", { raised: formatUsd(series.totalPrincipal), cap: formatUsd(series.cap) })}
          </p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={raisedPercent}
            className="h-4 overflow-hidden rounded-full bg-line"
          >
            <div className="h-full bg-root" style={{ width: `${Math.min(100, raisedPercent)}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Amount label={t("bond.savers")} value={String(series.saverCount)} />
          <Amount label={t("bond.used")} value={formatUsd(series.totalWithdrawn)} />
          <Amount label={t("bond.vault")} value={formatUsd(vault)} tone="root" />
          <Amount label={t("bond.owed")} value={formatUsd(owed)} />
        </div>
        <p className="text-label text-stone">{t("bond.owedNote")}</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-heading font-semibold text-root-deep">{t("bond.proceeds.title")}</h2>
        {proceeds.length === 0 ? (
          <p className="text-stone">{t("bond.proceeds.empty")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {proceeds.map((record) => (
              <li key={record.index} className="flex flex-col py-2">
                <span className="flex justify-between gap-3">
                  <span className="font-semibold">{record.purpose}</span>
                  <span className="font-bold tabular-nums">{formatUsd(record.amount)}</span>
                </span>
                <a
                  href={explorerAddress(record.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-[48px] items-center text-label text-root underline"
                >
                  {formatDate(record.ts)}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <a
        href={explorerAddress(series.address)}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-[48px] items-center font-semibold text-root underline"
      >
        {t("bond.verify")}
      </a>
      <p className="text-label text-stone">{t("bond.testNote")}</p>
    </>
  );
}

export default function BondPage() {
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <Bond />
    </Suspense>
  );
}
