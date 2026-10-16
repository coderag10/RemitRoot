"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { ActivityList } from "@/components/ActivityList";
import { ProceedsList, SolvencyMeter, StatusPill } from "@/components/Bond";
import { Amount, Progress } from "@/components/ui/Amount";
import { TextLink } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState, ErrorNotice, Skeleton } from "@/components/ui/States";
import { errorKey } from "@/lib/chain/errors";
import { explorerAddress } from "@/lib/env";
import { formatDate, formatNumber, formatPercent, formatUsd, formatUsdWhole, shortAddress } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { owedNow, useActivity, useBond, useNow } from "@/lib/queries";

function Bond() {
  const { t, locale } = useI18n();
  const { id } = useParams<{ id: string }>();
  const seriesId = /^\d+$/.test(id) ? Number(id) : null;
  const now = useNow();
  const bond = useBond(seriesId);
  const activity = useActivity(bond.data?.series.address ?? null, 25);

  if (seriesId === null || bond.data === null) return <ErrorNotice message={t("bond.notFound")} />;
  if (bond.error && !bond.data) return <ErrorNotice message={t(errorKey(bond.error))} onRetry={() => void bond.refetch()} />;
  if (!bond.data) {
    return (
      <Card>
        <Skeleton lines={8} />
      </Card>
    );
  }

  const { series, vault, proceeds, positions } = bond.data;
  const matured = now >= series.maturityTs;
  const owed = owedNow(positions, series, now);

  return (
    <>
      <TextLink href="/bond" className="-mb-3 self-start">
        ← {t("bond.back")}
      </TextLink>
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-title font-bold leading-tight text-root-deep">{series.name}</h1>
          <StatusPill series={series} now={now} />
        </div>
        <p className="text-stone">
          {t("bond.rate", { rate: formatPercent(series.couponBps, locale) })} ·{" "}
          {t(matured ? "bond.maturedOn" : "bond.matures", { date: formatDate(series.maturityTs, locale) })}
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="tabular font-semibold">
            {t("bond.raised", { raised: formatUsd(series.totalPrincipal, locale), cap: formatUsdWhole(series.cap, locale) })}
          </p>
          <Progress value={series.totalPrincipal} max={series.cap} label={t("bond.raised", { raised: formatUsd(series.totalPrincipal, locale), cap: formatUsdWhole(series.cap, locale) })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Amount label={t("bond.savers")} value={formatNumber(series.saverCount, locale)} />
          <Amount label={t("bond.used")} value={formatUsd(series.totalWithdrawn, locale)} />
          <Amount label={t("bond.repaid")} value={formatUsd(series.totalRepaid, locale)} />
          <Amount label={t("bond.interestPaid")} value={formatUsd(series.interestPaid, locale)} />
        </div>
      </Card>

      <Card labelledBy="solvency-title">
        <CardTitle id="solvency-title">{t("bond.solvency.title")}</CardTitle>
        <SolvencyMeter vault={vault} owed={owed} />
      </Card>

      <Card labelledBy="proceeds-title">
        <CardTitle id="proceeds-title">{t("bond.proceeds.title")}</CardTitle>
        {proceeds.length === 0 ? <EmptyState icon="issuer">{t("bond.proceeds.empty")}</EmptyState> : <ProceedsList records={proceeds} />}
      </Card>

      {activity.data?.some((item) => item.kind === "repaid" || item.kind === "redeemed" || item.kind === "withdrawn") && (
        <Card labelledBy="bond-activity">
          <CardTitle id="bond-activity">{t("history.recent")}</CardTitle>
          <ActivityList items={activity.data} perspective="bond" limit={8} />
        </Card>
      )}

      <div className="flex flex-col">
        <p className="tabular text-label text-stone">{t("bond.issuer", { address: shortAddress(series.issuer) })}</p>
        <TextLink href={explorerAddress(series.address)} external>
          {t("bond.verify")}
        </TextLink>
        <p className="text-label text-stone">{t("bond.testNote")}</p>
      </div>
    </>
  );
}

export default function BondPage() {
  return (
    <Suspense fallback={<Skeleton lines={8} />}>
      <Bond />
    </Suspense>
  );
}
