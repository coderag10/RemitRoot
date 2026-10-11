// Client for the remitroot program: addresses, reads and transaction builders.
import { BN, Program } from "@anchor-lang/core";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { RPC_URL, SECONDS_PER_YEAR, USD_MINT } from "./config";
import idl from "./idl/remitroot.json";
import type { Remitroot } from "./idl/remitroot";

export const connection = new Connection(RPC_URL, "confirmed");
// Read-only: transactions are built here and signed by the session wallet.
export const program = new Program<Remitroot>(idl as Remitroot, { connection });
const programId = program.programId;

const pda = (...seeds: (Buffer | Uint8Array)[]) =>
  PublicKey.findProgramAddressSync(seeds, programId)[0];

export const seriesPda = (id: number) =>
  pda(Buffer.from("series"), new BN(id).toArrayLike(Buffer, "le", 8));
export const vaultPda = (series: PublicKey) => pda(Buffer.from("vault"), series.toBuffer());
export const rulePda = (worker: PublicKey) => pda(Buffer.from("rule"), worker.toBuffer());
export const positionPda = (worker: PublicKey, series: PublicKey) =>
  pda(Buffer.from("position"), worker.toBuffer(), series.toBuffer());
export const proceedsPda = (series: PublicKey, index: number) =>
  pda(Buffer.from("proceeds"), series.toBuffer(), new BN(index).toArrayLike(Buffer, "le", 4));

/** The test-dollar account of `owner`. */
export const usdAccount = (owner: PublicKey) =>
  getAssociatedTokenAddressSync(USD_MINT, owner, true);

const big = (value: BN) => BigInt(value.toString());

export type Series = {
  id: number;
  address: PublicKey;
  vault: PublicKey;
  name: string;
  couponBps: number;
  maturityTs: number;
  cap: bigint;
  totalPrincipal: bigint;
  totalRedeemed: bigint;
  totalWithdrawn: bigint;
  saverCount: number;
  proceedsCount: number;
};

export async function fetchSeries(id: number): Promise<Series | null> {
  const address = seriesPda(id);
  const account = await program.account.bondSeries.fetchNullable(address);
  if (!account) return null;
  return {
    id,
    address,
    vault: account.vault,
    name: account.name,
    couponBps: account.couponBps,
    maturityTs: account.maturityTs.toNumber(),
    cap: big(account.cap),
    totalPrincipal: big(account.totalPrincipal),
    totalRedeemed: big(account.totalRedeemed),
    totalWithdrawn: big(account.totalWithdrawn),
    saverCount: account.saverCount,
    proceedsCount: account.proceedsCount,
  };
}

export type Rule = {
  recipient: PublicKey;
  saveBps: number;
  series: PublicKey;
  totalSent: bigint;
  totalSaved: bigint;
  transferCount: number;
};

export async function fetchRule(worker: PublicKey): Promise<Rule | null> {
  const account = await program.account.splitRule.fetchNullable(rulePda(worker));
  if (!account) return null;
  return {
    recipient: account.recipient,
    saveBps: account.saveBps,
    series: account.series,
    totalSent: big(account.totalSent),
    totalSaved: big(account.totalSaved),
    transferCount: account.transferCount,
  };
}

export type Position = { principal: bigint; accruedInterest: bigint; lastAccrualTs: number };

export async function fetchPosition(worker: PublicKey, series: PublicKey): Promise<Position | null> {
  const account = await program.account.position.fetchNullable(positionPda(worker, series));
  if (!account) return null;
  return {
    principal: big(account.principal),
    accruedInterest: big(account.accruedInterest),
    lastAccrualTs: account.lastAccrualTs.toNumber(),
  };
}

/** Test-dollar balance of `owner`; zero when the account does not exist yet. */
export async function fetchUsdBalance(owner: PublicKey): Promise<bigint> {
  return fetchTokenAmount(usdAccount(owner));
}

