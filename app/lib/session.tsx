"use client";

// The wallet the visitor acts with: their own connected wallet, or a practice wallet made for
// the demo together with a practice family wallet to send to.
import { useWallet } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { connection } from "./chain/program";

export type Session = {
  mode: "demo" | "wallet";
  publicKey: PublicKey;
  /** The practice family wallet in the demo; a connected wallet chooses its own recipient. */
  demoFamily: PublicKey | null;
  /** Signs, sends and confirms. Resolves to the signature once confirmed. */
  send: (tx: Transaction) => Promise<string>;
};

type SessionContextValue = {
  session: Session | null;
  startDemo: () => Promise<void>;
  leaveDemo: () => void;
  disconnect: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/** Asks the faucet route to top `worker` up with test dollars and a little SOL for fees. */
export async function requestFaucet(worker: PublicKey, family?: PublicKey | null) {
  const response = await fetch("/api/faucet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ worker: worker.toBase58(), family: family?.toBase58() }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "error.busy");
  }
}

async function confirm(signature: string, blockhash: string, lastValidBlockHeight: number) {
  const result = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  if (result.value.err) {
    // Fetch the logs so the error can be explained in plain words.
    const tx = await connection.getTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
    const error = new Error(`Transaction failed: ${JSON.stringify(result.value.err)}`) as Error & { logs?: string[] };
    error.logs = tx?.meta?.logMessages ?? [];
    throw error;
  }
  return signature;
}

// The practice wallet is kept for this browser tab only, so a refresh mid-flow keeps it. It
// holds valueless test tokens and is forgotten when the tab closes or the visitor leaves the demo.
type Demo = { worker: Keypair; family: PublicKey };
const DEMO_KEY = "remitroot-demo";
let demoState: Demo | null | undefined;
const demoListeners = new Set<() => void>();

function readDemo(): Demo | null {
  if (demoState !== undefined) return demoState;
  demoState = null;
  try {
    const stored = JSON.parse(sessionStorage.getItem(DEMO_KEY) ?? "null");
    if (stored) {
      demoState = { worker: Keypair.fromSecretKey(Uint8Array.from(stored.worker)), family: new PublicKey(stored.family) };
    }
  } catch {
    // Storage is blocked or the entry is damaged: start without a practice wallet.
  }
  return demoState;
}

function writeDemo(demo: Demo | null) {
  demoState = demo;
  try {
    if (demo) {
      sessionStorage.setItem(
        DEMO_KEY,
        JSON.stringify({ worker: Array.from(demo.worker.secretKey), family: demo.family.toBase58() }),
      );
    } else {
      sessionStorage.removeItem(DEMO_KEY);
    }
  } catch {
    // Without storage the wallet still works until the page is refreshed.
  }
  demoListeners.forEach((listener) => listener());
}

function subscribeDemo(listener: () => void) {
  demoListeners.add(listener);
  return () => {
    demoListeners.delete(listener);
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const demo = useSyncExternalStore(subscribeDemo, readDemo, () => null);

  const startDemo = useCallback(async () => {
    const worker = Keypair.generate();
    const family = Keypair.generate().publicKey;
    await requestFaucet(worker.publicKey, family);
    writeDemo({ worker, family });
  }, []);
  const leaveDemo = useCallback(() => writeDemo(null), []);
  const { disconnect: walletDisconnect } = wallet;
  const disconnect = useCallback(async () => {
    writeDemo(null);
    await walletDisconnect().catch(() => undefined);
  }, [walletDisconnect]);

  const { publicKey, sendTransaction } = wallet;
  const session = useMemo<Session | null>(() => {
    // A practice wallet takes priority while it exists, so leaving the demo is explicit.
    if (demo) {
      return {
        mode: "demo",
        publicKey: demo.worker.publicKey,
        demoFamily: demo.family,
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
    if (!publicKey) return null;
    return {
      mode: "wallet",
      publicKey,
      demoFamily: null,
      send: async (tx) => {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        tx.feePayer = publicKey;
        tx.recentBlockhash = blockhash;
        const signature = await sendTransaction(tx, connection);
        return confirm(signature, blockhash, lastValidBlockHeight);
      },
    };
  }, [demo, publicKey, sendTransaction]);

  const value = useMemo(() => ({ session, startDemo, leaveDemo, disconnect }), [session, startDemo, leaveDemo, disconnect]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
