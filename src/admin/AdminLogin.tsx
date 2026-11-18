import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";

import { Alert } from "@/components/arc/alert/alert";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";
import { PasswordField } from "@/components/arc/password-field/password-field";
import { isLocalAuthAvailable, useAdminStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";
import PageMeta from "@/components/PageMeta";
import localLogo from "@/assets/mobicare-logo.svg";

export default function AdminLogin() {
  const navigate = useNavigate();
  const login = useAdminStore((s) => s.login);
  const sendReset = useAdminStore((s) => s.sendReset);
  const restoreSession = useAdminStore((s) => s.restoreSession);
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated);
  const lockedUntil = useAdminStore((s) => s.lockedUntil);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockSecs, setLockSecs] = useState(() =>
    lockedUntil && lockedUntil > Date.now()
      ? Math.ceil((lockedUntil - Date.now()) / 1000)
      : 0,
  );

  const supabaseReady = isSupabaseConfigured();
  const localAuthReady = !supabaseReady && isLocalAuthAvailable;
  const fieldsDisabled = lockSecs > 0 || (!supabaseReady && !localAuthReady);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (lockedUntil && lockedUntil > Date.now()) {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);

      setLockSecs(remaining);
    }
  }, [lockedUntil]);

  useEffect(() => {
    if (isAuthenticated) navigate("/admin/dashboard");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!lockSecs) return;
    const t = setInterval(() => setLockSecs((s) => (s <= 1 ? 0 : s - 1)), 1000);

    return () => clearInterval(t);
  }, [lockSecs]);

  // Clear the lockout error once the countdown reaches zero so the form
  // doesn't show a stale "try again in Xs" message.
  useEffect(() => {
    if (lockSecs === 0 && error.startsWith("Too many attempts")) setError("");
  }, [lockSecs, error]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || lockSecs > 0) return;
    setError("");
    setResetSent("");
    setLoading(true);
    try {
      const result = supabaseReady
        ? await login(email, password)
        : await login(password);

      if (result.locked) {
        setLockSecs(result.secsLeft || 30);
        setError(
          result.error
            ? `${result.error} Too many attempts — try again in ${result.secsLeft}s.`
            : `Too many attempts. Try again in ${result.secsLeft}s.`,
        );
      } else if (!result.ok) {
        const hint =
          result.attemptsLeft != null
            ? ` (${result.attemptsLeft} attempts left)`
            : "";

        setError((result.error || "Incorrect credentials.") + hint);
      }
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setResetSent("");
    if (!email.trim() || !email.includes("@")) {
      setError("Enter your admin email address above first, then click Forgot password.");

      return;
    }
    setLoading(true);
    try {
      const { error: resetErr } = await sendReset(email.trim());

      if (resetErr) {
        setError(
          typeof resetErr === "object" && resetErr && "message" in resetErr
            ? String((resetErr as { message: string }).message)
            : "Unable to send password reset email.",
        );
      } else {
        setResetSent(`If ${email.trim()} is registered, a password reset link is on its way.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ad-login">
      <PageMeta title="Admin Login — Mobicare" />

      <main className="ad-login-card">
        <img alt="Mobicare" src={localLogo} />
        <div>
          <h1>Welcome back</h1>
          <p className="ad-hint" style={{ marginTop: 4 }}>
            {supabaseReady ? "Enter your admin email and password." : localAuthReady ? "Development-only local access mode." : "Supabase is required for admin access."}
          </p>
        </div>

        {!supabaseReady && (
          <Alert role="status" title={localAuthReady ? "Local access enabled" : "Supabase not configured"} tone={localAuthReady ? "info" : "danger"}>
            {localAuthReady ? "Local authentication is enabled only for development builds." : "Configure Supabase Auth before using the admin portal."}
          </Alert>
        )}

        {resetSent && <Alert role="status" title={resetSent} tone="success" />}
        {error && <Alert role="alert" title={error} tone="danger" />}

        <form className="ad-form" onSubmit={handleSubmit}>
          {supabaseReady && (
            <Input autoComplete="email" disabled={fieldsDisabled} label="Email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
          <PasswordField autoComplete="current-password" disabled={fieldsDisabled} label="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button disabled={fieldsDisabled || loading} loading={loading} size="lg" type="submit">
            <LogIn aria-hidden="true" size={16} strokeWidth={1.75} />
            {loading ? "Signing in…" : lockSecs > 0 ? `Locked — ${lockSecs}s` : "Sign in"}
          </Button>
        </form>

        <p className="ad-hint" style={{ textAlign: "center" }}>
          {supabaseReady ? (
            <button
              className="ad-crumblink"
              disabled={loading || lockSecs > 0}
              type="button"
              onClick={() => void handleForgotPassword()}
            >
              Forgot password? Send a reset link
            </button>
          ) : localAuthReady ? (
            "Development-only local access is disabled in production."
          ) : (
            "Admin access requires a configured Supabase Auth project."
          )}
        </p>
      </main>
    </div>
  );
}
