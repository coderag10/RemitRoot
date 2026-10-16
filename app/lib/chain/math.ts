// The program's arithmetic, mirrored exactly so the app can show amounts before anything is sent.
// Amounts are in base units (6 decimals) as bigint.

export const BPS = BigInt(10_000);
export const SECONDS_PER_YEAR = BigInt(31_536_000);

/** `saved = amount * save_bps / 10_000`, rounded down; the family gets the rest. */
export function split(amount: bigint, saveBps: number) {
  const saved = (amount * BigInt(saveBps)) / BPS;
  return { saved, family: amount - saved };
}

/** Simple interest on `principal` for `seconds`, rounded down as the program does. */
export function simpleInterest(principal: bigint, couponBps: number, seconds: number): bigint {
  if (seconds <= 0 || principal <= BigInt(0)) return BigInt(0);
  return (principal * BigInt(couponBps) * BigInt(Math.floor(seconds))) / (BPS * SECONDS_PER_YEAR);
}

export type Accruing = { principal: bigint; accruedInterest: bigint; lastAccrualTs: number };

/** Interest booked on-chain plus what has accrued since, stopping at maturity. Unpaid only. */
export function unpaidInterest(position: Accruing, couponBps: number, maturityTs: number, now: number) {
  const until = Math.min(now, maturityTs);
  return position.accruedInterest + simpleInterest(position.principal, couponBps, until - position.lastAccrualTs);
}

/**
 * Illustration for the slider: `months` monthly transfers of `amount` at `saveBps`, each saved
 * amount earning simple interest until the end of the period. Not a promise.
 */
export function projection(amount: bigint, saveBps: number, couponBps: number, months = 12) {
  const { saved } = split(amount, saveBps);
  const monthSeconds = Number(SECONDS_PER_YEAR) / 12;
  let interest = BigInt(0);
  for (let month = 0; month < months; month++) {
    interest += simpleInterest(saved, couponBps, (months - month) * monthSeconds);
  }
  return { saved: saved * BigInt(months), interest };
}

/** Whole months of transfers at this rate needed to reach `goal` from `current`; null if never. */
export function monthsToGoal(current: bigint, goal: bigint, savedPerTransfer: bigint): number | null {
  if (current >= goal) return 0;
  if (savedPerTransfer <= BigInt(0)) return null;
  const remaining = goal - current;
  return Number((remaining + savedPerTransfer - BigInt(1)) / savedPerTransfer);
}
