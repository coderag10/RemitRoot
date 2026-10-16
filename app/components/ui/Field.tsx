import type { InputHTMLAttributes, ReactNode } from "react";

/** A labelled input with optional hint and error, wired for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-label font-semibold text-stone">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-label text-stone">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-label font-medium text-brick">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({ invalid, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={`h-[52px] w-full min-w-0 rounded-control border bg-surface px-3 text-body text-ink placeholder:text-stone/70 ${
        invalid ? "border-brick" : "border-line focus:border-root"
      } ${className}`}
      {...props}
    />
  );
}

/** A dollar amount input with the sign outside the text. */
export function MoneyInput({ invalid, big, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; big?: boolean }) {
  return (
    <div
      className={`flex items-center gap-1 rounded-control border bg-surface px-3 ${big ? "h-[68px]" : "h-[52px]"} ${
        invalid ? "border-brick" : "border-line focus-within:border-root focus-within:ring-2 focus-within:ring-root/30"
      } ${className}`}
    >
      <span className={`font-bold text-stone ${big ? "text-amount" : "text-heading"}`} aria-hidden="true">
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={invalid || undefined}
        className={`tabular w-full min-w-0 bg-transparent font-bold text-ink outline-none ${big ? "text-amount" : "text-heading"}`}
        {...props}
      />
    </div>
  );
}
