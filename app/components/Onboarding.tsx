"use client";

import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { errorKey } from "@/lib/chain/errors";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { Button } from "./ui/Button";
import { Card, CardTitle } from "./ui/Card";
import { ErrorNotice } from "./ui/States";

/** Makes a practice wallet with test dollars, then opens the send page (or stays on it). */
export function DemoButton() {
  const { t } = useI18n();
  const { startDemo } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      await startDemo();
      if (pathname === "/") router.push("/send");
    } catch (cause) {
      setError(`${t("demo.failed")} ${t(errorKey(cause))}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={start} loading={starting} icon={starting ? undefined : "sprout"}>
        {starting ? t("demo.starting") : t("landing.tryDemo")}
      </Button>
      <p className="text-label text-stone">{t("landing.demoHint")}</p>
      {error && <ErrorNotice message={error} onRetry={start} />}
    </div>
  );
}

export function ConnectButton() {
  const { t } = useI18n();
  const { setVisible } = useWalletModal();
  return (
    <Button variant="secondary" icon="wallet" onClick={() => setVisible(true)}>
      {t("wallet.connect")}
    </Button>
  );
}

/** Shown where a wallet is needed and there is none yet. */
export function OnboardCard() {
  const { t } = useI18n();
  return (
    <Card labelledBy="onboard-title">
      <CardTitle id="onboard-title">{t("onboard.title")}</CardTitle>
      <p className="mb-4">{t("onboard.text")}</p>
      <div className="flex flex-col gap-3">
        <DemoButton />
        <ConnectButton />
      </div>
    </Card>
  );
}
