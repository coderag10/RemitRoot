"use client";

import { useState } from "react";
import { SolvencyMeter } from "@/components/Bond";
import { ConnectButton } from "@/components/Onboarding";
import { Amount } from "@/components/ui/Amount";
import { Button, TextLink } from "@/components/ui/Button";
import { Card, CardTitle, PageTitle } from "@/components/ui/Card";
import { Field, MoneyInput, TextInput } from "@/components/ui/Field";
import { ErrorNotice, Notice, Skeleton } from "@/components/ui/States";
import { errorKey } from "@/lib/chain/errors";
import { LIMITS, type Config, type Series } from "@/lib/chain/program";
import { buildRepay, buildSetPaused, buildWithdraw } from "@/lib/chain/transactions";
import { formatUsd, parseUsd, shortAddress, unitsToInput } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { owedNow, useAllSeries, useBond, useConfig, useNow, useWorker } from "@/lib/queries";
import { useSession, type Session } from "@/lib/session";
import { useTransaction } from "@/lib/tx";

function WithdrawForm({ session, config, series, vault }: { session: Session; config: Config; series: Series; vault: bigint }) {
  const { t, locale } = useI18n();
  const { run, busy } = useTransaction();
  const [amountText, setAmountText] = useState("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState<string | null>(null);
  const amount = parseUsd(amountText);
  const purposeLength = new TextEncoder().encode(purpose.trim()).length;
  const tooMuch = amount !== null && amount > vault;
  const ready = amount !== null && !tooMuch && purposeLength > 0 && purposeLength <= LIMITS.maxPurposeLength;

  async function submit() {
    if (!ready || amount === null) return;
    setError(null);
    const result = await run("issuer.withdraw.done", () => buildWithdraw(config, session.publicKey, series, amount, purpose.trim()), {
      amount: formatUsd(amount, locale),
      purpose: purpose.trim(),
    });
    if (result.ok) {
      setAmountText("");
      setPurpose("");
    } else setError(t(result.error));
  }

  return (
    <Card labelledBy="withdraw-title">
      <CardTitle id="withdraw-title">{t("issuer.withdraw.title")}</CardTitle>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Field id="withdraw-amount" label={t("issuer.withdraw.amount")} error={tooMuch ? t("issuer.withdraw.tooMuch", { vault: formatUsd(vault, locale) }) : undefined}>
          <MoneyInput id="withdraw-amount" value={amountText} invalid={tooMuch} onChange={(e) => setAmountText(e.target.value)} />
        </Field>
        <Field
          id="withdraw-purpose"
          label={t("issuer.withdraw.purpose")}
          hint={t("issuer.withdraw.count", { count: purposeLength, max: LIMITS.maxPurposeLength })}
          error={purposeLength > LIMITS.maxPurposeLength ? t("error.InvalidPurpose") : undefined}
        >
          <TextInput
            id="withdraw-purpose"
            value={purpose}
            placeholder={t("issuer.withdraw.purposePlaceholder")}
            invalid={purposeLength > LIMITS.maxPurposeLength}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </Field>
        {amount !== null && purposeLength === 0 && <p className="text-label text-stone">{t("issuer.withdraw.needPurpose")}</p>}
        {error && <ErrorNotice message={error} />}
        <Button type="submit" loading={busy} disabled={!ready} icon="issuer">
          {t("issuer.withdraw.button", { amount: formatUsd(amount ?? BigInt(0), locale) })}
        </Button>
      </form>
    </Card>
  );
}

function RepayForm({ session, config, series, gap }: { session: Session; config: Config; series: Series; gap: bigint }) {
  const { t, locale } = useI18n();
  const { run, busy } = useTransaction();
  const own = useWorker(session.publicKey);
  const [amountText, setAmountText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const amount = parseUsd(amountText);
  const balance = own.data?.balance ?? BigInt(0);
  const tooMuch = amount !== null && amount > balance;

  async function submit() {
    if (amount === null || tooMuch) return;
    setError(null);
    const result = await run("issuer.repay.done", () => buildRepay(config, session.publicKey, series, amount), { amount: formatUsd(amount, locale) });
    if (result.ok) setAmountText("");
    else setError(t(result.error));
  }

  return (
    <Card labelledBy="repay-title">
      <CardTitle id="repay-title">{t("issuer.repay.title")}</CardTitle>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {gap > BigInt(0) ? (
          <button type="button" onClick={() => setAmountText(unitsToInput(gap))} className="self-start text-left font-semibold text-root underline">
            {t("issuer.repay.suggest", { gap: formatUsd(gap, locale) })}
          </button>
        ) : (
          <p className="text-label text-leaf">{t("issuer.repay.covered")}</p>
        )}
        <Field
          id="repay-amount"
          label={t("issuer.repay.amount")}
          hint={t("issuer.repay.balance", { balance: formatUsd(balance, locale) })}
          error={tooMuch ? t("send.notEnough", { balance: formatUsd(balance, locale) }) : undefined}
        >
          <MoneyInput id="repay-amount" value={amountText} invalid={tooMuch} onChange={(e) => setAmountText(e.target.value)} />
        </Field>
        {error && <ErrorNotice message={error} />}
        <Button type="submit" variant="secondary" loading={busy} disabled={amount === null || tooMuch} icon="shield">
          {t("issuer.repay.button", { amount: formatUsd(amount ?? BigInt(0), locale) })}
        </Button>
      </form>
    </Card>
  );
}

function SeriesDesk({ session, config, series }: { session: Session; config: Config; series: Series }) {
  const { t, locale } = useI18n();
  const now = useNow();
  const bond = useBond(series.id);
  if (!bond.data) {
    return (
      <Card>
        <Skeleton lines={5} />
      </Card>
    );
  }
  const owed = owedNow(bond.data.positions, bond.data.series, now);
  const gap = owed > bond.data.vault ? owed - bond.data.vault : BigInt(0);
  return (
    <>
      <Card className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Amount label={t("issuer.raised")} value={formatUsd(bond.data.series.totalPrincipal, locale)} />
          <Amount label={t("bond.used")} value={formatUsd(bond.data.series.totalWithdrawn, locale)} />
        </div>
        <SolvencyMeter vault={bond.data.vault} owed={owed} />
        <TextLink href={`/bond/${series.id}`}>{t("landing.seeBonds")}</TextLink>
      </Card>
      <WithdrawForm session={session} config={config} series={bond.data.series} vault={bond.data.vault} />
      <RepayForm session={session} config={config} series={bond.data.series} gap={gap} />
    </>
  );
}

function AdminPanel({ config }: { config: Config }) {
  const { t } = useI18n();
  const { run, busy } = useTransaction();
  const { session } = useSession();
  const [error, setError] = useState<string | null>(null);
  if (!session) return null;
  async function toggle() {
    setError(null);
    const next = !config.paused;
    const result = await run(next ? "issuer.admin.pause" : "issuer.admin.unpause", () => buildSetPaused(session!.publicKey, next));
    if (!result.ok) setError(t(result.error));
  }
  return (
    <Card tone={config.paused ? "marigold" : "plain"} labelledBy="admin-title">
      <CardTitle id="admin-title" action={<span className="font-semibold">{t(config.paused ? "issuer.admin.paused" : "issuer.admin.running")}</span>}>
        {t("issuer.admin.title")}
      </CardTitle>
      <p className="mb-4 text-label text-stone">{t("issuer.admin.text")}</p>
      {error && <ErrorNotice message={error} />}
      <Button variant={config.paused ? "primary" : "danger"} loading={busy} onClick={toggle} icon={config.paused ? "play" : "pause"}>
        {t(config.paused ? "issuer.admin.unpause" : "issuer.admin.pause")}
      </Button>
    </Card>
  );
}

export default function IssuerPage() {
  const { t } = useI18n();
  const { session } = useSession();
  const config = useConfig();
  const allSeries = useAllSeries();
  const [chosen, setChosen] = useState<number | null>(null);

  const header = <PageTitle lead={t("issuer.lead")}>{t("issuer.title")}</PageTitle>;
  if (config.error && !config.data) return <>{header}<ErrorNotice message={t(errorKey(config.error))} onRetry={() => void config.refetch()} /></>;
  if (config.data === null) return <>{header}<ErrorNotice message={t("error.notSetUp")} /></>;
  if (!config.data || !allSeries.data) {
    return (
      <>
        {header}
        <Card>
          <Skeleton lines={5} />
        </Card>
      </>
    );
  }

  const isAdmin = session !== null && session.publicKey.equals(config.data.admin);
  const mine = session ? allSeries.data.filter((s) => s.issuer.equals(session.publicKey)) : [];
  const selected = mine.find((s) => s.id === chosen) ?? mine.at(-1) ?? null;

  return (
    <>
      {header}
      {!session || session.mode === "demo" ? (
        <Card className="flex flex-col gap-4">
          <p>{t("issuer.needWallet")}</p>
          <ConnectButton />
          <TextLink href="/bond">{t("landing.seeBonds")}</TextLink>
        </Card>
      ) : mine.length === 0 && !isAdmin ? (
        <Card className="flex flex-col gap-3">
          <p>{t("issuer.notIssuer")}</p>
          <ul className="flex flex-col gap-1">
            {allSeries.data.map((s) => (
              <li key={s.address.toBase58()} className="tabular flex justify-between gap-3 text-label">
                <span className="font-semibold">{s.name}</span>
                <span className="text-stone">{shortAddress(s.issuer)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {session && session.mode === "wallet" && selected && (
        <>
          {mine.length > 1 && (
            <Field id="issuer-series" label={t("issuer.series")}>
              <select
                id="issuer-series"
                value={selected.id}
                onChange={(e) => setChosen(Number(e.target.value))}
                className="h-[52px] rounded-control border border-line bg-surface px-3"
              >
                {[...mine].reverse().map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {config.data.paused && <Notice>{t("send.paused")}</Notice>}
          <SeriesDesk key={selected.id} session={session} config={config.data} series={selected} />
        </>
      )}
      {session?.mode === "wallet" && isAdmin && <AdminPanel config={config.data} />}
    </>
  );
}
