// The demo faucet: tops a wallet up with test dollars and a little devnet SOL for fees.
// It signs with a dedicated faucet key, never the program admin key.
import {
  AccountLayout,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
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
import { FAUCET_SOL, FAUCET_USD, RPC_URL, USD_DECIMALS, USD_MINT } from "@/lib/config";

const fail = (error: string, status: number) => Response.json({ error }, { status });

// Confirming on a busy test network can take a while.
export const maxDuration = 30;

// A light brake on one network draining the faucet. It is per server instance, so best effort.
const WINDOW_MS = 10 * 60_000;
const MAX_REQUESTS = 20;
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

export async function POST(request: Request) {
  const secret = process.env.FAUCET_SECRET_KEY;
  if (!secret) return fail("error.faucetOff", 503);
  const rpcUrl = process.env.RPC_URL ?? RPC_URL;
  if (/mainnet/i.test(rpcUrl)) return fail("error.faucetOff", 503);

  if (overLimit(request)) return fail("error.faucetLimit", 429);

  const body = await request.json().catch(() => null);
  const worker = parseKey(body?.worker);
  const recipient = body?.recipient ? parseKey(body.recipient) : null;
  if (!worker || (body?.recipient && !recipient)) return fail("error.busy", 400);

  try {
    const faucet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)));
    const connection = new Connection(rpcUrl, "confirmed");
    const faucetToken = getAssociatedTokenAddressSync(USD_MINT, faucet.publicKey);
    const workerToken = getAssociatedTokenAddressSync(USD_MINT, worker, true);

    // One request for all four accounts; the public test network limits requests.
    const [workerInfo, workerTokenInfo, faucetInfo, faucetTokenInfo] = await connection.getMultipleAccountsInfo([
      worker,
      workerToken,
      faucet.publicKey,
      faucetToken,
    ]);
    const tokenAmount = (info: typeof workerTokenInfo) => (info ? AccountLayout.decode(info.data).amount : BigInt(0));
    const workerLamports = workerInfo?.lamports ?? 0;
    const faucetLamports = faucetInfo?.lamports ?? 0;
    const workerUsd = tokenAmount(workerTokenInfo);
    const faucetUsd = tokenAmount(faucetTokenInfo);

    // Top up to a fixed level, so asking again never gives one wallet more than that.
    const lamports = Math.max(0, Math.round(FAUCET_SOL * LAMPORTS_PER_SOL) - workerLamports);
    const targetUsd = BigInt(FAUCET_USD) * BigInt(10 ** USD_DECIMALS);
    const usd = workerUsd < targetUsd ? targetUsd - workerUsd : BigInt(0);
    // Leave room for the two token accounts the faucet may have to create.
    if (faucetUsd < usd || faucetLamports < lamports + 0.006 * LAMPORTS_PER_SOL) {
      return fail("error.faucetEmpty", 503);
    }

    const tx = new Transaction();
    if (lamports > 0) {
      tx.add(SystemProgram.transfer({ fromPubkey: faucet.publicKey, toPubkey: worker, lamports }));
    }
    tx.add(createAssociatedTokenAccountIdempotentInstruction(faucet.publicKey, workerToken, worker, USD_MINT));
    if (recipient) {
      const recipientToken = getAssociatedTokenAddressSync(USD_MINT, recipient, true);
      tx.add(createAssociatedTokenAccountIdempotentInstruction(faucet.publicKey, recipientToken, recipient, USD_MINT));
    }
    if (usd > BigInt(0)) {
      tx.add(createTransferCheckedInstruction(faucetToken, USD_MINT, workerToken, faucet.publicKey, usd, USD_DECIMALS));
    }
    const signature = await sendAndConfirmTransaction(connection, tx, [faucet]);
    return Response.json({ signature });
  } catch (error) {
    console.error("faucet failed:", error instanceof Error ? error.message : error);
    return fail("error.busy", 502);
  }
}
