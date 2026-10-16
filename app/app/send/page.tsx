"use client";

import { useState } from "react";
import { ActivityList } from "@/components/ActivityList";
import { OnboardCard } from "@/components/Onboarding";
import { SavingsCard } from "@/components/SavingsCard";
import { Amount } from "@/components/ui/Amount";
import { Button, TextLink } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState, ErrorNotice, Notice, Skeleton } from "@/components/ui/States";
import { errorKey } from "@/lib/chain/errors";
import { formatUsd } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useActivity, useAllSeries, useConfig, useNow, useRefreshChain, useWorker } from "@/lib/queries";
import { requestFaucet, useSession, type Session } from "@/lib/session";
import { SendForm } from "./SendForm";

// Below this, a wallet cannot pay for the accounts a first transfer creates.
const LOW_SOL_LAMPORTS = 4_000_000;

function Balance({ session, balance, lamports }: { session: Session; balance: bigint; lamports: number }) {
  const { t, locale } = useI18n();
  const refresh = useRefreshChain();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function topUp() {
    setBusy(true);
    setError(null);
    try {
      await requestFaucet(session.publicKey, session.demoFamily);
      await refresh();
    } catch (cause) {
      setError(t(errorKey(cause)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Amount label={t("send.balance")} value={formatUsd(balance, locale)} />
        <Button variant="secondary" full={false} loading={busy} onClick={topUp} className="shrink-0 whitespace-nowrap px-4 text-label">
          {busy ? t("send.gettingTestDollars") : t("send.getTestDollars")}
        </Button>
      </div>
      {lamports < LOW_SOL_LAMPORTS && <p className="text-label text-marigold-deep">{t("send.lowSol")}</p>}
      {error && <ErrorNotice message={error} onRetry={topUp} />}
    </Card>
  );
}

function SendFlow({ session }: { session: Session }) {
  const { t } = useI18n();
  const now = useNow();
  const config = useConfig();
  const series = useAllSeries();
  const worker = useWorker(session.publicKey);
  const activity = useActivity(session.publicKey, 10);
  const [perTransfer, setPerTransfer] = useState<bigint | undefined>(undefined);

  const failed = config.error ?? series.error ?? worker.error;
  if (failed && !(config.data && series.data && worker.data)) {
    return (
      <ErrorNotice
        message={t(errorKey(failed))}
        onRetry={() => {
          void config.refetch();
          void series.refetch();
          void worker.refetch();
        }}
      />
    );
  }
  if (config.data === null) return <ErrorNotice message={t("error.notSetUp")} />;
  if (!config.data || !series.data || !worker.data) {
    return (
      <>
        <Card>
          <Skeleton lines={2} />
        </Card>
        <Card>
          <Skeleton lines={7} />
        </Card>
      </>
    );
  }

  const { rule, positions, balance, lamports } = worker.data;
  return (
    <>
      {config.data.paused && <Notice>{t("send.paused")}</Notice>}
      <Balance session={session} balance={balance} lamports={lamports} />
      <SendForm
        session={session}
        config={config.data}
        series={series.data}
        rule={rule}
        balance={balance}
        now={now}
        onAmountChange={setPerTransfer}
      />
      <SavingsCard
        session={session}
        config={config.data}
        series={series.data}
        positions={positions}
        rule={rule}
        now={now}
        perTransfer={perTransfer}
      />
      <Card labelledBy="recent-title">
        <CardTitle id="recent-title" action={<TextLink href="/history">{t("history.seeAll")}</TextLink>}>
          {t("history.recent")}
        </CardTitle>
        {activity.isLoading ? (
          <Skeleton lines={3} />
        ) : activity.data && activity.data.some((item) => item.kind !== "withdrawn" && item.kind !== "repaid") ? (
          <ActivityList items={activity.data} perspective="worker" limit={3} />
        ) : (
          <EmptyState icon="history">{t("history.empty")}</EmptyState>
        )}
      </Card>
    </>
  );
}

export default function SendPage() {
  const { session } = useSession();
  if (!session) return <OnboardCard />;
  // A different wallet starts from a clean form.
  return <SendFlow key={session.publicKey.toBase58()} session={session} />;
}
