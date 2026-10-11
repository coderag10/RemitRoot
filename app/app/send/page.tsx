"use client";

import { PublicKey } from "@solana/web3.js";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { DemoButton } from "@/components/DemoButton";
import { SavingsCard } from "@/components/SavingsCard";
import { SplitSlider } from "@/components/SplitSlider";
import { Amount, Button, Card, ErrorNotice, Skeleton } from "@/components/ui";
import { WalletEntry } from "@/components/WalletEntry";
import { DEFAULT_SAVE_BPS, DEFAULT_SERIES_ID, explorerTx } from "@/lib/config";
import { errorText } from "@/lib/errors";
import { formatUsd, parseUsd, shortAddress } from "@/lib/format";
import { useLoad, useNow } from "@/lib/hooks";
import { t } from "@/lib/i18n";
import {
  buildSendTransaction,
  fetchPosition,
  fetchRule,
  fetchSeries,
  fetchUsdBalance,
  split,
} from "@/lib/program";
import { requestFaucet, useSession, type Session } from "@/lib/session";

function parseAddress(text: string): PublicKey | null {
  try {
    return new PublicKey(text.trim());
  } catch {
    return null;
  }
}

type Sent = { signature: string; family: bigint; saved: bigint; seconds: string };

function SendFlow({ session, seriesId }: { session: Session; seriesId: number }) {
  const now = useNow();
  const load = useCallback(async () => {
    const series = await fetchSeries(seriesId);
    if (!series) return null;
    const [rule, position, balance] = await Promise.all([
      fetchRule(session.publicKey),
      fetchPosition(session.publicKey, series.address),
      fetchUsdBalance(session.publicKey),
    ]);
    const family = session.family ?? rule?.recipient ?? null;
    const familyBalance = family ? await fetchUsdBalance(family) : null;
    return { series, rule, position, balance, familyBalance };
  }, [session, seriesId]);
  const { data, error: loadError, loading, reload } = useLoad(load);

  const [amountText, setAmountText] = useState("200");
  // Null until the visitor changes it, so the saved rule shows first.
  const [chosenBps, setChosenBps] = useState<number | null>(null);
  const [recipientText, setRecipientText] = useState<string | null>(null);
  const [busy, setBusy] = useState<"send" | "faucet" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);

  if (loading && !data) {
    return (
      <Card>
        <Skeleton lines={6} />
      </Card>
    );
  }
  if (!data) {
    return <ErrorNotice message={loadError ? errorText(loadError) : t("bond.notFound")} onRetry={reload} />;
  }

  const { series, rule, position, balance, familyBalance } = data;
  const saveBps = chosenBps ?? rule?.saveBps ?? DEFAULT_SAVE_BPS;
  const recipientValue = recipientText ?? rule?.recipient.toBase58() ?? "";
  const recipient = session.family ?? parseAddress(recipientValue);
  const amount = parseUsd(amountText);
  const matured = now >= series.maturityTs;

  const problem = matured
    ? t("send.matured")
    : amount === null
      ? t("send.amountInvalid")
      : amount > balance
        ? t("send.notEnough", { balance: formatUsd(balance) })
        : recipient === null
          ? t("send.recipientInvalid")
          : null;

  async function send() {
    if (amount === null || recipient === null) return;
    setBusy("send");
    setError(null);
    try {
      const started = Date.now();
      const tx = await buildSendTransaction({
        worker: session.publicKey,
        recipient,
        series,
        amount,
        saveBps,
        currentRule: rule,
      });
      const signature = await session.send(tx);
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      // Refresh first, so the balances beside the confirmation already include this transfer.
      await reload();
      setSent({ signature, ...split(amount, saveBps), seconds });
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(null);
    }
  }

  async function topUp() {
    setBusy("faucet");
    setError(null);
    try {
      await requestFaucet(session.publicKey, session.family);
      await reload();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Card className="flex items-end justify-between gap-3">
        <Amount label={t("send.balance")} value={formatUsd(balance)} />
        <button
          type="button"
          onClick={topUp}
          disabled={busy !== null}
          className="min-h-[48px] font-semibold text-root underline disabled:opacity-50"
        >
          {busy === "faucet" ? t("send.gettingTestDollars") : t("send.getTestDollars")}
        </button>
      </Card>

      {sent ? (
        <Card className="flex flex-col gap-3">
          <h2 role="status" className="text-heading font-semibold text-leaf">
            ✓ {t("sent.title")}
          </h2>
          <Amount label={t("send.familyGets")} value={t("sent.toFamily", { amount: formatUsd(sent.family) })} tone="marigold" />
          <Amount
            label={t("send.youSave")}
            value={t("sent.toBond", { amount: formatUsd(sent.saved), bond: series.name })}
            tone="root"
          />
          <p className="text-label text-stone">
            {t("sent.took", { seconds: sent.seconds })} ·{" "}
            <a href={explorerTx(sent.signature)} target="_blank" rel="noreferrer" className="font-semibold text-root underline">
              {t("sent.explorer")}
            </a>
          </p>
          <Button variant="secondary" onClick={() => setSent(null)}>
            {t("sent.again")}
          </Button>
        </Card>
      ) : (
        <Card className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-label font-medium text-stone">
            {t("send.youSend")}
            <span className="flex items-center gap-1 text-amount font-bold text-ink">
              $
              <input
                type="text"
                inputMode="decimal"
                value={amountText}
                aria-label={t("send.amountLabel")}
                onChange={(event) => setAmountText(event.target.value)}
                className="w-full rounded-control border border-line bg-surface px-2 tabular-nums"
              />
            </span>
          </label>

          <SplitSlider
            amount={amount ?? BigInt(0)}
            saveBps={saveBps}
            couponBps={series.couponBps}
            onChange={setChosenBps}
          />

          {session.family ? (
            <p className="text-label font-medium text-stone">
              {t("send.recipientDemo")} {shortAddress(session.family)}
            </p>
          ) : (
            <label className="flex flex-col gap-1 text-label font-medium text-stone">
              {t("send.recipientLabel")}
              <input
                type="text"
                value={recipientValue}
                onChange={(event) => setRecipientText(event.target.value)}
                className="h-12 rounded-control border border-line bg-surface px-3 text-body text-ink"
              />
            </label>
          )}

          {problem && <p className="text-label font-medium text-brick">{problem}</p>}
          {error && <ErrorNotice message={error} onRetry={send} />}
          <Button onClick={send} disabled={busy !== null || problem !== null}>
            {busy === "send" ? t("send.sending") : t("send.button", { amount: formatUsd(amount ?? BigInt(0)) })}
          </Button>
        </Card>
      )}

      <SavingsCard session={session} series={series} rule={rule} position={position} now={now} onChanged={reload} />

      {familyBalance !== null && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-heading font-semibold text-root-deep">{t("family.title")}</h2>
          <Amount label={t("family.received")} value={formatUsd(familyBalance)} tone="marigold" big />
          <p className="text-label text-stone">{t("family.text")}</p>
        </Card>
      )}
    </>
  );
}

function Send() {
  const { session } = useSession();
  const requested = Number(useSearchParams().get("series") ?? DEFAULT_SERIES_ID);
  const seriesId = Number.isInteger(requested) && requested >= 0 ? requested : DEFAULT_SERIES_ID;

  if (!session) {
    return (
      <Card className="flex flex-col gap-4">
        <h2 className="text-heading font-semibold text-root-deep">{t("send.needWallet.title")}</h2>
        <p>{t("send.needWallet.text")}</p>
        <DemoButton />
        <WalletEntry />
      </Card>
    );
  }
  // A new wallet starts from a clean form.
  return <SendFlow key={session.publicKey.toBase58()} session={session} seriesId={seriesId} />;
}

export default function SendPage() {
  return (
    <>
      <h1 className="text-title font-bold text-root-deep">{t("send.title")}</h1>
      <Suspense fallback={<Skeleton lines={6} />}>
        <Send />
      </Suspense>
    </>
  );
}
