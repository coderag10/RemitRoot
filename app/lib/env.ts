// Network settings. Devnet and localnet only: a mainnet URL is refused.

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";

if (/mainnet/i.test(RPC_URL)) {
  throw new Error("RemitRoot is a devnet prototype and refuses to use a mainnet RPC URL.");
}

export const IS_LOCAL = /localhost|127\.0\.0\.1/.test(RPC_URL);

const explorerCluster = IS_LOCAL ? `custom&customUrl=${encodeURIComponent(RPC_URL)}` : "devnet";

export const explorerTx = (signature: string) =>
  `https://explorer.solana.com/tx/${signature}?cluster=${explorerCluster}`;

export const explorerAddress = (address: { toString(): string }) =>
  `https://explorer.solana.com/address/${address.toString()}?cluster=${explorerCluster}`;
