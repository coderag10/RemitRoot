// Amounts, dates and addresses for display. Amounts are bigint base units with 6 decimals.

export const USD_DECIMALS = 6;
const UNIT = BigInt(10 ** USD_DECIMALS);
const CENT = BigInt(10 ** (USD_DECIMALS - 2));

const NEPALI_DIGITS = "०१२३४५६७८९";
const NEPALI_MONTHS = ["जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन", "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर"];

// Browsers ship uneven locale data for Nepali, so Nepali digits, dates and relative times are
// produced here rather than by Intl; English uses Intl, which every browser supports.
const localDigits = (text: string, locale: string) =>
  locale === "ne" ? text.replace(/\d/g, (digit) => NEPALI_DIGITS[Number(digit)]) : text;

/** A whole number with grouping: 1,234,567 in English, १२,३४,५६७ in Nepali. */
export function formatNumber(value: number | bigint, locale = "en"): string {
  return localDigits(new Intl.NumberFormat(locale === "ne" ? "en-IN" : "en-US").format(value), locale);
}

/** "$1,234.50": always a currency sign and two decimals, rounded down to the cent. */
export function formatUsd(units: bigint, locale = "en"): string {
  const negative = units < BigInt(0);
  const cents = (negative ? -units : units) / CENT;
  const whole = formatNumber(cents / BigInt(100), locale);
  const fraction = localDigits((cents % BigInt(100)).toString().padStart(2, "0"), locale);
  return `${negative ? "-" : ""}$${whole}.${fraction}`;
}

/** Whole dollars with no cents, for compact figures like a cap. */
export function formatUsdWhole(units: bigint, locale = "en"): string {
  return `$${formatNumber(units / UNIT, locale)}`;
}

/** Text typed by a person, in test dollars, to base units; null unless a positive amount. */
export function parseUsd(text: string): bigint | null {
  const clean = text.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{0,6})?$/.test(clean)) return null;
  const [whole, fraction = ""] = clean.split(".");
  const units = BigInt(whole) * UNIT + BigInt(fraction.padEnd(USD_DECIMALS, "0"));
  return units > BigInt(0) ? units : null;
}

/** Base units back to plain text for an input, without grouping or trailing zeros. */
export function unitsToInput(units: bigint): string {
  const whole = units / UNIT;
  const fraction = (units % UNIT).toString().padStart(USD_DECIMALS, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export const shortAddress = (address: { toString(): string }) => {
  const text = address.toString();
  return `${text.slice(0, 4)}…${text.slice(-4)}`;
};

export function formatPercent(bps: number, locale = "en"): string {
  const value = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(bps / 100);
  return `${localDigits(value, locale)}%`;
}

export function formatDate(unixSeconds: number, locale = "en", withTime = false): string {
  const date = new Date(unixSeconds * 1000);
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  if (locale === "ne") {
    const day = `${date.getDate()} ${NEPALI_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
    return localDigits(withTime ? `${day}, ${time}` : day, locale);
  }
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return withTime ? `${day}, ${time}` : day;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number, string][] = [
  ["year", 31_536_000, "वर्ष"],
  ["month", 2_592_000, "महिना"],
  ["day", 86_400, "दिन"],
  ["hour", 3_600, "घण्टा"],
  ["minute", 60, "मिनेट"],
  ["second", 1, "सेकेन्ड"],
];

/** "in 3 days", "2 hours ago"; in Nepali "३ दिनमा", "२ घण्टाअघि". */
export function formatRelative(unixSeconds: number, now: number, locale = "en"): string {
  const seconds = unixSeconds - now;
  const [unit, size, nepali] = RELATIVE_UNITS.find(([, size]) => Math.abs(seconds) >= size) ?? RELATIVE_UNITS[5];
  const count = Math.round(seconds / size);
  if (locale === "ne") {
    const amount = localDigits(String(Math.abs(count)), locale);
    return count >= 0 ? `${amount} ${nepali}मा` : `${amount} ${nepali}अघि`;
  }
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(count, unit);
}
