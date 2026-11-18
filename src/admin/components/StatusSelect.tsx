import StatusPill from "@/admin/components/StatusPill";

const TONES: Record<string, string> = {
  paid: "success", delivered: "success", completed: "success", confirmed: "success",
  processing: "info", shipped: "info", pending: "warning",
  cancelled: "danger", refunded: "danger", payment_failed: "danger", "no-show": "danger",
};

interface Props {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  format?: (value: string) => string;
}

const titleCase = (s: string) => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** Status shown as a coloured pill that is really a native select. */
export default function StatusSelect({ value, options, onChange, label, disabled, format = titleCase }: Props) {
  if (disabled) return <StatusPill status={format(value)} tone={(TONES[value] as never) ?? "neutral"} />;

  const items = options.includes(value) ? options : [...options, value];

  return (
    <select aria-label={label} className="ad-statusselect" data-tone={TONES[value] ?? "neutral"} value={value} onChange={(e) => onChange(e.target.value)}>
      {items.map((s) => <option key={s} value={s}>{format(s)}</option>)}
    </select>
  );
}
