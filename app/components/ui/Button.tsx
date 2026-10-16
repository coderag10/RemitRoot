import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-control px-5 text-body font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary: "bg-root text-white hover:bg-root-deep",
  secondary: "border border-root bg-surface text-root hover:bg-root-soft",
  ghost: "text-root hover:bg-root-soft",
  danger: "border border-brick bg-surface text-brick hover:bg-brick-soft",
};

export const buttonClass = (variant: Variant = "primary", full = true) =>
  `${base} ${variants[variant]} ${full ? "w-full" : ""}`;

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export function Button({
  variant = "primary",
  full = true,
  loading = false,
  icon,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  full?: boolean;
  loading?: boolean;
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`${buttonClass(variant, full)} ${className}`}
      aria-busy={loading || undefined}
      {...props}
      disabled={props.disabled || loading}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "primary",
  full = true,
  icon,
  className = "",
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; full?: boolean; icon?: IconName }) {
  return (
    <Link className={`${buttonClass(variant, full)} ${className}`} {...props}>
      {icon && <Icon name={icon} />}
      {children}
    </Link>
  );
}

/** A plain text link with a 48px tap target. */
export function TextLink({ className = "", external, children, ...props }: ComponentProps<typeof Link> & { external?: boolean }) {
  const cls = `inline-flex min-h-[48px] items-center gap-1 font-semibold text-root underline-offset-4 hover:underline ${className}`;
  if (external) {
    return (
      <a className={cls} href={String(props.href)} target="_blank" rel="noreferrer">
        {children}
        <Icon name="external" size={16} />
      </a>
    );
  }
  return (
    <Link className={cls} {...props}>
      {children}
    </Link>
  );
}
