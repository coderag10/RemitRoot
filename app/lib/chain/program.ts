// The remitroot program client: connection, addresses and typed reads. Everything is read from
// chain; the only inputs are the IDL (program id and layout) and the RPC URL.
import { BN, EventParser, Program } from "@anchor-lang/core";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";
import { RPC_URL } from "../env";
import idl from "./remitroot.json";
import type { Remitroot } from "./remitroot";

export const connection = new Connection(RPC_URL, "confirmed");
// Read-only: transactions are built here and signed by the visitor's wallet.
export const program = new Program<Remitroot>(idl as Remitroot, { connection });
export const programId = program.programId;
export const eventParser = new EventParser(programId, program.coder);

/** Limits the program enforces, read from the IDL constants. */
function idlConstant(name: string): number {
  const constant = idl.constants.find((c) => c.name === name);
  if (!constant) throw new Error(`IDL constant ${name} missing`);
  return Number(constant.value);
}
export const LIMITS = {
  maxSaveBps: idlConstant("MAX_SAVE_BPS"),
  maxGoalKind: idlConstant("MAX_GOAL_KIND"),
  maxNameLength: idlConstant("MAX_NAME_LEN"),
  maxPurposeLength: idlConstant("MAX_PURPOSE_LEN"),
};

const pda = (...seeds: (Buffer | Uint8Array)[]) => PublicKey.findProgramAddressSync(seeds, programId)[0];

export const configPda = () => pda(Buffer.from("config"));
export const seriesPda = (id: number) => pda(Buffer.from("series"), new BN(id).toArrayLike(Buffer, "le", 8));
export const rulePda = (worker: PublicKey) => pda(Buffer.from("rule"), worker.toBuffer());
export const positionPda = (worker: PublicKey, series: PublicKey) =>
  pda(Buffer.from("position"), worker.toBuffer(), series.toBuffer());
export const proceedsPda = (series: PublicKey, index: number) =>
  pda(Buffer.from("proceeds"), series.toBuffer(), new BN(index).toArrayLike(Buffer, "le", 4));

const big = (value: BN) => BigInt(value.toString());

// Byte offsets after the 8-byte account discriminator, for server-side filters.
const OFFSET = { positionWorker: 8, positionSeries: 40, ruleRecipient: 40, proceedsSeries: 8 };

export type Config = {
  admin: PublicKey;
  usdMint: PublicKey;
  /** SPL Token or Token-2022, whichever owns the mint. */
  tokenProgram: PublicKey;
  decimals: number;
  paused: boolean;
  seriesCount: number;
};

export async function fetchConfig(): Promise<Config | null> {
  const account = await program.account.config.fetchNullable(configPda());
  if (!account) return null;
  const mint = await connection.getParsedAccountInfo(account.usdMint);
  const parsed = mint.value?.data;
  const decimals = parsed && "parsed" in parsed ? Number(parsed.parsed.info.decimals) : 6;
  return {
    admin: account.admin,
    usdMint: account.usdMint,
    tokenProgram: mint.value?.owner ?? PublicKey.default,
    decimals,
    paused: account.paused,
    seriesCount: account.seriesCount.toNumber(),
  };
}

/** The test-dollar account of `owner` for this config's mint and token program. */
export const usdAccount = (config: Config, owner: PublicKey) =>
  getAssociatedTokenAddressSync(config.usdMint, owner, true, config.tokenProgram);

export type Series = {
  id: number;
  address: PublicKey;
  issuer: PublicKey;
  name: string;
  couponBps: number;
  startTs: number;
  maturityTs: number;
  cap: bigint;
  totalPrincipal: bigint;
  totalRedeemed: bigint;
  interestPaid: bigint;
  totalWithdrawn: bigint;
  totalRepaid: bigint;
  saverCount: number;
  proceedsCount: number;
  vault: PublicKey;
};

type RawSeries = Awaited<ReturnType<typeof program.account.bondSeries.fetch>>;

function toSeries(address: PublicKey, account: RawSeries): Series {
  return {
    id: account.id.toNumber(),
    address,
    issuer: account.issuer,
    name: account.name,
    couponBps: account.couponBps,
    startTs: account.startTs.toNumber(),
    maturityTs: account.maturityTs.toNumber(),
    cap: big(account.cap),
    totalPrincipal: big(account.totalPrincipal),
    totalRedeemed: big(account.totalRedeemed),
    interestPaid: big(account.interestPaid),
    totalWithdrawn: big(account.totalWithdrawn),
    totalRepaid: big(account.totalRepaid),
    saverCount: account.saverCount,
    proceedsCount: account.proceedsCount,
    vault: account.vault,
  };
}

