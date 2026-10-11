"use client";

// The wallet the visitor acts with: a connected wallet, or a practice wallet made for the demo.
import { useWallet } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { connection } from "./program";

export type Session = {
  mode: "demo" | "wallet";
  publicKey: PublicKey;
  /** The practice family wallet; a connected wallet types its own recipient. */
  family: PublicKey | null;
  /** Signs, sends and confirms. Returns the transaction signature. */
  send: (tx: Transaction) => Promise<string>;
};

type SessionContext = {
  session: Session | null;
  startDemo: () => Promise<void>;
  leaveDemo: () => void;
};

const Context = createContext<SessionContext | null>(null);

/** Asks the faucet route to top `worker` up with test dollars and a little SOL for fees. */
export async function requestFaucet(worker: PublicKey, recipient?: PublicKey | null) {
  const response = await fetch("/api/faucet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ worker: worker.toBase58(), recipient: recipient?.toBase58() }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "error.busy");
  }
}

async function confirm(signature: string, blockhash: string, lastValidBlockHeight: number) {
  const result = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  if (result.value.err) throw new Error(`Transaction failed: ${JSON.stringify(result.value.err)}`);
  return signature;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  // Practice keys live in memory only and are gone on refresh.
  const [demo, setDemo] = useState<{ worker: Keypair; family: PublicKey } | null>(null);

  const startDemo = useCallback(async () => {
    const worker = Keypair.generate();
    const family = Keypair.generate().publicKey;
    await requestFaucet(worker.publicKey, family);
    setDemo({ worker, family });
  }, []);
  const leaveDemo = useCallback(() => setDemo(null), []);

  const session = useMemo<Session | null>(() => {
    if (demo) {
      return {
        mode: "demo",
        publicKey: demo.worker.publicKey,
        family: demo.family,
        send: async (tx) => {
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
          tx.feePayer = demo.worker.publicKey;
          tx.recentBlockhash = blockhash;
          tx.sign(demo.worker);
          const signature = await connection.sendRawTransaction(tx.serialize());
          return confirm(signature, blockhash, lastValidBlockHeight);
        },
      };
    }
    const { publicKey, sendTransaction } = wallet;
    if (!publicKey) return null;
    return {
      mode: "wallet",
      publicKey,
      family: null,
      send: async (tx) => {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        tx.feePayer = publicKey;
        tx.recentBlockhash = blockhash;
        const signature = await sendTransaction(tx, connection);
        return confirm(signature, blockhash, lastValidBlockHeight);
      },
    };
  }, [demo, wallet]);

  const value = useMemo(() => ({ session, startDemo, leaveDemo }), [session, startDemo, leaveDemo]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSession(): SessionContext {
  const context = useContext(Context);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
