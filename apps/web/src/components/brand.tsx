// The mark: a note page with a rust bolt on an ink tile.
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
      <rect width="96" height="96" rx="22" fill="#14213D" />
      <path d="M28 16H54L72 34V72a6 6 0 0 1-6 6H28a6 6 0 0 1-6-6V22a6 6 0 0 1 6-6z" fill="#FFFFFF" />
      <path d="M54 16V34H72Z" fill="#C3CCE3" />
      <rect x="31" y="44" width="24" height="4.5" rx="2.25" fill="#14213D" opacity="0.85" />
      <rect x="31" y="54" width="30" height="4.5" rx="2.25" fill="#14213D" opacity="0.85" />
      <rect x="31" y="64" width="16" height="4.5" rx="2.25" fill="#14213D" opacity="0.85" />
      <path transform="translate(46 38) scale(2.2)" d="M13 3L4 14h6l-1 7 9-11h-6l1-7z" fill="#E08A4F" stroke="#14213D" strokeWidth="1.6" strokeLinejoin="round" paintOrder="stroke" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark />
      <span className="font-display text-xl font-extrabold tracking-tight">RoughNOTES</span>
    </span>
  );
}
