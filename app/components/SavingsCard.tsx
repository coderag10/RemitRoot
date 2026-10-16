"use client";

import { useState } from "react";
import { unpaidInterest } from "@/lib/chain/math";
import type { Config, Position, Rule, Series } from "@/lib/chain/program";
import { buildClaim, buildRedeem } from "@/lib/chain/transactions";
import {
  formatDate,
  formatNumber,
  formatRelative,
  formatUsd,
} from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Session } from "@/lib/session";
import { useTransaction } from "@/lib/tx";
import { GoalProgress } from "./Goal";
import { Amount, Pill } from "./ui/Amount";
import { Button, TextLink } from "./ui/Button";
import { Card, CardTitle } from "./ui/Card";
import { EmptyState, ErrorNotice } from "./ui/States";

const CENT = BigInt(10_000);

/** The worker's savings: every open position, live interest, claim and redeem, and the goal. */
export function SavingsCard({
  session,
  config,
  series,
  positions,
  rule,
  now,
  perTransfer,
}: {
  session: Session;
  config: Config;
  series: Series[];
  positions: Position[];
  rule: Rule | null;
  now: number;
  perTransfer?: bigint;
}) {
  const { t, locale } = useI18n();
  const { run, busy } = useTransaction();
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = positions
    .map((position) => ({
      position,
      series: series.find((s) => s.address.equals(position.series)),
    }))
    .filter(
      (row): row is { position: Position; series: Series } =>
        row.series !== undefined && row.position.principal > BigInt(0),
    )
    .sort((a, b) => a.series.maturityTs - b.series.maturityTs);
  const totalSaved = rows.reduce(
    (sum, row) => sum + row.position.principal,
    BigInt(0),
  );
  const totalInterest = rows.reduce(
    (sum, row) =>
      sum +
      unpaidInterest(
        row.position,
        row.series.couponBps,
        row.series.maturityTs,
        now,
      ),
    BigInt(0),
  );

  async function act(kind: "claim" | "redeem", target: Series, amount: bigint) {
    setActing(`${kind}:${target.address.toBase58()}`);
    setError(null);
    const result =
      kind === "claim"
        ? await run(
            "savings.claimed.done",
            () => buildClaim(config, session.publicKey, target),
            { amount: formatUsd(amount, locale) },
          )
        : await run(
            "savings.redeemed",
            () => buildRedeem(config, session.publicKey, target),
            { amount: formatUsd(amount, locale) },
          );
    if (!result.ok) setError(t(result.error));
    setActing(null);
  }

  return (
    <Card labelledBy="savings-title">
      <CardTitle id="savings-title">{t("savings.title")}</CardTitle>
      {rows.length === 0 ? (
        <EmptyState icon="sprout">{t("savings.empty")}</EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Amount
              label={t("savings.saved")}
              value={formatUsd(totalSaved, locale)}
              tone="root"
              size="lg"
            />
            <Amount
              label={t("savings.interest")}
              value={formatUsd(totalInterest, locale)}
              tone="root"
            />
          </div>
          <ul className="flex flex-col divide-y divide-line">
            {rows.map(({ position, series: s }) => {
              const matured = now >= s.maturityTs;
              const interest = unpaidInterest(
                position,
                s.couponBps,
                s.maturityTs,
                now,
              );
              const key = s.address.toBase58();
              return (
                <li
                  key={key}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-label text-stone">
                        {matured
                          ? `${t("savings.matured")} · ${formatDate(s.maturityTs, locale)}`
                          : t("savings.maturesIn", {
                              when: formatRelative(s.maturityTs, now, locale),
                            })}
                      </p>
                    </div>
                    {matured && (
                      <Pill tone="marigold">{t("bond.status.matured")}</Pill>
                    )}
                  </div>
                  {/* With one bond the totals above already are its figures. */}
                  {rows.length > 1 && (
                    <div className="grid grid-cols-2 gap-3">
                      <Amount
                        label={t("savings.saved")}
                        value={formatUsd(position.principal, locale)}
                        size="sm"
                      />
                      <Amount
                        label={t("savings.interest")}
                        value={formatUsd(interest, locale)}
                        size="sm"
                        hint={
                          position.interestClaimed > BigInt(0)
                            ? `${t("savings.claimed")}: ${formatUsd(position.interestClaimed, locale)}`
                            : undefined
                        }
                      />
                    </div>
                  )}
                  {rows.length === 1 &&
                    position.interestClaimed > BigInt(0) && (
                      <p className="text-label text-stone">
                        {t("savings.claimed")}:{" "}
                        {formatUsd(position.interestClaimed, locale)}
                      </p>
                    )}
                  {matured ? (
                    <Button
                      loading={acting === `redeem:${key}`}
                      disabled={busy}
                      icon="coins"
                      onClick={() =>
                        act("redeem", s, position.principal + interest)
                      }
                    >
                      {acting === `redeem:${key}`
                        ? t("savings.redeeming")
                        : t("savings.redeem")}
                    </Button>
                  ) : interest >= CENT ? (
                    <Button
                      variant="secondary"
                      loading={acting === `claim:${key}`}
                      disabled={busy}
                      onClick={() => act("claim", s, interest)}
                    >
                      {acting === `claim:${key}`
                        ? t("savings.claiming")
                        : t("savings.claim")}
                    </Button>
                  ) : (
                    <p className="text-label text-stone">
                      {t("savings.claimNothing")}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {rule && rule.goalAmount > BigInt(0) && (
        <div className="mt-4">
          <GoalProgress
            saved={rule.totalSaved}
            goal={rule.goalAmount}
            kind={rule.goalKind}
            perTransfer={perTransfer}
          />
        </div>
      )}
      {rule && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Amount
            label={t("savings.totalSent")}
            value={formatUsd(rule.totalSent, locale)}
            size="sm"
          />
          <Amount
            label={t("savings.transfers")}
            value={formatNumber(rule.transferCount, locale)}
            size="sm"
          />
        </div>
      )}
      {error && (
        <div className="mt-3">
          <ErrorNotice message={error} />
        </div>
      )}
      {rows[0] && (
        <TextLink href={`/bond/${rows[0].series.id}`} className="mt-2">
          {t("savings.bondLink")}
        </TextLink>
      )}
    </Card>
  );
}
