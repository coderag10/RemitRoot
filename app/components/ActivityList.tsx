"use client";

import type { PublicKey } from "@solana/web3.js";
import type { ActivityItem } from "@/lib/chain/history";
import { useContacts } from "@/lib/contacts";
import { explorerTx } from "@/lib/env";
import { formatDate, formatPercent, formatUsd, shortAddress } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { Icon, type IconName } from "./ui/Icon";

/**
 * Program activity as a list with explorer links. `perspective` decides how a transfer reads:
 * "Sent" for the worker, "Received" for the family.
 */
export function ActivityList({
  items,
  perspective,
  self,
  limit,
}: {
  items: ActivityItem[];
  perspective: "worker" | "family" | "bond";
  self?: PublicKey;
  limit?: number;
}) {
  const { t, locale } = useI18n();
  const { nameOf } = useContacts();
  const money = (value: bigint) => formatUsd(value, locale);
  const shown = (perspective === "family" && self
    ? items.filter((item) => item.kind === "sent" && item.recipient.equals(self))
    : perspective === "worker"
      ? items.filter((item) => item.kind !== "withdrawn" && item.kind !== "repaid")
      : items.filter((item) => item.kind === "withdrawn" || item.kind === "repaid" || item.kind === "redeemed")
  ).slice(0, limit);

  if (shown.length === 0) return null;
  return (
    <ul className="flex flex-col divide-y divide-line">
      {shown.map((item, index) => {
        let icon: IconName = "send";
        let tone = "bg-paper text-ink";
        let title = "";
        let detail = "";
        switch (item.kind) {
          case "sent":
            if (perspective === "family") {
              icon = "arrowDown";
              tone = "bg-marigold-soft text-marigold-deep";
              title = t("history.received", { amount: money(item.family) });
              detail = t("history.received.detail", { name: nameOf(item.worker) ?? shortAddress(item.worker) });
            } else {
              tone = "bg-marigold-soft text-marigold-deep";
              title = t("history.sent", { amount: money(item.amount) });
              detail = t("history.sent.detail", { family: money(item.family), saved: money(item.saved) });
            }
            break;
          case "claimed":
            icon = "coins";
            tone = "bg-root-soft text-root";
            title = t("history.claimed", { amount: money(item.amount) });
            break;
          case "redeemed":
            icon = "sprout";
            tone = "bg-root-soft text-root";
            title = t("history.redeemed", { amount: money(item.principal + item.interest) });
            detail = t("history.redeemed.detail", { principal: money(item.principal), interest: money(item.interest) });
            break;
          case "withdrawn":
            icon = "issuer";
            title = t("history.withdrawn", { amount: money(item.amount) });
            detail = item.purpose;
            break;
          case "repaid":
            icon = "shield";
            tone = "bg-root-soft text-root";
            title = t("history.repaid", { amount: money(item.amount) });
            break;
          case "ruleSet":
            icon = "edit";
            title = t("history.ruleSet", { percent: formatPercent(item.saveBps, locale) });
            break;
        }
        return (
          <li key={`${item.signature}-${index}`} className="flex items-center gap-3 py-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`}>
              <Icon name={icon} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="tabular font-semibold">{title}</p>
              {detail && <p className="truncate text-label text-stone">{detail}</p>}
              <p className="text-label text-stone">{formatDate(item.ts, locale, true)}</p>
            </div>
            <a
              href={explorerTx(item.signature)}
              target="_blank"
              rel="noreferrer"
              aria-label={t("tx.explorer")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-root hover:bg-root-soft"
            >
              <Icon name="external" size={18} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
