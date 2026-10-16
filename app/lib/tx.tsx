"use client";

// Runs a transaction for the current session and reports it as a toast: waiting, confirmed with
// an explorer link, or failed in plain words. Chain reads refresh afterwards.
import type { Transaction } from "@solana/web3.js";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { errorKey } from "./chain/errors";
import type { TextKey, TextValues } from "./i18n";
import { useRefreshChain } from "./queries";
import { useSession } from "./session";

export type Toast = {
  id: number;
  status: "pending" | "confirmed" | "failed";
  title: TextKey;
  values?: TextValues;
  signature?: string;
  error?: TextKey;
};

type TxContextValue = {
  toasts: Toast[];
  dismiss: (id: number) => void;
  notify: (toast: Omit<Toast, "id">) => number;
};

const TxContext = createContext<TxContextValue | null>(null);
let nextId = 1;

export function TxProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((toast) => toast.id !== id)), []);
  const notify = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = nextId++;
      setToasts((all) => [...all.slice(-2), { ...toast, id }]);
      if (toast.status === "confirmed") setTimeout(() => dismiss(id), 8_000);
      return id;
    },
    [dismiss],
  );
  const value = useMemo(() => ({ toasts, dismiss, notify }), [toasts, dismiss, notify]);
  return <TxContext.Provider value={value}>{children}</TxContext.Provider>;
}

export function useToasts() {
  const context = useContext(TxContext);
  if (!context) throw new Error("useToasts must be used inside TxProvider");
  return context;
}

export type TxResult = { ok: true; signature: string; seconds: number } | { ok: false; error: TextKey };

/** `run(title, build)` builds, signs and confirms a transaction, then refreshes chain reads. */
export function useTransaction() {
  const { session } = useSession();
  const { notify, dismiss } = useToasts();
  const refresh = useRefreshChain();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (title: TextKey, build: () => Promise<Transaction>, values?: TextValues): Promise<TxResult> => {
      if (!session) return { ok: false, error: "error.busy" };
      setBusy(true);
      const started = Date.now();
      const pending = notify({ status: "pending", title, values });
      try {
        const signature = await session.send(await build());
        dismiss(pending);
        notify({ status: "confirmed", title, values, signature });
        await refresh();
        return { ok: true, signature, seconds: (Date.now() - started) / 1000 };
      } catch (cause) {
        dismiss(pending);
        const error = errorKey(cause);
        notify({ status: "failed", title, values, error });
        await refresh();
        return { ok: false, error };
      } finally {
        setBusy(false);
      }
    },
    [session, notify, dismiss, refresh],
  );
  return { run, busy };
}
