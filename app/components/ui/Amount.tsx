import type { ReactNode } from "react";

type Tone = "ink" | "root" | "marigold";

/** A labelled figure. Colour is never the only cue: every amount carries its label. */
export function Amount({
  label,
  value,
  tone = "ink",
  size = "md",
  hint,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  hint?: ReactNode;
}) {
  const bar = { ink: "border-line", root: "border-root", marigold: "border-marigold" }[tone];
  const text = { sm: "text-body", md: "text-heading", lg: "text-amount leading-tight" }[size];
  return (
    <div className={`min-w-0 border-l-4 pl-3 ${bar}`}>
      <div className="text-label font-medium text-stone">{label}</div>
      <div className={`tabular break-words font-bold ${text}`}>{value}</div>
      {hint && <div className="text-label text-stone">{hint}</div>}
    </div>
  );
}

/** A horizontal progress bar with an accessible value. */
export function Progress({
  value,
  max,
  tone = "root",
  label,
}: {
  value: bigint | number;
  max: bigint | number;
  tone?: "root" | "marigold" | "brick";
  label: string;
}) {
  const maxNumber = Number(max);
  const percent = maxNumber > 0 ? Math.min(100, (Number(value) / maxNumber) * 100) : 0;
  const fill = { root: "bg-root", marigold: "bg-marigold", brick: "bg-brick" }[tone];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className="h-3 overflow-hidden rounded-full bg-line"
    >
      <div className={`h-full rounded-full transition-[width] duration-500 ${fill}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

export function Pill({ children, tone = "root" }: { children: ReactNode; tone?: "root" | "stone" | "marigold" | "brick" }) {
  const tones = {
    root: "bg-root-soft text-root-deep",
    stone: "bg-line text-ink",
    marigold: "bg-marigold-soft text-marigold-deep",
    brick: "bg-brick-soft text-brick",
  };
  return <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-label font-semibold ${tones[tone]}`}>{children}</span>;
}
