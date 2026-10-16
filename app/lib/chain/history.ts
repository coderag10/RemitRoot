// Activity read from the program's events in recent transactions. There is no indexer: the app
// asks the RPC for an address's recent signatures and decodes the events in their logs.
import { PublicKey, type ConfirmedSignatureInfo } from "@solana/web3.js";
import { connection, eventParser } from "./program";

export type Activity =
  | { kind: "sent"; worker: PublicKey; recipient: PublicKey; amount: bigint; family: bigint; saved: bigint; series: PublicKey }
  | { kind: "claimed"; worker: PublicKey; series: PublicKey; amount: bigint }
  | { kind: "redeemed"; worker: PublicKey; series: PublicKey; principal: bigint; interest: bigint }
  | { kind: "withdrawn"; series: PublicKey; amount: bigint; purpose: string }
  | { kind: "repaid"; series: PublicKey; amount: bigint }
  | { kind: "ruleSet"; worker: PublicKey; recipient: PublicKey; saveBps: number; series: PublicKey };

export type ActivityItem = Activity & { signature: string; ts: number };

type Fields = Record<string, unknown>;
const key = (value: unknown) => value as PublicKey;
const amount = (value: unknown) => BigInt(String(value));

/** One decoded program event to an activity entry; null for events the app does not list. */
export function toActivity(name: string, data: Fields): Activity | null {
  // Anchor may report the name in PascalCase or camelCase depending on the IDL version.
  switch (name.charAt(0).toLowerCase() + name.slice(1)) {
    case "remittanceSent":
      return {
        kind: "sent",
        worker: key(data.worker),
        recipient: key(data.recipient),
        amount: amount(data.amount),
        family: amount(data.familyAmount),
        saved: amount(data.savedAmount),
        series: key(data.series),
      };
    case "interestClaimed":
      return { kind: "claimed", worker: key(data.worker), series: key(data.series), amount: amount(data.amount) };
    case "redeemed":
      return {
        kind: "redeemed",
        worker: key(data.worker),
        series: key(data.series),
        principal: amount(data.principal),
        interest: amount(data.interest),
      };
    case "proceedsWithdrawn":
      return { kind: "withdrawn", series: key(data.series), amount: amount(data.amount), purpose: String(data.purpose) };
    case "repaid":
      return { kind: "repaid", series: key(data.series), amount: amount(data.amount) };
    case "ruleSet":
      return {
        kind: "ruleSet",
        worker: key(data.worker),
        recipient: key(data.recipient),
        saveBps: Number(data.saveBps),
        series: key(data.series),
      };
    default:
      return null;
  }
}

/** Decodes every event the program emitted in a transaction's logs. */
export function parseActivity(logs: string[]): Activity[] {
  const found: Activity[] = [];
  try {
    for (const event of eventParser.parseLogs(logs)) {
      const activity = toActivity(event.name, event.data as Fields);
      if (activity) found.push(activity);
    }
  } catch {
    // Logs from a failed or truncated transaction: nothing to list.
  }
  return found;
}

/**
 * Program activity in the latest `limit` transactions that touched `address`, newest first.
 * Requests run a few at a time to stay under public RPC rate limits.
 */
export async function fetchActivity(address: PublicKey, limit = 20): Promise<ActivityItem[]> {
  const signatures = (await connection.getSignaturesForAddress(address, { limit })).filter((s) => !s.err);
  const items: ActivityItem[] = [];
  for (let start = 0; start < signatures.length; start += 4) {
    const batch = signatures.slice(start, start + 4);
    const transactions = await Promise.all(
      batch.map((s: ConfirmedSignatureInfo) =>
        connection.getTransaction(s.signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" }),
      ),
    );
    transactions.forEach((tx, index) => {
      const logs = tx?.meta?.logMessages;
      if (!logs || tx?.meta?.err) return;
      const { signature, blockTime } = batch[index];
      for (const activity of parseActivity(logs)) {
        items.push({ ...activity, signature, ts: blockTime ?? tx.blockTime ?? 0 });
      }
    });
  }
  return items.sort((a, b) => b.ts - a.ts);
}
