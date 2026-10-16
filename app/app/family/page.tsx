"use client";

import { PublicKey } from "@solana/web3.js";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ActivityList } from "@/components/ActivityList";
import { GoalProgress } from "@/components/Goal";
import { Amount } from "@/components/ui/Amount";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardTitle, PageTitle } from "@/components/ui/Card";
import { Field, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, ErrorNotice, Skeleton } from "@/components/ui/States";
import { errorKey } from "@/lib/chain/errors";
import { unpaidInterest } from "@/lib/chain/math";
import { useContacts } from "@/lib/contacts";
import { formatPercent, formatUsd, shortAddress } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useActivity, useAllSeries, useFamily, useNow } from "@/lib/queries";
import { useSession } from "@/lib/session";

function parseAddress(text: string | null): PublicKey | null {
  try {
    return text ? new PublicKey(text) : null;
  } catch {
    return null;
  }
}

/** Asks whose family view to show when it is not obvious. */
function Lookup() {
  const { t } = useI18n();
  const router = useRouter();
  const { session } = useSession();
  const [text, setText] = useState("");
  const address = parseAddress(text.trim());
  return (
    <Card labelledBy="lookup-title">
      <CardTitle id="lookup-title">{t("family.lookup.title")}</CardTitle>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (address) router.push(`/family?wallet=${address.toBase58()}`);
        }}
      >
        <p>{t("family.lookup.text")}</p>
        <Field id="family-address" label={t("send.recipient.address")} error={text && !address ? t("send.recipient.invalid") : undefined}>
          <TextInput id="family-address" value={text} spellCheck={false} invalid={!!text && !address} onChange={(e) => setText(e.target.value)} className="tabular text-label" />
        </Field>
        <Button type="submit" disabled={!address} icon="family">
          {t("family.lookup.button")}
        </Button>
        {session?.mode === "wallet" && (
          <Button variant="ghost" onClick={() => router.push(`/family?wallet=${session.publicKey.toBase58()}`)}>
            {t("family.lookup.useMine")}
          </Button>
        )}
      </form>
    </Card>
  );
}

function FamilyView({ family }: { family: PublicKey }) {
  const { t, locale } = useI18n();
  const now = useNow();
  const { nameOf } = useContacts();
  const series = useAllSeries();
  const data = useFamily(family);
  const activity = useActivity(family, 30);

  if (data.error && !data.data) return <ErrorNotice message={t(errorKey(data.error))} onRetry={() => void data.refetch()} />;
  if (!data.data || !series.data) {
    return (
      <Card>
        <Skeleton lines={6} />
      </Card>
    );
  }

  const { balance, rules, positions } = data.data;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const thisMonth = (activity.data ?? [])
    .filter((item) => item.kind === "sent" && item.recipient.equals(family) && item.ts * 1000 >= monthStart.getTime())
    .reduce((sum, item) => sum + (item.kind === "sent" ? item.family : BigInt(0)), BigInt(0));

  const savingsOf = (worker: PublicKey) =>
    positions
      .filter((position) => position.worker.equals(worker))
      .reduce((sum, position) => {
        const s = series.data!.find((candidate) => candidate.address.equals(position.series));
        return sum + position.principal + (s ? unpaidInterest(position, s.couponBps, s.maturityTs, now) : BigInt(0));
      }, BigInt(0));
  const familySavings = rules.reduce((sum, rule) => sum + savingsOf(rule.worker), BigInt(0));
  const name = nameOf(family) ?? shortAddress(family);

  return (
    <>
      <PageTitle lead={t("family.lead")}>{t("family.title")}</PageTitle>
      <p className="-mt-3 flex items-center gap-2 text-label text-stone">
        <Icon name="family" size={16} />
        {t("family.for", { name })}
      </p>

      <Card tone="marigold" className="flex flex-col gap-4">
        <Amount label={t("family.received")} value={formatUsd(thisMonth, locale)} tone="marigold" size="lg" />
        <Amount label={t("family.balance")} value={formatUsd(balance, locale)} size="sm" />
      </Card>

      <Card tone="root" labelledBy="family-savings">
        <CardTitle id="family-savings">{t("family.savings")}</CardTitle>
        <div className="flex items-end gap-2">
          <span className="tabular text-amount font-bold leading-tight text-root-deep">{formatUsd(familySavings, locale)}</span>
          {familySavings > BigInt(0) && (
            <span className="mb-2 flex items-center gap-1 text-label font-semibold text-leaf">
              <Icon name="sprout" size={16} />
              {t("family.savings.growing")}
            </span>
          )}
        </div>
        <p className="mt-2 text-label text-stone">{t("family.savings.text")}</p>
      </Card>

      <Card labelledBy="family-from">
        <CardTitle id="family-from">{t("family.from")}</CardTitle>
        {rules.length === 0 ? (
          <EmptyState icon="send">{t("family.senders.empty")}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-4">
            {rules.map((rule) => (
              <li key={rule.worker.toBase58()} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{nameOf(rule.worker) ?? shortAddress(rule.worker)}</p>
                    <p className="text-label text-stone">{t("family.sender.saves", { percent: formatPercent(rule.saveBps, locale) })}</p>
                  </div>
                  <span className="tabular font-bold text-root-deep">{formatUsd(savingsOf(rule.worker), locale)}</span>
                </div>
                {rule.goalAmount > BigInt(0) && <GoalProgress saved={rule.totalSaved} goal={rule.goalAmount} kind={rule.goalKind} />}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card labelledBy="family-incoming">
        <CardTitle id="family-incoming">{t("family.incoming")}</CardTitle>
        {activity.isLoading ? (
          <Skeleton lines={3} />
        ) : (activity.data ?? []).some((item) => item.kind === "sent" && item.recipient.equals(family)) ? (
          <ActivityList items={activity.data!} perspective="family" self={family} limit={10} />
        ) : (
          <EmptyState icon="arrowDown">{t("family.incoming.empty")}</EmptyState>
        )}
      </Card>
    </>
  );
}

function Family() {
  const { t } = useI18n();
  const { session } = useSession();
  const requested = parseAddress(useSearchParams().get("wallet"));
  const family = requested ?? session?.demoFamily ?? null;
  return (
    <>
      {family ? <FamilyView key={family.toBase58()} family={family} /> : <Lookup />}
      {session && family && (
        <LinkButton variant="ghost" href="/send" icon="back">
          {t("family.switch")}
        </LinkButton>
      )}
    </>
  );
}

export default function FamilyPage() {
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <Family />
    </Suspense>
  );
}
