"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { useState, type ReactNode } from "react";
import { RPC_URL } from "@/lib/env";
import { SessionProvider } from "@/lib/session";
import { TxProvider } from "@/lib/tx";

// Wallets that follow the wallet standard register themselves; none are listed by hand.
const wallets: never[] = [];

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchInterval: 30_000,
            refetchOnWindowFocus: true,
            // The public test network limits requests; back off and try again.
            retry: 3,
            retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider endpoint={RPC_URL}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <SessionProvider>
              <TxProvider>{children}</TxProvider>
            </SessionProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  );
}
