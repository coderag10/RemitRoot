"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";

/** Loading: grey bars in the shape of what is coming, never a spinner alone. */
export function Skeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  const { t } = useI18n();
  return (
    <div role="status" aria-label={t("common.loading")} className={`flex animate-pulse flex-col gap-3 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={`h-6 rounded-md bg-line ${i === 0 ? "w-2/3" : i % 2 ? "w-full" : "w-5/6"}`} />
      ))}
    </div>
  );
}

/** Empty: say what will appear here and how to get it. */
export function EmptyState({ icon, children, action }: { icon: IconName; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line px-4 py-6 text-center text-stone">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-root-soft text-root">
        <Icon name={icon} size={24} />
      </span>
      <p>{children}</p>
      {action}
    </div>
  );
}

/** Error: plain words and a way to try again. */
export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-control border border-brick/40 bg-brick-soft p-3 text-brick">
      <p className="flex gap-2">
        <Icon name="alert" className="mt-1 shrink-0" />
        <span>{message}</span>
      </p>
      {onRetry && (
        <Button variant="danger" full={false} onClick={onRetry} className="self-start">
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

/** A quiet notice for state that is not an error, like the pause. */
export function Notice({ children, tone = "marigold", icon = "alert" }: { children: ReactNode; tone?: "marigold" | "root"; icon?: IconName }) {
  const tones = { marigold: "border-marigold/50 bg-marigold-soft text-ink", root: "border-root/30 bg-root-soft text-ink" };
  return (
    <div role="status" className={`flex gap-2 rounded-control border p-3 ${tones[tone]}`}>
      <Icon name={icon} className="mt-1 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
