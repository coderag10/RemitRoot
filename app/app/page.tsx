"use client";

import { ConnectButton, DemoButton } from "@/components/Onboarding";
import { SplitIllustration } from "@/components/SplitIllustration";
import { LinkButton, TextLink } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatNumber, formatUsd } from "@/lib/format";
import { useI18n, type TextKey } from "@/lib/i18n";
import { useAllSeries } from "@/lib/queries";
import { useSession } from "@/lib/session";

const STEPS: { icon: IconName; title: TextKey; text: TextKey }[] = [
  { icon: "edit", title: "landing.how.1.title", text: "landing.how.1.text" },
  { icon: "send", title: "landing.how.2.title", text: "landing.how.2.text" },
  { icon: "sprout", title: "landing.how.3.title", text: "landing.how.3.text" },
];

// Only figures from essentials/09-facts-and-sources.md, each with its source.
const FACTS: { text: TextKey; source: TextKey; href: string }[] = [
  { text: "landing.why.1", source: "landing.why.1.source", href: "https://english.onlinekhabar.com/remittances-nepal-2026.html" },
  { text: "landing.why.2", source: "landing.why.2.source", href: "https://thehimalayantimes.com/business/demand-for-fesbs-subdued" },
];

/** Live totals from the test network: what has been saved through RemitRoot so far. */
function LiveNumbers() {
  const { t, locale } = useI18n();
  const series = useAllSeries();
  if (!series.data?.length) return null;
  const saved = series.data.reduce((sum, s) => sum + s.totalPrincipal, BigInt(0));
  const savers = series.data.reduce((sum, s) => sum + s.saverCount, 0);
  const number = (value: number) => formatNumber(value, locale);
  const stats = [
    { label: t("landing.live.saved"), value: formatUsd(saved, locale) },
    { label: t("landing.live.savers"), value: number(savers) },
    { label: t("landing.live.series"), value: number(series.data.length) },
  ];
  return (
    <section aria-labelledby="live-title" className="flex flex-col gap-2">
      <h2 id="live-title" className="flex items-center gap-2 text-label font-semibold text-stone">
        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-leaf" />
        </span>
        {t("landing.live.title")}
      </h2>
      <dl className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-control border border-line bg-surface p-3">
            <dt className="text-label text-stone">{stat.label}</dt>
            <dd className="tabular truncate text-heading font-bold text-root-deep">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function Landing() {
  const { t } = useI18n();
  const { session } = useSession();
  return (
    <>
      <section className="flex flex-col gap-4 pt-2">
        <h1 className="text-[2rem] font-bold leading-[1.15] text-root-deep">{t("tagline")}</h1>
        <p className="text-[1.1875rem] text-ink">{t("landing.lead")}</p>
        <SplitIllustration />
        {session ? (
          <LinkButton href="/send" icon="send">
            {t("landing.continue")}
          </LinkButton>
        ) : (
          <div className="flex flex-col gap-3">
            <DemoButton />
            <ConnectButton />
            <p className="text-label text-stone">{t("landing.connectHint")}</p>
          </div>
        )}
      </section>

      <LiveNumbers />

      <Card labelledBy="how-title">
        <CardTitle id="how-title">{t("landing.how.title")}</CardTitle>
        <ol className="flex flex-col gap-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-root-soft text-root">
                <Icon name={step.icon} />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-root text-[0.75rem] font-bold text-white">
                  {index + 1}
                </span>
              </span>
              <span>
                <span className="block font-semibold">{t(step.title)}</span>
                <span className="text-stone">{t(step.text)}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <Card tone="marigold" labelledBy="why-title">
        <CardTitle id="why-title">{t("landing.why.title")}</CardTitle>
        <ul className="flex flex-col gap-3">
          {FACTS.map((fact) => (
            <li key={fact.text}>
              <p className="font-semibold">{t(fact.text)}</p>
              <a href={fact.href} target="_blank" rel="noreferrer" className="inline-flex min-h-[40px] items-center gap-1 text-label text-marigold-deep underline">
                {t(fact.source)}
                <Icon name="external" size={14} />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-root-deep">{t("landing.why.insight")}</p>
      </Card>

      <TextLink href="/bond">{t("landing.seeBonds")}</TextLink>
    </>
  );
}
