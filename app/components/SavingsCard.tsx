"use client";

import Link from "next/link";
import { useState } from "react";
import { errorText } from "@/lib/errors";
import { formatDate, formatUsd } from "@/lib/format";
import { t } from "@/lib/i18n";
import { buildRedeemTransaction, interestSoFar, type Position, type Rule, type Series } from "@/lib/program";
import type { Session } from "@/lib/session";
import { Amount, Button, Card, ErrorNotice } from "./ui";

export function SavingsCard({
  session,
  series,
  rule,
  position,
  now,
  onChanged,
}: {
  session: Session;
  series: Series;
  rule: Rule | null;
  position: Position | null;
  now: number;
  onChanged: () => void;
}) {
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState<bigint | null>(null);
  const matured = now >= series.maturityTs;
  const interest = position ? interestSoFar(position, series, now) : BigInt(0);

  async function redeem() {
    if (!position) return;
    setRedeeming(true);
    setError(null);
    try {
      await session.send(await buildRedeemTransaction(session.publicKey, series));
      setRedeemed(position.principal + interest);
      onChanged();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-heading font-semibold text-root-deep">{t("savings.title")}</h2>
      {redeemed !== null && (
        <p role="status" className="font-semibold text-leaf">
          ✓ {t("savings.redeemed", { amount: formatUsd(redeemed) })}
        </p>
      )}
      {position && position.principal > BigInt(0) ? (
        <>
          <Amount label={t("savings.saved")} value={formatUsd(position.principal)} tone="root" big />
          <div className="grid grid-cols-2 gap-3">
            <Amount label={t("savings.interest")} value={formatUsd(interest)} tone="root" />
            <Amount label={t(matured ? "savings.matured" : "savings.matures")} value={formatDate(series.maturityTs)} />
          </div>
          {matured && (
            <Button onClick={redeem} disabled={redeeming}>
              {redeeming ? t("savings.redeeming") : t("savings.redeem")}
            </Button>
          )}
        </>
      ) : (
        redeemed === null && <p className="text-stone">{t("savings.empty")}</p>
      )}
      {rule && (
        <div className="grid grid-cols-2 gap-3">
          <Amount label={t("savings.totalSent")} value={formatUsd(rule.totalSent)} />
          <Amount label={t("savings.transfers")} value={String(rule.transferCount)} />
        </div>
      )}
      {error && <ErrorNotice message={error} />}
      <Link href={`/bond/${series.id}`} className="flex min-h-[48px] items-center font-semibold text-root underline">
        {t("savings.bondLink")}
      </Link>
    </Card>
  );
}
