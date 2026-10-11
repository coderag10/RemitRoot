import { PublicKey } from "@solana/web3.js";

// Devnet and localnet only. The addresses match idl/devnet.json at the repo root.
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
if (/mainnet/i.test(RPC_URL)) {
  throw new Error("RemitRoot is a devnet prototype and refuses to use a mainnet RPC URL.");
}

export const USD_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USD_MINT ?? "6KXvkDwG51KtsvMGLhWp1R5EYjx3BemGrhqQ1ZuF7Rku",
);
export const USD_DECIMALS = 6;
export const DEFAULT_SERIES_ID = Number(process.env.NEXT_PUBLIC_SERIES_ID ?? 0);

export const MAX_SAVE_BPS = 5000;
export const DEFAULT_SAVE_BPS = 1500;
export const SECONDS_PER_YEAR = 31_536_000;

/** What the faucet gives a new visitor. */
export const FAUCET_USD = 1000;
export const FAUCET_SOL = 0.006;

const explorerCluster = /localhost|127\.0\.0\.1/.test(RPC_URL)
  ? `custom&customUrl=${encodeURIComponent(RPC_URL)}`
  : "devnet";
export const explorerTx = (signature: string) =>
  `https://explorer.solana.com/tx/${signature}?cluster=${explorerCluster}`;
export const explorerAddress = (address: PublicKey | string) =>
  `https://explorer.solana.com/address/${address.toString()}?cluster=${explorerCluster}`;
