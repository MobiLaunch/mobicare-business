import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
}

/**
 * Product image with the two states a bare <img> doesn't have.
 *
 * Before this, a broken or slow URL rendered the browser's default: the alt
 * text sprawling in raw body copy across the tile, on top of the discount
 * badge. Product photos come from wherever the catalogue points them, so
 * "the URL is bad today" is a normal condition, not an edge case.
 *
 * Loading holds a shimmer at the right aspect ratio so the grid never
 * reflows; failure falls back to a quiet placeholder that keeps the tile's
 * shape and lets the badges stay readable.
 */
export default function ProductImage({ src, alt, className = "" }: ProductImageProps) {
  const [state, setState] = useState<"loading" | "ready" | "failed">(src ? "loading" : "failed");

  // A changed src has to restart the cycle, or a recycled tile keeps the
  // previous image's state.
  useEffect(() => {
    setState(src ? "loading" : "failed");
  }, [src]);

  if (state === "failed") {
    return (
      <div aria-label={alt} className="mc-img-failed" role="img">
        <ImageOff aria-hidden="true" size={20} />
        <span>Image unavailable</span>
      </div>
    );
  }

  return (
    <>
      {state === "loading" && <div aria-hidden="true" className="mc-img-skel" />}
      <img
        alt={alt}
        className={`mc-img ${className}`.trim()}
        data-ready={state === "ready" ? "true" : undefined}
        loading="lazy"
        src={src}
        onError={() => setState("failed")}
        onLoad={() => setState("ready")}
      />
    </>
  );
}
