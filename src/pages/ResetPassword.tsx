import { Link } from "react-router-dom";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getClient, updateCustomerPassword } from "@/lib/supabase";
import AuthCardShell from "@/components/auth/AuthCardShell";
import AuthSuccessPanel from "@/components/auth/AuthSuccessPanel";
import { Alert } from "@/components/arc/alert/alert";
import { Button } from "@/components/arc/button/button";
import { PasswordField } from "@/components/arc/password-field/password-field";


export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const sb = getClient();

    if (!sb) {
      setError("Supabase is not configured.");

      return;
    }

    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });

    sb.auth.getSession().then(({ data }) => {
      if (data?.session) setReady(true);
    });

    // Don't leave the user stuck on "Authenticating…" forever if no recovery
    // session ever arrives (e.g. page opened directly without the email link).
    const timeout = setTimeout(() => {
      setReady((r) => {
        if (!r) {
          setError(
            "No password-reset session found. Open the link from your reset email, or request a new one from the Forgot Password page.",
          );
        }

        return r;
      });
    }, 6000);

    return () => {
      clearTimeout(timeout);
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");

      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");

      return;
    }

    setBusy(true);
    const { error: updateError } = await updateCustomerPassword(password);

    setBusy(false);

    if (updateError) {
      setError(updateError.message || "Unable to update your password.");

      return;
    }

    setDone(true);
    setTimeout(() => navigate("/login", { replace: true }), 1800);
  };

  if (done) {
    return (
      <AuthCardShell
        metaDescription="Set a new secure password for your Mobicare customer account."
        metaTitle="Password updated | Mobicare Device Recovery"
      >
        <AuthSuccessPanel
          ctaLabel="Sign in now"
          ctaTo="/login"
          message="Your password has been changed. Redirecting you to sign in."
          title="Password updated"
        />
      </AuthCardShell>
    );
  }

  return (
    <AuthCardShell
      description={ready ? "Choose a new password for your account." : undefined}
      metaDescription="Set a new secure password for your Mobicare customer account."
      metaTitle="Set a new password | Mobicare Device Recovery"
      title="Set a new password"
    >
      {error && <Alert title={error} tone="danger" />}

      {!ready && !error && <p className="mc-text" role="status">Checking your reset link.</p>}

      {ready && (
        <form className="mc-form" onSubmit={submit}>
          <PasswordField autoComplete="new-password" description="At least 8 characters." disabled={busy} label="New password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordField autoComplete="new-password" disabled={busy} label="Confirm new password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <Button loading={busy} size="lg" type="submit">Update password</Button>
        </form>
      )}

      {!ready && error && <Link className="mc-link" to="/forgot-password">Request a new reset link</Link>}
    </AuthCardShell>
  );
}
