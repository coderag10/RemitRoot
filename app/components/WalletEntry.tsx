"use client";

import Link from "next/link";
import { t } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { ConnectWallet } from "./ConnectWallet";
import { secondaryButton } from "./ui";

/** The second way in: a visitor's own devnet wallet. */
export function WalletEntry() {
  const { session } = useSession();
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-label font-medium text-stone">{t("landing.or")}</p>
      <ConnectWallet />
      {session?.mode === "wallet" && (
        <Link href="/send" className={secondaryButton}>
          {t("landing.continue")}
        </Link>
      )}
    </div>
  );
}
