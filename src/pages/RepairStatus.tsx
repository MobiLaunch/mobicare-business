import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import AuthCardShell from "@/components/auth/AuthCardShell";
import { Alert } from "@/components/arc/alert/alert";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";
import { BUSINESS } from "@/lib/config";
import { sbLookupRepairStatus, type RepairStatus } from "@/lib/supabase";

const STEPS: Array<{ stage: RepairStatus["stage"]; label: string }> = [
  { stage: "received", label: "Checked in" },
  { stage: "in_progress", label: "Being repaired" },
  { stage: "ready", label: "Ready for pickup" },
  { stage: "done", label: "Picked up" },
];
const MESSAGES: Record<string, string> = {
  invalid: "Enter your ticket number and the last 4 digits of the phone number on your ticket.",
  not_found: "We couldn't match that ticket and phone number. Check them and try again, or call us.",
  locked: "Too many tries for that ticket. Please wait about 15 minutes, or call us.",
  busy: "We're getting a lot of requests right now. Please try again in a minute.",
  error: "Something went wrong looking that up. Please try again, or call us.",
};

export default function RepairStatus() {
  const [params] = useSearchParams();
  const [ticket, setTicket] = useState((params.get("ticket") || "").replace(/\D/g, ""));
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [repair, setRepair] = useState<RepairStatus | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setRepair(null);
    setBusy(true);
    try {
      const res = await sbLookupRepairStatus(Number(ticket), phone);

      if (res.ok) setRepair(res.repair);
      else setError(MESSAGES[res.reason] || MESSAGES.error);
    } finally {
      setBusy(false);
    }
  };

  const step = repair ? (repair.stage === "waiting_parts" ? 1 : STEPS.findIndex((s) => s.stage === repair.stage)) : -1;

  return (
    <AuthCardShell
      description="Enter your ticket number and the last 4 digits of the phone number on your ticket."
      metaDescription="Check the progress of your Mobicare repair with your ticket number."
      metaTitle="Repair status | Mobicare Device Recovery"
      title="Check your repair"
    >
      {error && <Alert role="alert" title={error} tone="danger" />}

      <form className="mc-form" onSubmit={submit}>
        <Input disabled={busy} inputMode="numeric" label="Ticket number" name="ticket" required value={ticket} onChange={(e) => setTicket(e.target.value.replace(/\D/g, ""))} />
        <Input autoComplete="tel" disabled={busy} inputMode="numeric" label="Last 4 digits of your phone" maxLength={14} name="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button disabled={!ticket || phone.replace(/\D/g, "").length < 4} loading={busy} size="lg" type="submit">Check status</Button>
      </form>

      {repair && (
        <section aria-live="polite" className="mc-stack-sm">
          <h2 className="mc-h3">{repair.device || `Ticket #${repair.ticket}`}</h2>
          <ol className="mc-stack-sm" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {STEPS.map((s, i) => (
              <li key={s.stage} aria-current={i === step ? "step" : undefined} style={{ display: "flex", gap: "0.75rem", alignItems: "center", opacity: i > step ? 0.45 : 1, fontWeight: i === step ? 600 : 400 }}>
                <span aria-hidden="true" style={{ width: "1.5rem", height: "1.5rem", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: "0.8rem", background: i <= step ? "var(--accent, #111)" : "transparent", color: i <= step ? "var(--accent-foreground, #fff)" : "inherit", border: "1px solid currentColor" }}>{i < step ? "✓" : i + 1}</span>
                {s.label}
              </li>
            ))}
          </ol>
          {repair.stage === "waiting_parts" && <Alert title="We're waiting on a part" tone="info">Your repair is on hold until the part arrives. We'll let you know as soon as it's in.</Alert>}
          {repair.stage === "ready" && <Alert title="Your device is ready" tone="success">Bring your ticket number when you come in.</Alert>}
          <p className="mc-text">Current status: <strong>{repair.status}</strong> · updated {new Date(repair.updated_at).toLocaleDateString()}</p>
        </section>
      )}

      <p className="mc-text">Questions? Call {BUSINESS.phone || "us"} or <Link className="mc-link" to="/">visit the shop</Link>.</p>
    </AuthCardShell>
  );
}
