import Link from "next/link";
import Image from "next/image";

interface BrandMarkProps {
  compact?: boolean;
  href?: string;
}

export function BrandMark({ compact = false, href = "/" }: BrandMarkProps) {
  return (
    <Link className={`brand-mark${compact ? " brand-mark-compact" : ""}`} href={href} aria-label="Black Punk Trip, beranda">
      <span className="brand-mark-symbol"><Image src="/brand/bp-logo.png" alt="" width={1024} height={1024} priority /></span>
      <span className="brand-mark-copy">
        <span>BLACK PUNK</span>
        <span>TRIP</span>
      </span>
    </Link>
  );
}
