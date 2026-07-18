import { useState } from "react";
import { boxArtNeedsRotation } from "@shellf/shared";

type BoxArtImageProps = {
  src: string;
  alt: string;
  /** CSS aspect ratio for the slot, e.g. `"7 / 9"`. */
  aspectRatio: string;
  className?: string;
};

/**
 * Renders box art and rotates 90° when the image aspect is the inverse
 * of the platform slot (portrait slot + landscape scan, or vice versa).
 */
export function BoxArtImage({ src, alt, aspectRatio, className }: BoxArtImageProps) {
  const [rotated, setRotated] = useState(false);

  return (
    <img
      src={src}
      alt={alt}
      className={[className, rotated ? "is-rotated-90" : ""].filter(Boolean).join(" ")}
      onLoad={(e) => {
        const img = e.currentTarget;
        setRotated(boxArtNeedsRotation(img.naturalWidth, img.naturalHeight, aspectRatio));
      }}
    />
  );
}
