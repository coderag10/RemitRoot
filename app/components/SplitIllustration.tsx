"use client";

import { useI18n } from "@/lib/i18n";

/** The landing picture: a transfer comes down and splits, most to the family, part into a root. */
export function SplitIllustration() {
  const { t } = useI18n();
  return (
    <figure className="relative mx-auto w-full max-w-[360px]" aria-hidden="true">
      <svg viewBox="0 0 320 210" className="w-full" fill="none">
        <rect x="118" y="6" width="84" height="34" rx="17" fill="#FFFFFF" stroke="#E5E0D8" />
        <text x="160" y="28" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1C1C1A">
          $200
        </text>
        <path d="M160 40v50" stroke="#1C1C1A" strokeWidth="4" strokeLinecap="round" strokeDasharray="60" strokeDashoffset="60" className="animate-draw" />
        <path
          d="M160 90c0 22 18 30 44 30h66"
          stroke="#E0A526"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray="160"
          strokeDashoffset="160"
          className="animate-draw"
          style={{ animationDelay: "0.5s" }}
        />
        <path d="M262 106l16 14-16 14" stroke="#E0A526" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M160 90v62"
          stroke="#1F5C4A"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="70"
          strokeDashoffset="70"
          className="animate-draw"
          style={{ animationDelay: "0.5s" }}
        />
        <path
          d="M160 150c-6 10-18 16-34 18M160 150c4 11 13 17 26 20M160 156v26M150 172c-4 6-10 9-18 10"
          stroke="#1F5C4A"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="60"
          strokeDashoffset="60"
          className="animate-draw"
          style={{ animationDelay: "1.1s" }}
        />
        <rect x="0" y="186" width="320" height="2" rx="1" fill="#E5E0D8" />
      </svg>
      <figcaption className="pointer-events-none absolute inset-0 text-label font-semibold">
        <span className="absolute right-0 top-[38%] rounded-full bg-marigold-soft px-3 py-1 text-marigold-deep">
          $170 · {t("landing.split.family")}
        </span>
        <span className="absolute left-0 top-[72%] rounded-full bg-root-soft px-3 py-1 text-root-deep">
          $30 · {t("landing.split.saved")}
        </span>
      </figcaption>
    </figure>
  );
}
