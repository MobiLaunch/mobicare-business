import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Minus, Plus } from "lucide-react";

import PickerWheel from "@/components/ios/PickerWheel";
import { play } from "@/lib/sound";

export const MAX_PICKER = 99;

interface StepperProps {
  value: number;
  min?: number;
  max: number;
  size?: "md" | "sm";
  onChange: (value: number) => void;
  /** Tapping the number opens the rolling picker. */
  onOpen: () => void;
}

/** − | 3 ▾ | + : the glossy segmented stepper. The centre is the picker trigger. */
export function QuantityStepper({ value, min = 1, max, size = "md", onChange, onOpen }: StepperProps) {
  return (
    <div className={`ios-stepper ios-stepper--${size}`} role="group" aria-label="Quantity">
      <button aria-label="Decrease quantity" disabled={value <= min} type="button" onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus aria-hidden="true" className="size-4" />
      </button>
      <button aria-haspopup="dialog" aria-label={`Quantity ${value}. Choose a different amount`} className="ios-stepper-value" type="button" onClick={onOpen}>
        <span aria-live="polite">{value}</span>
        <ChevronDown aria-hidden="true" className="size-3 opacity-60" />
      </button>
      <button aria-label="Increase quantity" disabled={value >= max} type="button" onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

interface PanelProps {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  onDone: () => void;
  title?: string;
}

/** Wheel + Done bar. Used inline (cart) and inside the bottom sheet (product page). */
export function PickerPanel({ value, min = 1, max, onChange, onDone, title = "Quantity" }: PanelProps) {
  return (
    <div className="picker-panel">
      <div className="picker-toolbar">
        <span className="picker-title">{title}</span>
        <button className="ios-bar-btn ios-bar-btn--done" type="button" onClick={onDone}>Done</button>
      </div>
      <PickerWheel max={Math.min(max, MAX_PICKER)} min={min} value={value} onChange={onChange} />
    </div>
  );
}

interface QuantityPickerProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
}

/** Stepper + bottom-sheet picker (product page). */
export default function QuantityPicker({ value, max, onChange }: QuantityPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const openSheet = () => {
    setDraft(value);
    setOpen(true);
    play("tap");
  };

  const done = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <>
      <QuantityStepper max={max} value={value} onChange={onChange} onOpen={openSheet} />
      {open &&
        createPortal(
          <div className="picker-backdrop" role="presentation" onClick={() => setOpen(false)}>
            {/* stopPropagation keeps taps inside the sheet from reaching the dismissing backdrop. */}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
            <div aria-label="Choose quantity" aria-modal="true" className="picker-sheet" role="dialog" onClick={(e) => e.stopPropagation()}>
              <PickerPanel max={max} value={draft} onChange={setDraft} onDone={done} />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
