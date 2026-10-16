"use client";

import { monthsToGoal } from "@/lib/chain/math";
import { LIMITS } from "@/lib/chain/program";
import { formatUsd } from "@/lib/format";
import { useI18n, type TextKey } from "@/lib/i18n";
import { Progress } from "./ui/Amount";
import { Icon } from "./ui/Icon";

export const GOAL_KINDS = Array.from({ length: LIMITS.maxGoalKind }, (_, i) => i + 1);
export const goalLabel = (kind: number) => `goal.kind.${kind}` as TextKey;

/** Progress toward the worker's savings goal, with a plain estimate of how far is left. */
export function GoalProgress({
  saved,
  goal,
  kind,
  perTransfer,
}: {
  saved: bigint;
  goal: bigint;
  kind: number;
  /** Saved by one transfer at the current amount and share, for the estimate. */
  perTransfer?: bigint;
}) {
  const { t, locale } = useI18n();
  const reached = saved >= goal;
  const months = perTransfer === undefined ? null : monthsToGoal(saved, goal, perTransfer);
  return (
    <div className="flex flex-col gap-2 rounded-control border border-line bg-paper p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold">
          <Icon name="target" className="text-root" />
          {t(goalLabel(kind))}
        </span>
        <span className="tabular text-label font-semibold text-stone">
          {reached ? t("goal.reached") : t("goal.progress", { saved: formatUsd(saved, locale), goal: formatUsd(goal, locale) })}
        </span>
      </div>
      <Progress value={saved} max={goal} label={t(goalLabel(kind))} />
      {!reached && months !== null && months > 0 && (
        <p className="text-label text-stone">{months === 1 ? t("goal.etaOne") : t("goal.eta", { months })}</p>
      )}
    </div>
  );
}
