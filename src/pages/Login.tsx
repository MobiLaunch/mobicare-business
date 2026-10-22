import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase";
import AuthCardShell from "@/components/auth/AuthCardShell";
import { Alert } from "@/components/arc/alert/alert";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";
import { PasswordField } from "@/components/arc/password-field/password-field";


interface LocationState {
  message?: string;
  from?: string;
}

export default function Login() {
  const { user, loading, signIn, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(state?.message || "");

  useEffect(() => {
    if (!loading && user) {
      navigate("/account", { replace: true });
    }
  }, [loading, user, navigate]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!isSupabaseConfigured()) {
      setError(
        "Customer accounts are not configured yet. Please check system settings.",
      );

      return;
    }

    setBusy(true);

    try {
      const result = await signIn(email, password);

      if (result.error) {
        setError(result.error.message || "Unable to sign in.");

        return;
      }

      if (!result.data?.user?.email_confirmed_at) {
        setError("Please verify your email address before signing in.");
        // Sign back out so the auth listener doesn't immediately redirect
        // an unverified user into /account.
        await logout();

        return;
      }

      navigate(state?.from || "/account", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCardShell
      description="Sign in to manage your repairs and orders."
      metaDescription="Sign in to your Mobicare account to track repairs, review orders, and manage appointments."
      metaTitle="Sign in | Mobicare Device Recovery"
      title="Welcome back"
    >
      {notice && <Alert title={notice} tone="info" />}
      {error && <Alert title={error} tone="danger" />}

      <form className="mc-form" onSubmit={submit}>
        <Input autoComplete="email" disabled={busy} label="Email address" name="email" placeholder="you@example.com" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField autoComplete="current-password" disabled={busy} label="Password" name="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button loading={busy} size="lg" type="submit">Sign in</Button>
      </form>

      <nav className="mc-row-flex" style={{ justifyContent: "space-between" }}>
        <Link className="mc-link" to="/forgot-password">Forgot password?</Link>
        <Link className="mc-link" to="/signup">Create an account</Link>
      </nav>
    </AuthCardShell>
  );
}
