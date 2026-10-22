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
      <div
        aria-label={alt}
        className="flex h-full w-full flex-col items-center justify-center gap-1.5"
        style={{ background: "var(--surface-muted, var(--surface-secondary))", color: "var(--text-muted, var(--muted))" }}
        role="img"
      >
        <ImageOff className="size-5 opacity-50" />
        <span className="px-3 text-center text-caption opacity-70">Image unavailable</span>
      </div>
    );
  }

  return (
    <>
      {state === "loading" && <div className="absolute inset-0 animate-pulse" style={{ background: "var(--border-subtle, var(--surface-tertiary))" }} />}
      <img
        alt={alt}
        className={`h-full w-full object-cover ${state === "loading" ? "opacity-0" : "opacity-100"} transition-opacity duration-300 ${className}`}
        loading="lazy"
        src={src}
        onError={() => setState("failed")}
        onLoad={() => setState("ready")}
      />
    </>
  );
}
