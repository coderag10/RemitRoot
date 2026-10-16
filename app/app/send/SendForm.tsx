"use client";

import { PublicKey } from "@solana/web3.js";
import { useState } from "react";
import { GOAL_KINDS, goalLabel } from "@/components/Goal";
import { SeriesPicker } from "@/components/SeriesPicker";
import { SplitSlider } from "@/components/SplitSlider";
import { Amount } from "@/components/ui/Amount";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field, MoneyInput, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { ErrorNotice } from "@/components/ui/States";
import { split } from "@/lib/chain/math";
import { defaultSeries, isOpen, type Config, type Rule, type Series } from "@/lib/chain/program";
import { buildSend } from "@/lib/chain/transactions";
import { useContacts } from "@/lib/contacts";
import { explorerTx } from "@/lib/env";
import { formatUsd, parseUsd, shortAddress, unitsToInput } from "@/lib/format";
import { useI18n, type TextKey } from "@/lib/i18n";
import type { Session } from "@/lib/session";
import { useTransaction } from "@/lib/tx";

const QUICK_AMOUNTS = [50, 100, 200, 500];
const DEFAULT_SAVE_BPS = 1500;

function parseAddress(text: string): PublicKey | null {
  try {
    return text.trim() ? new PublicKey(text.trim()) : null;
  } catch {
    return null;
  }
}

type Sent = { signature: string; family: bigint; saved: bigint; seconds: number; bond: string; familyName: string };

