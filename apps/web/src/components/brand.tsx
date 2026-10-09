// The mark: a rust bolt on an ink tile, as in the design mockups.
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg bg-ink"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.53} height={size * 0.53} viewBox="0 0 24 24" fill="none" stroke="#E08A4F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 3L4 14h6l-1 7 9-11h-6l1-7z" />
      </svg>
    </span>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark />
      <span className="font-display text-xl font-extrabold tracking-tight">RoughCUT</span>
    </span>
  );
}
