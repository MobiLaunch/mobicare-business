import { useId, type HTMLInputTypeAttribute, type ReactNode } from "react";
import { Check } from "lucide-react";

/**
 * iOS 6 form primitives: nav-bar header, grouped table views, label/field
 * rows, check-mark choice rows, segmented control and progress bar. Shared by
 * the booking wizard and checkout so both read as one app.
 */

interface SheetHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
}

export function IosSheetHeader({ title, subtitle, left, right }: SheetHeaderProps) {
  return (
    <div className="ios-navbar relative grid min-h-[52px] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 py-1.5">
      <div className="flex justify-start">{left}</div>
      <div className="min-w-0 text-center leading-tight">
        <div className="ios-navbar-title truncate text-[16px]">{title}</div>
        {subtitle && (
          <div className="truncate text-[11px] font-bold text-white/85" style={{ textShadow: "0 -1px 0 rgba(0,0,0,.4)" }}>
            {subtitle}
          </div>
        )}
      </div>
      <div className="flex justify-end">{right}</div>
    </div>
  );
}

interface GroupProps {
  title?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function IosGroup({ title, footer, children, className = "" }: GroupProps) {
  return (
    <section className={`mb-4 ${className}`}>
      {title && <h3 className="ios-group-title">{title}</h3>}
      <div className="ios-group">{children}</div>
      {footer && <p className="ios-group-footer">{footer}</p>}
    </section>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  list?: string;
  disabled?: boolean;
  /** Stack the label above the input — for long free text. */
  stacked?: boolean;
}

/** One table row: bold label on the left, the editable value filling the rest. */
export function IosField({ label, value, onChange, type = "text", placeholder, required, autoComplete, inputMode, list, disabled, stacked }: FieldProps) {
  const id = useId();

  return (
    <div className={`ios-row ios-field ${stacked ? "!flex-col !items-stretch !gap-1" : ""}`}>
      <label className="ios-field-label" htmlFor={id}>
        {label}
        {required && <span aria-hidden="true" className="text-[var(--ios-red)]"> *</span>}
      </label>
      <input
        id={id}
        aria-required={required || undefined}
        autoComplete={autoComplete}
        className="ios-field-input"
        disabled={disabled}
        inputMode={inputMode}
        list={list}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface ChoiceProps {
  selected: boolean;
  onClick: () => void;
  title: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
  id?: string;
  /** "radio" for pick-one lists. */
  role?: "radio" | "checkbox";
}

/** A tappable table row with iOS's blue check mark when chosen. */
export function IosChoice({ selected, onClick, title, detail, icon, trailing, id, role = "radio" }: ChoiceProps) {
  return (
    <button aria-checked={selected} className={`ios-row ios-choice w-full text-left ${selected ? "is-selected" : ""}`} id={id} role={role} type="button" onClick={onClick}>
      {icon}
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-[15px] font-bold">{title}</strong>
        {detail && <span className="ios-choice-detail block text-[12.5px] leading-snug">{detail}</span>}
      </span>
      {trailing && <span className="ios-choice-trailing shrink-0 text-[14px] font-extrabold">{trailing}</span>}
      <Check aria-hidden="true" className={`ios-check size-5 shrink-0 ${selected ? "opacity-100" : "opacity-0"}`} strokeWidth={3.5} />
    </button>
  );
}

interface SegmentedProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T | "";
  onChange: (value: T) => void;
  ariaLabel: string;
}

/** UISegmentedControl. Wraps onto extra rows when there are many options. */
export function IosSegmented<T extends string>({ options, value, onChange, ariaLabel }: SegmentedProps<T>) {
  return (
    <div aria-label={ariaLabel} className="ios-segmented" role="radiogroup">
      {options.map((o) => (
        <button key={o.value} aria-checked={value === o.value} className={value === o.value ? "is-selected" : ""} role="radio" type="button" onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Label/value pair for review screens. */
export function IosSummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="ios-row justify-between gap-4 !py-2.5 text-[14px]">
      <span className="shrink-0 font-semibold text-[var(--ios-slate)]">{label}</span>
      <strong className="min-w-0 break-words text-right">{value}</strong>
    </div>
  );
}

/** UIProgressView with a named step label above. */
export function IosProgress({ steps, index }: { steps: string[]; index: number }) {
  const pct = ((index + 1) / steps.length) * 100;

  return (
    <div className="px-4 pb-1 pt-3" role="progressbar" aria-label="Progress" aria-valuemax={steps.length} aria-valuemin={1} aria-valuenow={index + 1} aria-valuetext={`Step ${index + 1} of ${steps.length}: ${steps[index]}`}>
      <div className="mb-1.5 flex items-center justify-between text-[12px] font-bold text-[var(--ios-slate)]" style={{ textShadow: "0 1px 0 #fff" }}>
        <span>{steps[index]}</span>
        <span>{index + 1} of {steps.length}</span>
      </div>
      <div className="ios-progress">
        <div className="ios-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Inline notice (leaf-green info / orange warning) styled like an iOS alert strip. */
export function IosNote({ tone = "info", children }: { tone?: "info" | "warn"; children: ReactNode }) {
  return <div className={`ios-note ios-note--${tone}`}>{children}</div>;
}
