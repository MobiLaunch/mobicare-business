import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Info, Key, Lock, Mail, TriangleAlert } from "lucide-react";
import {
  Alert,
  Button,
  FieldError,
  Form,
  InputGroup,
  Label,
  Spinner,
  TextField,
} from "@heroui/react";

import { useAuth } from "@/lib/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase";
import AuthCardShell from "@/components/auth/AuthCardShell";

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
      chipLabel="Mobicare Account"
      description="Sign in to manage your repairs and orders."
      icon={<Lock className="size-3.5" />}
      metaDescription="Sign in to your Mobicare account to track repairs, review orders, and manage appointments."
      metaTitle="Sign In — Mobicare Device Recovery"
      title="Welcome Back"
    >
      {notice && (
        <Alert status="default">
          <Alert.Indicator>
            <Info className="size-4" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Description>{notice}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {error && (
        <Alert role="alert" status="danger">
          <Alert.Indicator>
            <TriangleAlert className="size-4" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <Form className="flex flex-col gap-4" onSubmit={submit}>
        <TextField
          isRequired
          className="flex flex-col gap-1.5"
          isDisabled={busy}
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
        >
          <Label>Email address</Label>
          <InputGroup>
            <InputGroup.Prefix>
              <Mail className="size-4" />
            </InputGroup.Prefix>
            <InputGroup.Input
              autoComplete="email"
              placeholder="you@example.com"
            />
          </InputGroup>
          <FieldError />
        </TextField>

        <TextField
          isRequired
          className="flex flex-col gap-1.5"
          isDisabled={busy}
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
        >
          <Label>Password</Label>
          <InputGroup>
            <InputGroup.Prefix>
              <Key className="size-4" />
            </InputGroup.Prefix>
            <InputGroup.Input
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </InputGroup>
          <FieldError />
        </TextField>

        <Button
          fullWidth
          isDisabled={busy}
          size="lg"
          type="submit"
          variant="primary"
        >
          {busy ? (
            <>
              <Spinner size="sm" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </Form>

      <nav className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link className="text-accent hover:underline" to="/forgot-password">
          Forgot password?
        </Link>

        <Link
          className="inline-flex items-center gap-1 text-accent hover:underline"
          to="/signup"
        >
          Create an account
          <ArrowRight className="size-3.5" />
        </Link>
      </nav>
    </AuthCardShell>
  );
}
