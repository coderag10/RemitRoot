import type { ButtonHTMLAttributes, ReactNode } from "react";
import { t } from "@/lib/i18n";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-card border border-line bg-surface p-4 ${className}`}>{children}</section>
  );
}

const buttonBase =
  "flex min-h-[52px] w-full items-center justify-center rounded-control px-4 text-body font-semibold disabled:opacity-50";
export const primaryButton = `${buttonBase} bg-root text-white hover:bg-root-deep`;
export const secondaryButton = `${buttonBase} border border-root bg-surface text-root hover:bg-paper`;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  return (
    <button
      type="button"
      className={`${variant === "primary" ? primaryButton : secondaryButton} ${className}`}
      {...props}
    />
  );
}

/** A labelled amount. Colour is never the only cue: every amount has its label. */
export function Amount({
  label,
  value,
  tone = "ink",
  big = false,
}: {
  label: string;
  value: string;
  tone?: "ink" | "root" | "marigold";
  big?: boolean;
}) {
  const bar = { ink: "border-line", root: "border-root", marigold: "border-marigold" }[tone];
  return (
    <div className={`border-l-4 pl-3 ${bar}`}>
      <div className="text-label font-medium text-stone">{label}</div>
      <div className={`font-bold tabular-nums ${big ? "text-amount leading-tight" : "text-heading"}`}>
        {value}
      </div>
    </div>
  );
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-control border border-brick bg-surface p-3 text-brick">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-1 min-h-[48px] font-semibold underline">
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div role="status" aria-label={t("common.loading")} className="flex animate-pulse flex-col gap-3">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-6 rounded bg-line" />
      ))}
    </div>
  );
}
