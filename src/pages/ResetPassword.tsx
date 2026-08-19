import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Lock, KeyRound } from "lucide-react";
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

import { getClient, updateCustomerPassword } from "@/lib/supabase";
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

    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });

    sb.auth.getSession().then(({ data }) => {
      if (data?.session) setReady(true);
    });

    return () => listener?.subscription?.unsubscribe();
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
      metaDescription="Set a new secure password for your Mobicare customer account."
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
        <Alert role="alert" status="danger">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
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
            <Label>New password</Label>
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
