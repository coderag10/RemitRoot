"use client";

import { explorerTx } from "@/lib/env";
import { useI18n } from "@/lib/i18n";
import { useToasts } from "@/lib/tx";
import { Icon } from "./ui/Icon";

/** Transaction status: waiting, confirmed with an explorer link, or failed in plain words. */
export function Toasts() {
  const { t } = useI18n();
  const { toasts, dismiss } = useToasts();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
      {toasts.map((toast) => {
        const tone =
          toast.status === "failed" ? "border-brick/40 text-brick" : toast.status === "confirmed" ? "border-leaf/40 text-leaf" : "border-line text-ink";
        return (
          <div
            key={toast.id}
            role={toast.status === "failed" ? "alert" : "status"}
            className={`animate-rise pointer-events-auto flex w-full max-w-[440px] items-start gap-3 rounded-card border bg-surface p-3 shadow-float ${tone}`}
          >
            <span className="mt-0.5 shrink-0">
              {toast.status === "pending" ? (
                <span className="block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Icon name={toast.status === "confirmed" ? "check" : "alert"} />
              )}
            </span>
            <div className="min-w-0 flex-1 text-ink">
              <p className="font-semibold">
                {t(toast.status === "pending" ? "tx.pending" : toast.status === "confirmed" ? "tx.confirmed" : "tx.failed")}
                {" · "}
                {t(toast.title, toast.values)}
              </p>
              {toast.error && <p className="text-label">{t(toast.error)}</p>}
              {toast.signature && (
                <a
                  href={explorerTx(toast.signature)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[36px] items-center gap-1 text-label font-semibold text-root underline"
                >
                  {t("tx.explorer")}
                  <Icon name="external" size={14} />
                </a>
              )}
            </div>
            {toast.status !== "pending" && (
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label={t("tx.dismiss")}
                className="-m-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone hover:bg-paper"
              >
                <Icon name="close" size={18} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
