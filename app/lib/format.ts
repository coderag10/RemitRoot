import { USD_DECIMALS } from "./config";

const UNIT = 10 ** USD_DECIMALS;

/** Base units to "$1,234.50". */
export function formatUsd(units: bigint | number): string {
  const value = Number(units) / UNIT;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Test dollars typed by the user to base units; null when it is not a positive amount. */
export function parseUsd(text: string): bigint | null {
  if (!/^\d+(\.\d{1,6})?$/.test(text.trim())) return null;
  const [whole, fraction = ""] = text.trim().split(".");
  const units = BigInt(whole) * BigInt(UNIT) + BigInt(fraction.padEnd(USD_DECIMALS, "0"));
  return units > BigInt(0) ? units : null;
}

export const shortAddress = (address: { toString(): string }) => {
  const text = address.toString();
  return `${text.slice(0, 4)}…${text.slice(-4)}`;
};

export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
