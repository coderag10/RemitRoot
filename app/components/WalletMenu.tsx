"use client";

import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useEffect, useRef, useState } from "react";
import { explorerAddress } from "@/lib/env";
import { shortAddress } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { Icon } from "./ui/Icon";

/** The wallet chip in the header: who you are acting as, and how to stop. */
export function WalletMenu() {
  const { t } = useI18n();
  const { session, leaveDemo, disconnect } = useSession();
  const { setVisible } = useWalletModal();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!session) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        className="flex min-h-[40px] items-center gap-1.5 rounded-full border border-root px-3 text-label font-bold text-root hover:bg-root-soft"
      >
        <Icon name="wallet" size={16} />
        <span className="hidden sm:inline">{t("wallet.connect")}</span>
      </button>
    );
  }

  const address = session.publicKey.toBase58();
  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("wallet.menu")}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[40px] min-w-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-3 text-label font-semibold hover:border-root"
      >
        <span className={`h-2.5 w-2.5 rounded-full ${session.mode === "demo" ? "bg-marigold" : "bg-leaf"}`} aria-hidden="true" />
        {/* On the narrowest phones the address lives in the menu; the dot still shows which wallet. */}
        <Icon name="wallet" size={16} className="min-[400px]:hidden" />
        <span className="tabular hidden min-[400px]:inline">{shortAddress(address)}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="animate-rise absolute right-0 top-full z-40 mt-2 w-64 rounded-card border border-line bg-surface p-2 shadow-float"
        >
          <p className="px-3 pb-2 pt-1 text-label text-stone">
            {t(session.mode === "demo" ? "wallet.demo" : "wallet.connected")}
            <span className="tabular block break-all font-semibold text-ink">{address}</span>
          </p>
          <button role="menuitem" type="button" onClick={copy} className="flex min-h-[44px] w-full items-center gap-2 rounded-control px-3 text-left hover:bg-paper">
            <Icon name={copied ? "check" : "copy"} size={18} />
            {t(copied ? "wallet.copied" : "wallet.copy")}
          </button>
          <a
            role="menuitem"
            href={explorerAddress(address)}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[44px] items-center gap-2 rounded-control px-3 hover:bg-paper"
          >
            <Icon name="external" size={18} />
            {t("tx.explorer")}
          </a>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              if (session.mode === "demo") leaveDemo();
              else void disconnect();
            }}
            className="flex min-h-[44px] w-full items-center gap-2 rounded-control px-3 text-left text-brick hover:bg-brick-soft"
          >
            <Icon name="close" size={18} />
            {t(session.mode === "demo" ? "wallet.leaveDemo" : "wallet.disconnect")}
          </button>
        </div>
      )}
    </div>
  );
}
