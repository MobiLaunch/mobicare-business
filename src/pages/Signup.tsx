import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase";
import AuthCardShell from "@/components/auth/AuthCardShell";
import AuthSuccessPanel from "@/components/auth/AuthSuccessPanel";
import { Alert } from "@/components/arc/alert/alert";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";
import { PasswordField } from "@/components/arc/password-field/password-field";


interface SignupForm {
  name: string;
  phone: string;
  email: string;
  password: string;
  confirm: string;
}

export default function Signup() {
  const { user, loading, signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<SignupForm>({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/account", { replace: true });
  }, [loading, user, navigate]);

  const update = (key: keyof SignupForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!isSupabaseConfigured()) {
      setError(
        "Customer accounts are not configured yet. Please check system settings.",
      );

      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");

      return;
    }

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");

      return;
    }

    setBusy(true);
    const result = await signUp(form.email, form.password, {
      full_name: form.name,
      phone: form.phone,
    });

    setBusy(false);

    if (result.error) {
      setError(result.error.message || "Unable to create your account.");

      return;
    }

    setCreated(true);
  };

  if (created) {
    return (
      <AuthCardShell
        metaDescription="Verification link sent. Verify your email to access your Mobicare account."
        metaTitle="Verify your account | Mobicare Device Recovery"
      >
        <AuthSuccessPanel
          ctaLabel="Go to sign in"
          ctaTo="/login"
          message={<>We sent a verification link to <strong>{form.email}</strong>. Click the link in the message to confirm your address, then sign in.</>}
          title="Check your email"
        />
      </AuthCardShell>
    );
  }

  return (
    <AuthCardShell
      description="Track repairs, review orders and book faster."
      metaDescription="Create a Mobicare account to track repairs, review orders, and book appointments faster."
      metaTitle="Create account | Mobicare Device Recovery"
      title="Create your account"
    >
      {error && <Alert title={error} tone="danger" />}

      <form className="mc-form" onSubmit={submit}>
        <Input autoComplete="name" disabled={busy} label="Full name" required value={form.name} onChange={(e) => update("name")(e.target.value)} />
        <div className="mc-form-2">
          <Input autoComplete="tel" disabled={busy} inputMode="tel" label="Phone (optional)" type="tel" value={form.phone} onChange={(e) => update("phone")(e.target.value)} />
          <Input autoComplete="email" disabled={busy} label="Email address" required type="email" value={form.email} onChange={(e) => update("email")(e.target.value)} />
        </div>
        <PasswordField autoComplete="new-password" description="At least 8 characters." disabled={busy} label="Password" required value={form.password} onChange={(e) => update("password")(e.target.value)} />
        <PasswordField autoComplete="new-password" disabled={busy} label="Confirm password" required value={form.confirm} onChange={(e) => update("confirm")(e.target.value)} />
        <Button loading={busy} size="lg" type="submit">Create account</Button>
      </form>

      <p className="mc-small">By creating an account you agree to our <Link className="mc-link" to="/privacy">privacy policy</Link>. Already have an account? <Link className="mc-link" to="/login">Sign in</Link>.</p>
    </AuthCardShell>
  );
}
