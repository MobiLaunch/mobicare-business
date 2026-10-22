import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { sendCustomerPasswordReset } from "@/lib/supabase";
import AuthCardShell from "@/components/auth/AuthCardShell";
import AuthSuccessPanel from "@/components/auth/AuthSuccessPanel";
import { Alert } from "@/components/arc/alert/alert";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";


export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    const { error: resetError } = await sendCustomerPasswordReset(email);

    setBusy(false);

    if (resetError) {
      setError(resetError.message || "Unable to send the reset email.");

      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <AuthCardShell
        metaDescription="Request a secure password reset link for your Mobicare account."
        metaTitle="Reset password | Mobicare Device Recovery"
      >
        <AuthSuccessPanel
          ctaLabel="Return to sign in"
          ctaTo="/login"
          message={<>If an account matches <strong>{email}</strong>, you will receive password reset instructions shortly.</>}
          title="Check your inbox"
        />
      </AuthCardShell>
    );
  }

  return (
    <AuthCardShell
      description="Enter your email and we'll send you a reset link."
      metaDescription="Request a secure password reset link for your Mobicare account."
      metaTitle="Reset password | Mobicare Device Recovery"
      title="Reset your password"
    >
      {error && <Alert title={error} tone="danger" />}

      <form className="mc-form" onSubmit={submit}>
        <Input autoComplete="email" disabled={busy} label="Email address" placeholder="you@example.com" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button loading={busy} size="lg" type="submit">Send reset link</Button>
      </form>

      <Link className="mc-link" to="/login">Back to sign in</Link>
    </AuthCardShell>
  );
}
