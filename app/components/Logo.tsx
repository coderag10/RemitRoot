// The mark: one line comes down and splits in two. One branch goes sideways as an arrow (to the
// family), the other goes down and becomes a small root (savings).
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <path d="M12 3v11" stroke="#1F5C4A" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 14c0 3 2 4 5 4h10" stroke="#E0A526" strokeWidth="3" strokeLinecap="round" />
      <path d="M23 14l4 4-4 4" stroke="#E0A526" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 14v10" stroke="#1F5C4A" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 24c-1.5 2-3.5 3-6 3M12 24c1 2 2.5 3 4.5 3.5M12 26v3" stroke="#1F5C4A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ remit, root }: { remit: string; root: string }) {
  return (
    <span className="text-[1.375rem] font-bold leading-none tracking-tight text-ink">
      {remit}
      <span className="text-root">{root}</span>
    </span>
  );
}