/** Every series, oldest first. */
export async function fetchAllSeries(): Promise<Series[]> {
  const accounts = await program.account.bondSeries.all();
  return accounts.map(({ publicKey, account }) => toSeries(publicKey, account)).sort((a, b) => a.id - b.id);
}

export async function fetchSeries(id: number): Promise<Series | null> {
  const address = seriesPda(id);
  const account = await program.account.bondSeries.fetchNullable(address);
  return account ? toSeries(address, account) : null;
}

export const isOpen = (series: Series, now: number) => now < series.maturityTs && series.totalPrincipal < series.cap;

/** The series new savings should go to: the newest one still open, if any. */
export function defaultSeries(all: Series[], now: number): Series | null {
  return [...all].reverse().find((series) => isOpen(series, now)) ?? null;
}

export type Rule = {
  worker: PublicKey;
  recipient: PublicKey;
  saveBps: number;
  series: PublicKey;
  totalSent: bigint;
  totalSaved: bigint;
  transferCount: number;
  goalAmount: bigint;
  goalKind: number;
};

type RawRule = Awaited<ReturnType<typeof program.account.splitRule.fetch>>;

const toRule = (account: RawRule): Rule => ({
  worker: account.worker,
  recipient: account.recipient,
  saveBps: account.saveBps,
  series: account.series,
  totalSent: big(account.totalSent),
  totalSaved: big(account.totalSaved),
  transferCount: account.transferCount,
  goalAmount: big(account.goalAmount),
  goalKind: account.goalKind,
});

export async function fetchRule(worker: PublicKey): Promise<Rule | null> {
  const account = await program.account.splitRule.fetchNullable(rulePda(worker));
  return account ? toRule(account) : null;
}

/** Every worker whose rule sends to `family`. */
export async function fetchRulesForFamily(family: PublicKey): Promise<Rule[]> {
  const accounts = await program.account.splitRule.all([
    { memcmp: { offset: OFFSET.ruleRecipient, bytes: family.toBase58() } },
  ]);
  return accounts.map(({ account }) => toRule(account));
}

export type Position = {
  address: PublicKey;
  worker: PublicKey;
  series: PublicKey;
  principal: bigint;
  accruedInterest: bigint;
  lastAccrualTs: number;
  interestClaimed: bigint;
};

type RawPosition = Awaited<ReturnType<typeof program.account.position.fetch>>;

const toPosition = (address: PublicKey, account: RawPosition): Position => ({
  address,
  worker: account.worker,
  series: account.series,
  principal: big(account.principal),
  accruedInterest: big(account.accruedInterest),
  lastAccrualTs: account.lastAccrualTs.toNumber(),
  interestClaimed: big(account.interestClaimed),
});

/** A worker's open positions, across every series. */
export async function fetchPositionsOf(worker: PublicKey): Promise<Position[]> {
  const accounts = await program.account.position.all([
    { memcmp: { offset: OFFSET.positionWorker, bytes: worker.toBase58() } },
  ]);
  return accounts.map(({ publicKey, account }) => toPosition(publicKey, account));
}

/** Every open position in a series. */
export async function fetchPositionsIn(series: PublicKey): Promise<Position[]> {
  const accounts = await program.account.position.all([
    { memcmp: { offset: OFFSET.positionSeries, bytes: series.toBase58() } },
  ]);
  return accounts.map(({ publicKey, account }) => toPosition(publicKey, account));
}

export type ProceedsRecord = { address: PublicKey; index: number; amount: bigint; purpose: string; ts: number };

/** The issuer's recorded uses of funds for a series, newest first. */
export async function fetchProceeds(series: PublicKey): Promise<ProceedsRecord[]> {
  const accounts = await program.account.proceedsRecord.all([
    { memcmp: { offset: OFFSET.proceedsSeries, bytes: series.toBase58() } },
  ]);
  return accounts
    .map(({ publicKey, account }) => ({
      address: publicKey,
      index: account.index,
      amount: big(account.amount),
      purpose: account.purpose,
      ts: account.ts.toNumber(),
    }))
    .sort((a, b) => b.index - a.index);
}

/** A token account's balance in base units; zero when it does not exist yet. */
export async function fetchTokenBalance(account: PublicKey): Promise<bigint> {
  const info = await connection.getAccountInfo(account);
  if (!info) return BigInt(0);
  const balance = await connection.getTokenAccountBalance(account);
  return BigInt(balance.value.amount);
}

export async function fetchSolBalance(owner: PublicKey): Promise<number> {
  return connection.getBalance(owner);
}