/** The split rule and the send button. Starts from the worker's saved rule, if there is one. */
export function SendForm({
  session,
  config,
  series,
  rule,
  balance,
  now,
  onAmountChange,
}: {
  session: Session;
  config: Config;
  series: Series[];
  rule: Rule | null;
  balance: bigint;
  now: number;
  onAmountChange?: (savedPerTransfer: bigint) => void;
}) {
  const { t, locale } = useI18n();
  const { nameOf, setName } = useContacts();
  const { run, busy } = useTransaction();

  const ruleSeries = rule ? series.find((s) => s.address.equals(rule.series)) ?? null : null;
  const [amountText, setAmountText] = useState("200");
  const [saveBps, setSaveBps] = useState(rule?.saveBps ?? DEFAULT_SAVE_BPS);
  const [recipientText, setRecipientText] = useState(rule?.recipient.toBase58() ?? "");
  const [chosenSeries, setChosenSeries] = useState<Series | null>(
    ruleSeries && isOpen(ruleSeries, now) ? ruleSeries : defaultSeries(series, now),
  );
  const [goalOpen, setGoalOpen] = useState((rule?.goalAmount ?? BigInt(0)) > BigInt(0));
  const [goalKind, setGoalKind] = useState(rule?.goalKind || 1);
  const [goalText, setGoalText] = useState(rule && rule.goalAmount > BigInt(0) ? unitsToInput(rule.goalAmount) : "");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);

  const amount = parseUsd(amountText);
  const { saved, family } = split(amount ?? BigInt(0), saveBps);
  const recipient = session.demoFamily ?? parseAddress(recipientText);
  const familyName = (recipient && nameOf(recipient)) || t("common.family");
  // A 0% transfer still names a series; any one works, since nothing goes into it.
  const target = chosenSeries ?? ruleSeries ?? series.at(-1) ?? null;
  const goalAmount = goalOpen ? parseUsd(goalText) : BigInt(0);

  let problem: TextKey | null = null;
  if (config.paused) problem = "send.paused";
  else if (amount === null) problem = "send.amountInvalid";
  else if (amount > balance) problem = "send.notEnough";
  else if (recipient === null) problem = "send.recipient.invalid";
  else if (recipient.equals(session.publicKey)) problem = "send.recipient.self";
  else if (saved > BigInt(0) && (chosenSeries === null || !isOpen(chosenSeries, now))) problem = "send.matured";
  else if (saved > BigInt(0) && chosenSeries && chosenSeries.totalPrincipal + saved > chosenSeries.cap) problem = "send.full";
  else if (goalOpen && goalAmount === null) problem = "send.goal.invalid";
  else if (target === null) problem = "send.series.none";

  async function send() {
    if (problem || amount === null || recipient === null || target === null) return;
    setError(null);
    const result = await run(
      "send.button",
      () =>
        buildSend({
          config,
          worker: session.publicKey,
          recipient,
          series: target,
          amount,
          saveBps,
          goal: { amount: goalAmount ?? BigInt(0), kind: goalOpen ? goalKind : 0 },
          rule,
        }),
      { amount: formatUsd(amount, locale) },
    );
    if (result.ok) {
      setSent({ signature: result.signature, family, saved, seconds: result.seconds, bond: target.name, familyName });
    } else {
      setError(t(result.error));
    }
  }

  if (sent) {
    return (
      <Card tone="root" labelledBy="sent-title" className="animate-rise">
        <h2 id="sent-title" role="status" className="mb-3 flex items-center gap-2 text-heading font-bold text-leaf">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-leaf text-white">
            <Icon name="check" />
          </span>
          {t("sent.title")}
        </h2>
        <div className="flex flex-col gap-3">
          <Amount label={t("send.familyGets")} value={t("sent.toFamily", { amount: formatUsd(sent.family, locale), name: sent.familyName })} tone="marigold" />
          {sent.saved > BigInt(0) && (
            <Amount label={t("send.youSave")} value={t("sent.toBond", { amount: formatUsd(sent.saved, locale), bond: sent.bond })} tone="root" />
          )}
          <p className="text-label text-stone">
            {t("sent.took", { seconds: sent.seconds.toFixed(1) })} ·{" "}
            <a href={explorerTx(sent.signature)} target="_blank" rel="noreferrer" className="font-semibold text-root underline">
              {t("sent.explorer")}
            </a>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => setSent(null)}>
              {t("sent.again")}
            </Button>
            <LinkButton variant="ghost" href={recipient ? `/family?wallet=${recipient.toBase58()}` : "/family"} icon="family">
              {t("sent.familyView")}
            </LinkButton>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card labelledBy="send-title">
      <CardTitle id="send-title">{t("send.title")}</CardTitle>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Field id="amount" label={t("send.youSend")}>
            <MoneyInput
              id="amount"
              big
              value={amountText}
              aria-label={t("send.amountLabel")}
              invalid={problem === "send.amountInvalid" || problem === "send.notEnough"}
              onChange={(event) => {
                setAmountText(event.target.value);
                const next = parseUsd(event.target.value);
                onAmountChange?.(split(next ?? BigInt(0), saveBps).saved);
              }}
            />
          </Field>
          <div role="group" aria-label={t("send.quickAmounts")} className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => {
                  setAmountText(String(quick));
                  onAmountChange?.(split(BigInt(quick) * BigInt(1_000_000), saveBps).saved);
                }}
                className={`tabular min-h-[44px] rounded-full border px-4 font-semibold ${
                  amountText === String(quick) ? "border-root bg-root-soft text-root-deep" : "border-line bg-surface hover:border-root/50"
                }`}
              >
                ${quick}
              </button>
            ))}
          </div>
        </div>

        <SplitSlider
          amount={amount ?? BigInt(0)}
          saveBps={saveBps}
          couponBps={chosenSeries && isOpen(chosenSeries, now) ? chosenSeries.couponBps : null}
          disabled={config.paused}
          onChange={(bps) => {
            setSaveBps(bps);
            onAmountChange?.(split(amount ?? BigInt(0), bps).saved);
          }}
        />

        <div className="flex flex-col gap-3">
          <p className="text-label font-semibold text-stone">{t("send.recipient.title")}</p>
          {session.demoFamily ? (
            <div className="flex items-center gap-3 rounded-control border border-line bg-paper p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-marigold-soft text-marigold-deep">
                <Icon name="family" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{familyName}</p>
                <p className="tabular text-label text-stone">
                  {t("send.recipient.demo")} · {shortAddress(session.demoFamily)}
                </p>
              </div>
            </div>
          ) : (
            <Field
              id="recipient"
              label={t("send.recipient.address")}
              error={
                recipientText && (problem === "send.recipient.invalid" || problem === "send.recipient.self") ? t(problem) : undefined
              }
            >
              <TextInput
                id="recipient"
                value={recipientText}
                spellCheck={false}
                autoComplete="off"
                invalid={!!recipientText && (problem === "send.recipient.invalid" || problem === "send.recipient.self")}
                onChange={(event) => setRecipientText(event.target.value)}
                className="tabular text-label"
              />
            </Field>
          )}
          {recipient && (
            <Field id="recipient-name" label={t("send.recipient.name")}>
              <TextInput
                id="recipient-name"
                maxLength={32}
                placeholder={t("send.recipient.namePlaceholder")}
                defaultValue={nameOf(recipient) ?? ""}
                key={recipient.toBase58()}
                onBlur={(event) => setName(recipient, event.target.value)}
              />
            </Field>
          )}
        </div>

        {saved > BigInt(0) && (
          <SeriesPicker series={series} selected={chosenSeries} onSelect={setChosenSeries} now={now} />
        )}

        <div className="flex flex-col gap-3">
          {goalOpen ? (
            <div className="flex flex-col gap-3 rounded-control border border-line p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{t("send.goal.edit")}</p>
                <button type="button" onClick={() => setGoalOpen(false)} className="min-h-[44px] text-label font-semibold text-brick underline">
                  {t("send.goal.remove")}
                </button>
              </div>
              <fieldset>
                <legend className="mb-2 text-label font-semibold text-stone">{t("send.goal.kind")}</legend>
                <div className="flex flex-wrap gap-2">
                  {GOAL_KINDS.map((kind) => (
                    <label
                      key={kind}
                      className={`flex min-h-[44px] cursor-pointer items-center rounded-full border px-4 font-semibold ${
                        goalKind === kind ? "border-root bg-root-soft text-root-deep" : "border-line bg-surface"
                      }`}
                    >
                      <input type="radio" name="goal-kind" className="sr-only" checked={goalKind === kind} onChange={() => setGoalKind(kind)} />
                      {t(goalLabel(kind))}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field id="goal-amount" label={t("send.goal.amount")} error={problem === "send.goal.invalid" && goalText ? t(problem) : undefined}>
                <MoneyInput id="goal-amount" value={goalText} onChange={(event) => setGoalText(event.target.value)} invalid={problem === "send.goal.invalid" && !!goalText} />
              </Field>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setGoalOpen(true)}
              className="flex min-h-[48px] items-center gap-2 self-start font-semibold text-root underline-offset-4 hover:underline"
            >
              <Icon name="target" />
              {t("send.goal.add")}
            </button>
          )}
        </div>

        <p className="text-label text-stone">{t("send.ruleNote")}</p>
        {problem && problem !== "send.paused" && (amountText || recipientText || session.demoFamily) && (
          <p className="text-label font-semibold text-brick">
            {t(problem, { balance: formatUsd(balance, locale) })}
          </p>
        )}
        {error && <ErrorNotice message={error} onRetry={send} />}
        <Button onClick={send} loading={busy} disabled={problem !== null} icon="send">
          {busy ? t("send.sending") : t("send.button", { amount: formatUsd(amount ?? BigInt(0), locale) })}
        </Button>
      </div>
    </Card>
  );
}
