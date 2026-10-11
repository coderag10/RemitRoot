"use client";

import Link from "next/link";
import { DEFAULT_SERIES_ID } from "@/lib/config";
import { shortAddress } from "@/lib/format";
import { t } from "@/lib/i18n";
import { useSession } from "@/lib/session";

export function Header() {
  const { session, leaveDemo } = useSession();
  const link = "flex min-h-[48px] items-center font-semibold text-root underline-offset-4 hover:underline";
  return (
    <header className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-title font-bold text-ink">
          {t("brand.remit")}
          <span className="text-root">{t("brand.root")}</span>
        </Link>
        <nav className="flex gap-4">
          <Link href="/send" className={link}>
            {t("nav.send")}
          </Link>
          <Link href={`/bond/${DEFAULT_SERIES_ID}`} className={link}>
            {t("nav.bond")}
          </Link>
        </nav>
      </div>
      {session && (
        <div className="flex items-center justify-between text-label font-medium text-stone">
          <span>
            {t(session.mode === "demo" ? "wallet.demo" : "wallet.connected")} {shortAddress(session.publicKey)}
          </span>
          {session.mode === "demo" && (
            <button type="button" onClick={leaveDemo} className="min-h-[48px] underline">
              {t("wallet.leave")}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
