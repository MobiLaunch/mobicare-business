import type { CSSProperties, ElementType, ReactNode } from "react";

import { useFadeIn } from "@/hooks/useFadeIn";

interface RevealProps {
  children: ReactNode;
  /** Stagger siblings by passing an increasing delay in ms. */
  delay?: number;
  className?: string;
  as?: ElementType;
  id?: string;
}

/** Scroll-triggered "pop in": fades up and settles with a slight overshoot. */
export default function Reveal({ children, delay = 0, className = "", as: Tag = "div", id }: RevealProps) {
  const [ref, visible] = useFadeIn<HTMLElement>();

  return (
    <Tag
      ref={ref}
      className={`ios-reveal ${visible ? "is-visible" : ""} ${className}`}
      id={id}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
