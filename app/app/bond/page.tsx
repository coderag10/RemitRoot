"use client";

import { BondCard } from "@/components/Bond";
import { Card, PageTitle } from "@/components/ui/Card";
import { EmptyState, ErrorNotice, Skeleton } from "@/components/ui/States";
import { errorKey } from "@/lib/chain/errors";
import { useI18n } from "@/lib/i18n";
import { useAllSeries, useNow } from "@/lib/queries";

export default function BondsPage() {
  const { t } = useI18n();
  const now = useNow();
  const series = useAllSeries();
  return (
    <>
      <PageTitle lead={t("bonds.lead")}>{t("bonds.title")}</PageTitle>
      {series.isLoading ? (
        <Card>
          <Skeleton lines={5} />
        </Card>
      ) : series.error && !series.data ? (
        <ErrorNotice message={t(errorKey(series.error))} onRetry={() => void series.refetch()} />
      ) : !series.data?.length ? (
        <EmptyState icon="bond">{t("bonds.empty")}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {[...series.data].reverse().map((s) => (
            <li key={s.address.toBase58()}>
              <BondCard series={s} now={now} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-label text-stone">{t("bond.testNote")}</p>
    </>
  );
}
