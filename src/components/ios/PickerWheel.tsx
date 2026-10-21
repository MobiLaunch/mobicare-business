import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import { play } from "@/lib/sound";

const ITEM_H = 44;
const VISIBLE = 5;

interface PickerWheelProps {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
}

/**
 * A UIPickerView-style rolling drum. Native scroll-snap gives the physics and
 * momentum for free; every detent that passes under the selection bar plays
 * the click, and rows curve away from the bar like the side of a cylinder.
 */
export default function PickerWheel({ value, min = 1, max, onChange, label = "Quantity" }: PickerWheelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const current = useRef(value);
  const lastTick = useRef(0);
  const raf = useRef(0);
  const count = Math.max(0, max - min + 1);

  const paint = useCallback(() => {
    const el = scrollRef.current;

    if (!el) return;

    const pos = el.scrollTop / ITEM_H;

    itemRefs.current.forEach((node, i) => {
      if (!node) return;

      const d = i - pos;

      if (Math.abs(d) > 3.2) {
        node.style.transform = "";
        node.style.opacity = "0";

        return;
      }
      node.style.opacity = String(Math.max(0.12, 1 - Math.abs(d) * 0.24));
      node.style.transform = `perspective(260px) rotateX(${(-d * 24).toFixed(1)}deg) scale(${(1 - Math.abs(d) * 0.05).toFixed(3)})`;
    });
  }, []);

  // Start on the current value without animating.
  useLayoutEffect(() => {
    const el = scrollRef.current;

    if (el) el.scrollTop = (value - min) * ITEM_H;
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      paint();

      const el = scrollRef.current;

      if (!el) return;

      const idx = Math.min(count - 1, Math.max(0, Math.round(el.scrollTop / ITEM_H)));
      const next = min + idx;

      if (next !== current.current) {
        current.current = next;

        const now = performance.now();

        if (now - lastTick.current > 24) {
          play("tick");
          lastTick.current = now;
        }
        onChange(next);
      }
    });
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const goTo = (v: number) => {
    const clamped = Math.min(max, Math.max(min, v));

    scrollRef.current?.scrollTo({ top: (clamped - min) * ITEM_H, behavior: "smooth" });
  };

  return (
    <div className="picker" style={{ height: ITEM_H * VISIBLE }}>
      <div
        ref={scrollRef}
        aria-label={label}
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={value}
        className="picker-scroll"
        role="spinbutton"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") { e.preventDefault(); goTo(current.current - 1); }
          if (e.key === "ArrowDown") { e.preventDefault(); goTo(current.current + 1); }
          if (e.key === "PageUp") { e.preventDefault(); goTo(current.current - 5); }
          if (e.key === "PageDown") { e.preventDefault(); goTo(current.current + 5); }
        }}
        onScroll={onScroll}
      >
        <div style={{ height: ITEM_H * Math.floor(VISIBLE / 2) }} />
        {Array.from({ length: count }, (_, i) => (
          // Keyboard is handled by the spinbutton wrapper; rows are click-to-jump for pointer users.
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
          <div
            key={i}
            ref={(n) => { itemRefs.current[i] = n; }}
            aria-hidden="true"
            className="picker-item"
            style={{ height: ITEM_H }}
            onClick={() => goTo(min + i)}
          >
            {min + i}
          </div>
        ))}
        <div style={{ height: ITEM_H * Math.floor(VISIBLE / 2) }} />
      </div>
      <div aria-hidden="true" className="picker-bar" style={{ height: ITEM_H }} />
      <div aria-hidden="true" className="picker-shade" />
    </div>
  );
}
