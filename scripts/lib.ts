// Shared helpers for the devnet scripts. Devnet and localnet only.
import { AnchorProvider, BN, Program, Wallet } from "@anchor-lang/core";
import { getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
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

/** A record of what was deployed, for the README. The app reads everything from chain instead. */
export const DEPLOYMENT_FILE =
  process.env.DEPLOYMENT_FILE ?? path.join(__dirname, "..", "idl", "devnet.json");

export type Deployment = {
  programId: string;
  usdMint: string;
  config: string;
  series: { id: number; address: string; vault: string; name: string; maturityTs: number }[];
};

export function rpcUrl(): string {
  const url = process.env.RPC_URL ?? "https://api.devnet.solana.com";
  if (/mainnet/i.test(url)) {
    throw new Error("Refusing to run: RPC URL points at mainnet. This project is devnet only.");
  }
  return url;
}

const isLocal = () => /localhost|127\.0\.0\.1/.test(rpcUrl());

function loadKeypair(file: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8"))));
}

/** The deployer wallet: program admin and test-dollar mint authority. */
export function loadAdmin(): Keypair {
  return loadKeypair(process.env.ANCHOR_WALLET ?? path.join(os.homedir(), ".config", "solana", "id.json"));
}

/** A signer given with `--keypair <file>`, or the admin. */
export function loadSigner(file?: string): Keypair {
  return file ? loadKeypair(file.replace(/^~(?=\/)/, os.homedir())) : loadAdmin();
}

export function connect(signer: Keypair = loadAdmin()) {
  const connection = new Connection(rpcUrl(), "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(signer), { commitment: "confirmed" });
  const program = new Program<Remitroot>(idl as Remitroot, provider);
  return { signer, admin: signer, connection, program };
}

export type Client = ReturnType<typeof connect>;

export function loadDeployment(): Deployment | null {
  if (!fs.existsSync(DEPLOYMENT_FILE)) return null;
  const deployment: Deployment = JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, "utf8"));
  // A file written for another program id describes a different deployment.
  return deployment.programId === idl.address ? deployment : null;
}

export function saveDeployment(deployment: Deployment) {
  fs.writeFileSync(DEPLOYMENT_FILE, JSON.stringify(deployment, null, 2) + "\n");
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

/** The config account, read from chain. */
export async function loadConfig({ program }: Client) {
  const config = await program.account.config.fetchNullable(configPda(program.programId));
  if (!config) throw new Error("The program has no config yet. Run `yarn setup:devnet` first.");
  return config;
}

/** A series by id, or the newest one still open for savings, read from chain. */
export async function loadSeries(client: Client, id?: number) {
  const { program } = client;
  const { seriesCount } = await loadConfig(client);
  const now = Date.now() / 1000;
  for (let candidate = seriesCount.toNumber() - 1; candidate >= 0; candidate--) {
    if (id !== undefined && candidate !== id) continue;
    const address = seriesPda(program.programId, candidate);
    const series = await program.account.bondSeries.fetch(address);
    if (id !== undefined || series.maturityTs.toNumber() > now) return { ...series, id: candidate, address };
  }
  throw new Error(id === undefined ? "No series is open for savings. Create one with `yarn setup:devnet`." : `Series ${id} does not exist.`);
}

export const optionalNumber = (value?: string) => (value === undefined ? undefined : Number(value));

/** Whole test dollars to base units. */
export const usd = (amount: number) => new BN(Math.round(amount * 10 ** USD_DECIMALS));
export const formatUsd = (units: bigint | BN | number) =>
  `$${(Number(units.toString()) / 10 ** USD_DECIMALS).toFixed(2)}`;

const cluster = () => (isLocal() ? `custom&customUrl=${encodeURIComponent(rpcUrl())}` : "devnet");
export const explorerTx = (signature: string) => `https://explorer.solana.com/tx/${signature}?cluster=${cluster()}`;
export const explorerAddress = (address: PublicKey | string) =>
  `https://explorer.solana.com/address/${address.toString()}?cluster=${cluster()}`;

/** Gets (creating if needed, paid by `payer`) the test-dollar account of `owner`. */
export async function tokenAccount(connection: Connection, payer: Keypair, mint: PublicKey, owner: PublicKey) {
  // allowOwnerOffCurve so PDAs can hold test dollars too.
  const account = await getOrCreateAssociatedTokenAccount(connection, payer, mint, owner, true);
  return account.address;
}

/** The faucet: mints test dollars, and optionally sends a little SOL for fees, to `recipient`. */
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

/** Sets the split rule and sends, the way the app does: the position only when something is saved. */
export async function sendRemittance(
  client: Client,
  args: {
    worker: Keypair;
    recipient: PublicKey;
    series: PublicKey;
    vault: PublicKey;
    usdMint: PublicKey;
    amount: number;
    saveBps: number;
    goalAmount?: number;
    goalKind?: number;
  },
) {
  const { program, connection, admin } = client;
  const { worker, recipient, series, vault, usdMint, amount, saveBps } = args;
  const workerToken = await tokenAccount(connection, admin, usdMint, worker.publicKey);
  const recipientToken = await tokenAccount(connection, admin, usdMint, recipient);
  await program.methods
    .setSplitRule(recipient, saveBps, usd(args.goalAmount ?? 0), args.goalKind ?? 0)
    .accountsPartial({ worker: worker.publicKey, series })
    .signers([worker])
    .rpc();
  const saves = usd(amount).muln(saveBps).divn(10_000).gtn(0);
  const signature = await program.methods
    .sendRemittance(usd(amount))
    .accountsPartial({
      worker: worker.publicKey,
      rule: rulePda(program.programId, worker.publicKey),
      series,
      position: saves ? positionPda(program.programId, worker.publicKey, series) : null,
      usdMint,
      workerToken,
      recipientToken,
      vault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([worker])
    .rpc();
  return { signature, workerToken, recipientToken };
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

/** Runs a script; failures print the message and any program logs, and the full error with DEBUG=1. */
export function run(main: () => Promise<void>) {
  main().catch((error) => {
    if (process.env.DEBUG) console.error(error);
    else {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      const logs: string[] | undefined = error?.logs ?? error?.transactionLogs;
      if (logs?.length) console.error(logs.join("\n"));
    }
    process.exit(1);
  });
}
