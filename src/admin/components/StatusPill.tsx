const TONES: Record<string, string> = {
  paid: "success", delivered: "success", completed: "success", confirmed: "success", active: "success",
  processing: "info", shipped: "info", pending: "warning", draft: "warning",
  cancelled: "danger", refunded: "danger", "no-show": "danger",
};

/** Coloured status label. The tone is derived from the status text unless given. */
export default function StatusPill({ status, tone }: { status?: string; tone?: "success" | "info" | "warning" | "danger" | "neutral" }) {
  const label = status || "pending";

  return <span className="ad-pill" data-tone={tone ?? TONES[label.toLowerCase()] ?? "neutral"}>{label.charAt(0).toUpperCase() + label.slice(1).replace(/_/g, " ")}</span>;
}
