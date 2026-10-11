"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { errorText } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { Button, ErrorNotice } from "./ui";

/** Makes a practice wallet with test dollars, then opens the send page. */
export function DemoButton() {
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
      // Started from the send page itself: stay, so a chosen `?series=` is kept.
      if (pathname !== "/send") router.push("/send");
    } catch (cause) {
      setError(`${t("demo.failed")} ${errorText(cause)}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={start} disabled={starting}>
        {starting ? t("demo.starting") : t("landing.tryDemo")}
      </Button>
      <p className="text-label text-stone">{t("landing.demoHint")}</p>
      {error && <ErrorNotice message={error} onRetry={start} />}
    </div>
  );
}
