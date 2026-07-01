interface ApexTermLogoProps {
  className?: string;
  size?: number;
}

/**
 * ApexTerm custom mark — a geometric peak that reads as both the letter "A"
 * (Apex) and a price breakout pattern (trading). Replaces the terminal `>_` icon.
 */
export function ApexTermMark({ className, size = 20 }: ApexTermLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Outer peak — the apex / mountain shape */}
      <path
        d="M2 21 L12 3 L22 21"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Crossbar — echoes the letter A and a support/resistance level */}
      <path
        d="M7 15 L17 15"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
