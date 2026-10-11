import Link from "next/link";
import { DemoButton } from "@/components/DemoButton";
import { Card } from "@/components/ui";
import { WalletEntry } from "@/components/WalletEntry";
import { DEFAULT_SERIES_ID } from "@/lib/config";
import { t } from "@/lib/i18n";

const steps = [
  ["landing.step1.title", "landing.step1.text"],
  ["landing.step2.title", "landing.step2.text"],
  ["landing.step3.title", "landing.step3.text"],
] as const;

export default function Landing() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <h1 className="text-title font-bold leading-tight text-root-deep">{t("tagline")}</h1>
        <p>{t("landing.lead")}</p>
      </div>

      {/* One line comes down and splits: most to the family, part into savings. */}
      <div className="flex flex-col gap-1" aria-hidden="true">
        <div className="flex h-4 overflow-hidden rounded-full">
          <div className="w-[85%] bg-marigold" />
          <div className="w-[15%] bg-root" />
        </div>
        <div className="flex justify-between text-label font-medium text-stone">
          <span>{t("landing.split.family")}</span>
          <span>{t("landing.split.saved")}</span>
        </div>
      </div>

      <DemoButton />
      <WalletEntry />

      <Card className="flex flex-col gap-4">
        <h2 className="text-heading font-semibold text-root-deep">{t("landing.howTitle")}</h2>
        <ol className="flex flex-col gap-3">
          {steps.map(([title, text], index) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-root font-bold text-white">
                {index + 1}
              </span>
              <span>
                <span className="block font-semibold">{t(title)}</span>
                <span className="text-stone">{t(text)}</span>
              </span>
            </li>
          ))}
        </ol>
        <Link
          href={`/bond/${DEFAULT_SERIES_ID}`}
          className="flex min-h-[48px] items-center font-semibold text-root underline"
        >
          {t("landing.seeBond")}
        </Link>
      </Card>

      <p className="text-label text-stone">{t("landing.disclaimer")}</p>
    </>
  );
}