export async function fetchTokenAmount(tokenAccount: PublicKey): Promise<bigint> {
  const info = await connection.getAccountInfo(tokenAccount);
  if (!info) return BigInt(0);
  const balance = await connection.getTokenAccountBalance(tokenAccount);
  return BigInt(balance.value.amount);
}

export type ProceedsRecord = { index: number; address: PublicKey; amount: bigint; purpose: string; ts: number };

export async function fetchProceeds(series: Series): Promise<ProceedsRecord[]> {
  const addresses = Array.from({ length: series.proceedsCount }, (_, i) => proceedsPda(series.address, i));
  const accounts = await program.account.proceedsRecord.fetchMultiple(addresses);
  return accounts.flatMap((account, index) =>
    account
      ? [{ index, address: addresses[index], amount: big(account.amount), purpose: account.purpose, ts: account.ts.toNumber() }]
      : [],
  );
}

/** Savings not yet redeemed plus interest earned so far, across every saver in the series. */
export async function fetchOwed(series: Series, now: number): Promise<bigint> {
  const positions = await program.account.position.all([
    { memcmp: { offset: 8 + 32, bytes: series.address.toBase58() } },
  ]);
  return positions.reduce((sum, { account }) => {
    const position = {
      principal: big(account.principal),
      accruedInterest: big(account.accruedInterest),
      lastAccrualTs: account.lastAccrualTs.toNumber(),
    };
    return sum + position.principal + interestSoFar(position, series, now);
  }, BigInt(0));
}

/** Same rule as the program: `save = amount * save_bps / 10_000`, rounded down. */
export function split(amount: bigint, saveBps: number) {
  const saved = (amount * BigInt(saveBps)) / BigInt(10_000);
  return { saved, family: amount - saved };
}

/** Simple interest booked on-chain plus what has accrued since, capped at maturity. */
export function interestSoFar(
  position: Position,
  series: Pick<Series, "couponBps" | "maturityTs">,
  now: number,
): bigint {
  const seconds = Math.max(0, Math.min(now, series.maturityTs) - position.lastAccrualTs);
  const pending =
    (position.principal * BigInt(series.couponBps) * BigInt(seconds)) /
    (BigInt(10_000) * BigInt(SECONDS_PER_YEAR));
  return position.accruedInterest + pending;
}

/**
 * One transaction that pays the family and buys the bond. The split rule is set in the
 * same transaction when it is new or has changed.
 */
export async function buildSendTransaction(args: {
  worker: PublicKey;
  recipient: PublicKey;
  series: Series;
  amount: bigint;
  saveBps: number;
  currentRule: Rule | null;
}): Promise<Transaction> {
  const { worker, recipient, series, amount, saveBps, currentRule } = args;
  const tx = new Transaction();
  const recipientToken = usdAccount(recipient);
  // The family may never have held test dollars; this does nothing if the account exists.
  tx.add(createAssociatedTokenAccountIdempotentInstruction(worker, recipientToken, recipient, USD_MINT));

  const ruleIsCurrent =
    currentRule !== null &&
    currentRule.saveBps === saveBps &&
    currentRule.recipient.equals(recipient) &&
    currentRule.series.equals(series.address);
  if (!ruleIsCurrent) {
    tx.add(
      await program.methods
        .setSplitRule(recipient, saveBps)
        .accountsPartial({ worker, series: series.address })
        .instruction(),
    );
  }

  tx.add(
    await program.methods
      .sendRemittance(new BN(amount.toString()))
      .accountsPartial({
        worker,
        rule: rulePda(worker),
        series: series.address,
        position: positionPda(worker, series.address),
        usdMint: USD_MINT,
        workerToken: usdAccount(worker),
        recipientToken,
        vault: series.vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction(),
  );
  return tx;
}

export async function buildRedeemTransaction(worker: PublicKey, series: Series): Promise<Transaction> {
  return program.methods
    .redeem()
    .accountsPartial({
      worker,
      series: series.address,
      position: positionPda(worker, series.address),
      usdMint: USD_MINT,
      workerToken: usdAccount(worker),
      vault: series.vault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .transaction();
}
