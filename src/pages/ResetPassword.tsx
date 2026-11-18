import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, KeyRound, Lock } from "lucide-react";
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

import { getClient, signOut, updateCustomerPassword } from "@/lib/supabase";
import AuthCardShell from "@/components/auth/AuthCardShell";
import AuthSuccessPanel from "@/components/auth/AuthSuccessPanel";

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

    // Check URL hash or query parameters for expired/invalid token errors immediately
    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, ""),
    );
    const searchParams = new URLSearchParams(window.location.search);
    const urlError =
      hashParams.get("error_description") ||
      searchParams.get("error_description") ||
      hashParams.get("error") ||
      searchParams.get("error");

    if (urlError) {
      setError(
        decodeURIComponent(urlError.replace(/\+/g, " ")) ||
          "This password reset link is invalid or has expired. Please request a new reset link.",
      );
      return;
    }

    const { data: listener } = sb.auth.onAuthStateChange((event, session) => {
      if (
        (event === "PASSWORD_RECOVERY" ||
          event === "SIGNED_IN" ||
          event === "INITIAL_SESSION") &&
        session
      ) {
        setReady(true);
      }
    });

    sb.auth.getSession().then(({ data }) => {
      if (data?.session) setReady(true);
    });

    const timeout = setTimeout(() => {
      setReady((r) => {
        if (!r) {
          setError(
            "No active password-reset session found. Open the link from your reset email, or request a new one below.",
          );
        }
        return r;
      });
    }, 5000);

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

    if (updateError) {
      setBusy(false);
      setError(updateError.message || "Unable to update your password.");
      return;
    }

    // Sign out of the recovery session cleanly so navigating to /login does not
    // bounce or loop into /account unexpectedly.
    await signOut().catch(() => null);
    setBusy(false);
    setDone(true);
    setTimeout(
      () =>
        navigate("/login", {
          replace: true,
          state: {
            message:
              "Password updated successfully! Sign in with your new password.",
          },
        }),
      1800,
    );
  };

  if (done) {
    return (
      <AuthCardShell
        metaDescription="Set a new secure password for your Mobicare account."
        metaTitle="Password Updated — Mobicare Device Recovery"
      >
        <AuthSuccessPanel
          ctaLabel="Sign In Now"
          ctaTo="/login"
          icon={<CheckCircle2 className="size-10 text-accent" />}
          message="Your password has been changed successfully. Redirecting you to sign in…"
          title="Password Updated"
        />
      </AuthCardShell>
    );
  }

  return (
    <AuthCardShell
      chipLabel="Security"
      description="Create a secure password with at least 8 characters."
      icon={<KeyRound className="size-3.5" />}
      metaDescription="Set a new secure password for your Mobicare account."
      metaTitle="Choose New Password — Mobicare Device Recovery"
      title="New Password"
    >
      {!ready && !error && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Spinner size="lg" />
          <p className="text-muted">Authenticating secure reset session…</p>
        </div>
      )}

      {error && (
        <div className="flex flex-col gap-3">
          <Alert role="alert" status="danger">
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
          {!ready && (
            <div className="text-center text-sm">
              <Link
                className="font-semibold text-accent hover:underline"
                to="/forgot-password"
              >
                Request a new password reset link →
              </Link>
            </div>
          )}
        </div>
      )}

      {ready && (
        <Form className="flex flex-col gap-4" onSubmit={submit}>
          <TextField
            isRequired
            className="flex flex-col gap-1.5"
            isDisabled={busy}
            minLength={8}
            name="password"
            type="password"
            value={password}
            onChange={setPassword}
          >
            <Label>New password (8+ characters)</Label>
            <InputGroup>
              <InputGroup.Prefix>
                <Lock className="size-4" />
              </InputGroup.Prefix>
              <InputGroup.Input
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </InputGroup>
            <FieldError />
          </TextField>

          <TextField
            isRequired
            className="flex flex-col gap-1.5"
            isDisabled={busy}
            minLength={8}
            name="confirm"
            type="password"
            value={confirm}
            onChange={setConfirm}
          >
            <Label>Confirm new password</Label>
            <InputGroup>
              <InputGroup.Prefix>
                <Lock className="size-4" />
              </InputGroup.Prefix>
              <InputGroup.Input
                autoComplete="new-password"
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
                <span>Updating password…</span>
              </>
            ) : (
              <>
                <span>Update Password</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </Form>
      )}
    </AuthCardShell>
  );
}
