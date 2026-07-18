import { useState } from "react";
import type { CoverRotation } from "@shellf/shared";
import { normalizeCoverRotation } from "@shellf/shared";

type BoxArtImageProps = {
  src: string;
  alt: string;
  /** CSS aspect ratio for the slot, e.g. `"7 / 9"`. Used when layout is `"slot"`. */
  aspectRatio: string;
  /** Saved cover rotation in degrees (0, 90, 180, 270). */
  rotation?: CoverRotation | number | null;
  /**
   * `"slot"` — fill a fixed platform frame (cards).
   * `"intrinsic"` — container height follows the (rotated) image (detail page).
   */
  layout?: "slot" | "intrinsic";
  className?: string;
};

/**
 * Renders box art with an optional saved rotation (0 / 90 / 180 / 270).
 */
export function BoxArtImage({
  src,
  alt,
  aspectRatio: _aspectRatio,
  rotation = 0,
  layout = "slot",
  className,
}: BoxArtImageProps) {
  const deg = normalizeCoverRotation(rotation);
  const rotateClass =
    deg === 0 ? "" : deg === 180 ? "is-rotated-180" : `is-rotated-${deg}`;
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const img = (
    <img
      src={src}
      alt={alt}
      className={[className, rotateClass].filter(Boolean).join(" ")}
      onLoad={(e) => {
        const el = e.currentTarget;
        setNatural({ w: el.naturalWidth, h: el.naturalHeight });
      }}
    />
  );

  if (layout !== "intrinsic") return img;

  const artAspect =
    natural == null
      ? undefined
      : deg === 90 || deg === 270
        ? `${natural.h} / ${natural.w}`
        : `${natural.w} / ${natural.h}`;

  return (
    <div
      className="box-art-intrinsic"
      style={artAspect ? { ["--art-aspect" as string]: artAspect } : undefined}
    >
      {img}
    </div>
  );
}
