// The demo faucet: tops a wallet up to a fixed level of test dollars and a little devnet SOL for
// fees, and opens a token account for the practice family. It signs with a dedicated faucet key
// (never the program admin key). The mint and token program are read from the program config.
import {
  AccountLayout,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { connection, fetchConfig, usdAccount, type Config } from "@/lib/chain/program";
import { IS_LOCAL } from "@/lib/env";

// Confirming on a busy test network can take a while.
export const maxDuration = 30;

const fail = (error: string, status: number) => Response.json({ error }, { status });

const FAUCET_USD = Number(process.env.FAUCET_USD ?? 1000);
const FAUCET_SOL = Number(process.env.FAUCET_SOL ?? 0.01);
/** Kept back so the faucet can always pay its own fees and new token accounts. */
const RESERVE_LAMPORTS = 0.01 * LAMPORTS_PER_SOL;

// A light brake on one network draining the faucet. Per server instance, so best effort.
const WINDOW_MS = 10 * 60_000;
const MAX_REQUESTS = Number(process.env.FAUCET_MAX_REQUESTS ?? 20);
const recent = new Map<string, number[]>();

function overLimit(request: Request): boolean {
  const caller = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const times = (recent.get(caller) ?? []).filter((time) => now - time < WINDOW_MS);
  times.push(now);
  recent.set(caller, times);
  return times.length > MAX_REQUESTS;
}

function parseKey(value: unknown): PublicKey | null {
  try {
    return typeof value === "string" ? new PublicKey(value) : null;
  } catch {
    return null;
  }
}

let config: Config | null = null;

export async function POST(request: Request) {
  const secret = process.env.FAUCET_SECRET_KEY;
  if (!secret) return fail("error.faucetOff", 503);
  if (!IS_LOCAL && overLimit(request)) return fail("error.faucetLimit", 429);

  const body = await request.json().catch(() => null);
  const worker = parseKey(body?.worker);
  const family = body?.family ? parseKey(body.family) : null;
  if (!worker || (body?.family && !family)) return fail("error.busy", 400);

  try {
    config ??= await fetchConfig();
    if (!config) return fail("error.notSetUp", 503);
    const faucet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)));
    const decimals = BigInt(10 ** config.decimals);
    const faucetToken = usdAccount(config, faucet.publicKey);
    const workerToken = usdAccount(config, worker);

    // One request for all four accounts; the public test network limits requests.
    const [workerInfo, workerTokenInfo, faucetInfo, faucetTokenInfo] = await connection.getMultipleAccountsInfo([
      worker,
      workerToken,
      faucet.publicKey,
      faucetToken,
    ]);
    const tokens = (info: typeof workerTokenInfo) => (info ? AccountLayout.decode(info.data).amount : BigInt(0));

    // Top up to a fixed level, so asking again never gives one wallet more than that.
    const lamports = Math.max(0, Math.round(FAUCET_SOL * LAMPORTS_PER_SOL) - (workerInfo?.lamports ?? 0));
    const target = BigInt(Math.round(FAUCET_USD)) * decimals;
    const usd = tokens(workerTokenInfo) < target ? target - tokens(workerTokenInfo) : BigInt(0);
    if (tokens(faucetTokenInfo) < usd || (faucetInfo?.lamports ?? 0) < lamports + RESERVE_LAMPORTS) {
      return fail("error.faucetEmpty", 503);
    }

    const tx = new Transaction();
    if (lamports > 0) tx.add(SystemProgram.transfer({ fromPubkey: faucet.publicKey, toPubkey: worker, lamports }));
    const open = (owner: PublicKey) =>
      createAssociatedTokenAccountIdempotentInstruction(
        faucet.publicKey,
        usdAccount(config!, owner),
        owner,
        config!.usdMint,
        config!.tokenProgram,
      );
    tx.add(open(worker));
    if (family) tx.add(open(family));
    if (usd > BigInt(0)) {
      tx.add(
        createTransferCheckedInstruction(
          faucetToken,
          config.usdMint,
          workerToken,
          faucet.publicKey,
          usd,
          config.decimals,
          [],
          config.tokenProgram,
        ),
      );
    }
    const signature = await sendAndConfirmTransaction(connection, tx, [faucet]);
    return Response.json({ signature });
  } catch (error) {
    console.error("faucet failed:", error instanceof Error ? error.message : error);
    return fail("error.busy", 502);
  }
}
