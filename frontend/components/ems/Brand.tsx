import type { CSSProperties } from "react";
import { BRAND_ART, type BrandAsset } from "@/lib/brand";

/** Display a viewport of the supplied board; the source image is not altered. */
export function BrandArt({
  asset,
  className = "",
  label,
}: {
  asset: BrandAsset;
  className?: string;
  label?: string;
}) {
  const [x, y, width, height] = BRAND_ART[asset];
  const style: CSSProperties = {
    aspectRatio: `${width} / ${height}`,
    backgroundSize: `${(1536 / width) * 100}% ${(1024 / height) * 100}%`,
    backgroundPosition: `${(x / (1536 - width)) * 100}% ${(y / (1024 - height)) * 100}%`,
  };
  return (
    <span
      className={`brand-art ${className}`}
      data-asset={asset}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={style}
    />
  );
}

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    // The wordmark or the containing button supplies the accessible name.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`brand-symbol ${className}`}
      src="/brand/mark.svg"
      width="48"
      height="48"
      alt=""
      aria-hidden="true"
    />
  );
}
