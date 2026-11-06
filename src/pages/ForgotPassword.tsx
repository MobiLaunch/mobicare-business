import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, KeyRound, Mail, MailCheck } from "lucide-react";
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

import { sendCustomerPasswordReset } from "@/lib/supabase";
import AuthCardShell from "@/components/auth/AuthCardShell";
import AuthSuccessPanel from "@/components/auth/AuthSuccessPanel";

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
        metaTitle="Reset Password — Mobicare Device Recovery"
      >
        <AuthSuccessPanel
          ctaLabel="Return to Sign In"
          ctaTo="/login"
          icon={<MailCheck className="size-10 text-accent" />}
          message={
            <>
              If an account matches <strong>{email}</strong>, you will receive
              password reset instructions shortly.
            </>
          }
          title="Check Your Inbox"
        />
      </AuthCardShell>
    );
  }

  return (
    <AuthCardShell
      chipLabel="Security"
      description="We'll send a secure reset link to your email address."
      icon={<KeyRound className="size-3.5" />}
      metaDescription="Request a secure password reset link for your Mobicare account."
      metaTitle="Reset Password — Mobicare Device Recovery"
      title="Reset Password"
    >
      {error && (
        <Alert role="alert" status="danger">
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
              <span>Sending reset link…</span>
            </>
          ) : (
            <>
              <span>Send Reset Link</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </Form>

      <nav className="flex items-center justify-center gap-1.5 text-sm">
        <ArrowLeft className="size-3.5 text-muted" />
        <Link className="font-semibold text-accent hover:underline" to="/login">
          Back to Sign In
        </Link>
      </nav>
    </AuthCardShell>
  );
}
