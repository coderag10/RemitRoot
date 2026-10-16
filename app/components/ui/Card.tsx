import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  tone = "plain",
  as: Tag = "section",
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  tone?: "plain" | "root" | "marigold" | "brick";
  as?: "section" | "div" | "article" | "li";
  labelledBy?: string;
}) {
  const tones = {
    plain: "border-line bg-surface",
    root: "border-root/30 bg-root-soft",
    marigold: "border-marigold/40 bg-marigold-soft",
    brick: "border-brick/40 bg-brick-soft",
  };
  return (
    <Tag aria-labelledby={labelledBy} className={`rounded-card border p-4 shadow-card sm:p-5 ${tones[tone]} ${className}`}>
      {children}
    </Tag>
  );
}

export function CardTitle({ id, children, action }: { id?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 id={id} className="text-heading font-semibold text-root-deep">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function PageTitle({ children, lead }: { children: ReactNode; lead?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-title font-bold leading-tight text-root-deep">{children}</h1>
      {lead && <p className="text-stone">{lead}</p>}
    </div>
  );
}
