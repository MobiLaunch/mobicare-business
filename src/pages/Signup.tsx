import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Lock,
  Mail,
  MailCheck,
  Phone,
  User,
  UserPlus,
} from "lucide-react";
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
import AuthSuccessPanel from "@/components/auth/AuthSuccessPanel";

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
        metaTitle="Verify Your Account — Mobicare Device Recovery"
      >
        <AuthSuccessPanel
          ctaLabel="Go to Sign In"
          ctaTo="/login"
          icon={<MailCheck className="size-10 text-accent" />}
          message={
            <>
              We sent a verification link to <strong>{form.email}</strong>.
              Click the link in the message to confirm your address, then sign
              in.
            </>
          }
          title="Check Your Email"
        />
      </AuthCardShell>
    );
  }

  return (
    <AuthCardShell
      chipLabel="Join Mobicare"
      description="Keep your repair appointments and purchases synchronized."
      icon={<UserPlus className="size-3.5" />}
      metaDescription="Register for a Mobicare account to track repairs and manage store orders."
      metaTitle="Create Account — Mobicare Device Recovery"
      title="Create Account"
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
          name="name"
          type="text"
          value={form.name}
          onChange={update("name")}
        >
          <Label>Full name</Label>
          <InputGroup>
            <InputGroup.Prefix>
              <User className="size-4" />
            </InputGroup.Prefix>
            <InputGroup.Input autoComplete="name" placeholder="Jane Doe" />
          </InputGroup>
          <FieldError />
        </TextField>

        <TextField
          className="flex flex-col gap-1.5"
          isDisabled={busy}
          name="phone"
          type="tel"
          value={form.phone}
          onChange={update("phone")}
        >
          <Label>Phone number</Label>
          <InputGroup>
            <InputGroup.Prefix>
              <Phone className="size-4" />
            </InputGroup.Prefix>
            <InputGroup.Input autoComplete="tel" placeholder="(618) 555-0100" />
          </InputGroup>
          <FieldError />
        </TextField>

        <TextField
          isRequired
          className="flex flex-col gap-1.5"
          isDisabled={busy}
          name="email"
          type="email"
          value={form.email}
          onChange={update("email")}
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
          minLength={8}
          name="password"
          type="password"
          value={form.password}
          onChange={update("password")}
        >
          <Label>Password (8+ characters)</Label>
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
          value={form.confirm}
          onChange={update("confirm")}
        >
          <Label>Confirm password</Label>
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
              <span>Creating account…</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </Form>

      <nav className="flex items-center justify-center gap-1.5 text-sm">
        <span className="text-muted">Already have an account?</span>
        <Link className="font-semibold text-accent hover:underline" to="/login">
          Sign in
        </Link>
      </nav>
    </AuthCardShell>
  );
}
