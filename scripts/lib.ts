// Shared helpers for the devnet scripts. Devnet and localnet only.
import { AnchorProvider, BN, Program, Wallet } from "@anchor-lang/core";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import idl from "../idl/remitroot.json";
import type { Remitroot } from "../idl/remitroot";

export const USD_DECIMALS = 6;
export const ADDRESSES_FILE =
  process.env.ADDRESSES_FILE ?? path.join(__dirname, "..", "idl", "devnet.json");

export type Addresses = {
  programId: string;
  usdMint: string;
  config: string;
  /** Series created so far, newest last. */
  series: { id: number; address: string; vault: string; name: string; maturityTs: number }[];
};

export function rpcUrl(): string {
  const url = process.env.RPC_URL ?? "https://api.devnet.solana.com";
  if (/mainnet/i.test(url)) {
    throw new Error("Refusing to run: RPC URL points at mainnet. This project is devnet only.");
  }
  return url;
}

/** The deployer wallet: program admin, bond issuer and test-dollar mint authority. */
export function loadAdmin(): Keypair {
  const file = process.env.ANCHOR_WALLET ?? path.join(os.homedir(), ".config", "solana", "id.json");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8"))));
}

export function connect() {
  const admin = loadAdmin();
  const connection = new Connection(rpcUrl(), "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(admin), { commitment: "confirmed" });
  const program = new Program<Remitroot>(idl as Remitroot, provider);
  return { admin, connection, program };
}

export function loadAddresses(): Addresses | null {
  if (!fs.existsSync(ADDRESSES_FILE)) return null;
  return JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
}

export function requireAddresses(): Addresses {
  const addresses = loadAddresses();
  if (!addresses || addresses.series.length === 0) {
    throw new Error("No devnet addresses yet. Run `yarn setup:devnet` first.");
  }
  return addresses;
}

export function saveAddresses(addresses: Addresses) {
  fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(addresses, null, 2) + "\n");
}

/** Picks a series by id, or the newest when no id is given. */
export function pickSeries(addresses: Addresses, id?: number) {
  const series = id === undefined ? addresses.series.at(-1) : addresses.series.find((s) => s.id === id);
  if (!series) throw new Error(`Series ${id} is not in ${ADDRESSES_FILE}`);
  return { ...series, address: new PublicKey(series.address), vault: new PublicKey(series.vault) };
}

const pda = (programId: PublicKey, ...seeds: (Buffer | Uint8Array)[]) =>
  PublicKey.findProgramAddressSync(seeds, programId)[0];

export const configPda = (programId: PublicKey) => pda(programId, Buffer.from("config"));
export const seriesPda = (programId: PublicKey, id: number | BN) =>
  pda(programId, Buffer.from("series"), new BN(id).toArrayLike(Buffer, "le", 8));
export const vaultPda = (programId: PublicKey, series: PublicKey) =>
  pda(programId, Buffer.from("vault"), series.toBuffer());
export const rulePda = (programId: PublicKey, worker: PublicKey) =>
  pda(programId, Buffer.from("rule"), worker.toBuffer());
export const positionPda = (programId: PublicKey, worker: PublicKey, series: PublicKey) =>
  pda(programId, Buffer.from("position"), worker.toBuffer(), series.toBuffer());
export const proceedsPda = (programId: PublicKey, series: PublicKey, index: number) =>
  pda(programId, Buffer.from("proceeds"), series.toBuffer(), new BN(index).toArrayLike(Buffer, "le", 4));

/** Whole test dollars to base units. */
export const usd = (amount: number) => new BN(Math.round(amount * 10 ** USD_DECIMALS));
export const formatUsd = (units: bigint | BN | number) =>
  `$${(Number(units.toString()) / 10 ** USD_DECIMALS).toFixed(2)}`;

export const explorerTx = (signature: string) =>
  `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
export const explorerAddress = (address: PublicKey | string) =>
  `https://explorer.solana.com/address/${address.toString()}?cluster=devnet`;

/** Gets (creating if needed, paid by the admin) the test-dollar account of `owner`. */
export async function tokenAccount(
  connection: Connection,
  admin: Keypair,
  mint: PublicKey,
  owner: PublicKey,
) {
  // allowOwnerOffCurve so PDAs can hold test dollars too.
  const account = await getOrCreateAssociatedTokenAccount(connection, admin, mint, owner, true);
  return account.address;
}

/** The faucet: sends test dollars, and optionally a little SOL for fees, to `recipient`. */
export async function fund(
  connection: Connection,
  admin: Keypair,
  mint: PublicKey,
  recipient: PublicKey,
  usdAmount: number,
  solAmount = 0,
) {
  if (solAmount > 0) {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: admin.publicKey,
        toPubkey: recipient,
        lamports: Math.round(solAmount * LAMPORTS_PER_SOL),
      }),
    );
    await sendAndConfirmTransaction(connection, tx, [admin]);
  }
  const account = await tokenAccount(connection, admin, mint, recipient);
  if (usdAmount > 0) {
    await mintTo(connection, admin, mint, account, admin, BigInt(usd(usdAmount).toString()));
  }
  return account;
}

export { TOKEN_PROGRAM_ID };

/** Reads `--name value` flags; bare words are positional. */
export function parseArgs(argv = process.argv.slice(2)) {
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) flags[argv[i].slice(2)] = argv[++i] ?? "";
    else positional.push(argv[i]);
  }
  return { flags, positional };
}

export function run(main: () => Promise<void>) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
