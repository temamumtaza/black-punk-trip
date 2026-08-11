import Link from "next/link";

interface BrandMarkProps {
  compact?: boolean;
  href?: string;
}

export function BrandMark({ compact = false, href = "/" }: BrandMarkProps) {
  return (
    <Link className={`brand-mark${compact ? " brand-mark-compact" : ""}`} href={href} aria-label="Black Punk Trip, beranda">
      <span className="brand-mark-symbol" aria-hidden="true">BP</span>
      <span className="brand-mark-copy">
        <span>BLACK PUNK</span>
        <span>TRIP</span>
      </span>
    </Link>
  );
}

