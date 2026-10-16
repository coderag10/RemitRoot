"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useI18n, type TextKey } from "@/lib/i18n";
import { LanguageToggle } from "./LanguageToggle";
import { LogoMark, Wordmark } from "./Logo";
import { Icon, type IconName } from "./ui/Icon";
import { WalletMenu } from "./WalletMenu";

const TABS: { href: string; label: TextKey; icon: IconName }[] = [
  { href: "/send", label: "nav.send", icon: "send" },
  { href: "/family", label: "nav.family", icon: "family" },
  { href: "/bond", label: "nav.bonds", icon: "bond" },
  { href: "/history", label: "nav.history", icon: "history" },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function HeaderLinks({ pathname }: { pathname: string }) {
  const { t } = useI18n();
  return (
    <>
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={isActive(pathname, tab.href) ? "page" : undefined}
          className={`flex min-h-[44px] items-center rounded-full px-4 font-semibold transition-colors ${
            isActive(pathname, tab.href) ? "bg-root-soft text-root-deep" : "text-stone hover:text-ink"
          }`}
        >
          {t(tab.label)}
        </Link>
      ))}
    </>
  );
}

// The active tab depends on the URL, which is only known at request time; the links themselves
// are in the static shell.
function ActiveHeaderLinks() {
  return <HeaderLinks pathname={usePathname()} />;
}

export function Header() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[960px] items-center justify-between gap-2 px-4">
        <Link href="/" className="flex min-h-[48px] min-w-0 items-center gap-1.5" aria-label={`${t("brand.remit")}${t("brand.root")}`}>
          <LogoMark />
          <Wordmark remit={t("brand.remit")} root={t("brand.root")} />
        </Link>
        <nav aria-label={t("nav.main")} className="hidden items-center gap-1 md:flex">
          <Suspense fallback={<HeaderLinks pathname="" />}>
            <ActiveHeaderLinks />
          </Suspense>
        </nav>
        <div className="flex shrink-0 items-center gap-1.5">
          <LanguageToggle />
          <WalletMenu />
        </div>
      </div>
    </header>
  );
}

function BottomTabs({ pathname }: { pathname: string }) {
  const { t } = useI18n();
  return (
    <ul className="mx-auto grid max-w-[480px] grid-cols-4">
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <li key={tab.href}>
            <Link
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-label font-semibold ${
                active ? "text-root" : "text-stone"
              }`}
            >
              <Icon name={tab.icon} size={22} />
              {t(tab.label)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ActiveBottomTabs() {
  return <BottomTabs pathname={usePathname()} />;
}

/** Thumb-reach tabs on phones; the header carries them on wider screens. */
export function BottomNav() {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t("nav.main")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <Suspense fallback={<BottomTabs pathname="" />}>
        <ActiveBottomTabs />
      </Suspense>
    </nav>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mx-auto mt-8 flex w-full max-w-[480px] flex-col gap-1 px-4 pb-28 text-label text-stone md:max-w-[960px] md:pb-10">
      <p>{t("landing.disclaimer")}</p>
      <p>
        <Link href="/issuer" className="inline-flex min-h-[44px] items-center font-semibold text-root underline-offset-4 hover:underline">
          {t("nav.issuer")}
        </Link>
      </p>
    </footer>
  );
}
