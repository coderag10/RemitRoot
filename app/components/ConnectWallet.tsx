"use client";

import dynamic from "next/dynamic";

// The wallet button reads browser state, so it is rendered in the browser only.
export const ConnectWallet = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((module) => module.WalletMultiButton),
  { ssr: false },
);
