import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  CircleAlert,
  Eye,
  EyeOff,
  Info,
  Lock,
  LogIn,
  Mail,
  Zap,
} from "lucide-react";
import {
  Alert,
  Button,
  Card,
  Chip,
  FieldError,
  Form,
  InputGroup,
  Label,
  Spinner,
  TextField,
} from "@heroui/react";

import { isLocalAuthAvailable, useAdminStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";
import PageMeta from "@/components/PageMeta";

export default function AdminLogin() {
  const navigate = useNavigate();
  const login = useAdminStore((s) => s.login);
  const restoreSession = useAdminStore((s) => s.restoreSession);
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockSecs, setLockSecs] = useState(0);

  const supabaseReady = isSupabaseConfigured();
  const localAuthReady = !supabaseReady && isLocalAuthAvailable;
  const fieldsDisabled = lockSecs > 0 || (!supabaseReady && !localAuthReady);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);
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
    if (lockSecs === 0) setError("");
  }, [lockSecs]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || lockSecs > 0) return;
    setError("");
    setLoading(true);
    try {
      const result = supabaseReady
        ? await login(email, password)
        : await login(password);

      if (result.locked) {
        setLockSecs(result.secsLeft || 30);
        setError(`Too many attempts. Try again in ${result.secsLeft}s.`);
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

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
      <PageMeta title="Admin Login — Mobicare" />

      <div className="pointer-events-none absolute -left-24 -top-28 size-[500px] rounded-full bg-[radial-gradient(ellipse,var(--accent-soft)_0%,transparent_70%)] blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 size-[400px] rounded-full bg-[radial-gradient(ellipse,var(--accent)_8%,transparent_70%)] opacity-40 blur-[80px]" />

      <main className="relative z-[1] w-full max-w-[420px]">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Zap className="size-5" />
          </span>
          <div>
            <strong className="block text-foreground">Mobicare</strong>
            <Chip color="default" size="sm">
              <Chip.Label>Admin Portal</Chip.Label>
            </Chip>
          </div>
        </div>

        <Card className="rounded-[32px] bg-surface/85 p-8 shadow-[0_4px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl">
          <Card.Header className="mb-1 pb-0">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-accent">
              Store workspace
            </span>
            <Card.Title className="text-2xl">Welcome back</Card.Title>
            <Card.Description>
              {supabaseReady
                ? "Enter your admin email and password."
                : localAuthReady
                  ? "Development-only local access mode."
                  : "Supabase is required for admin access."}
            </Card.Description>
          </Card.Header>

          <Card.Content className="flex flex-col gap-4 pt-4">
            {!supabaseReady && (
              <Alert
                role="status"
                status={localAuthReady ? "default" : "danger"}
              >
                <Alert.Indicator>
                  {localAuthReady ? (
                    <Info className="size-4" />
                  ) : (
                    <CircleAlert className="size-4" />
                  )}
                </Alert.Indicator>
                <Alert.Content>
                  <Alert.Description>
                    {localAuthReady
                      ? "Local authentication is enabled only for development builds."
                      : "Configure Supabase Auth before using the admin portal."}
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            {error && (
              <Alert role="alert" status="danger">
                <Alert.Indicator>
                  <CircleAlert className="size-4" />
                </Alert.Indicator>
                <Alert.Content>
                  <Alert.Description>{error}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              {supabaseReady && (
                <TextField
                  isRequired
                  className="flex flex-col gap-1.5"
                  isDisabled={fieldsDisabled}
                  type="email"
                  value={email}
                  onChange={setEmail}
                >
                  <Label>Email</Label>
                  <InputGroup>
                    <InputGroup.Prefix>
                      <Mail className="size-4" />
                    </InputGroup.Prefix>
                    <InputGroup.Input autoComplete="email" />
                  </InputGroup>
                  <FieldError />
                </TextField>
              )}

              <TextField
                isRequired
                className="flex flex-col gap-1.5"
                isDisabled={fieldsDisabled}
                type={showPw ? "text" : "password"}
                value={password}
                onChange={setPassword}
              >
                <Label>Password</Label>
                <InputGroup>
                  <InputGroup.Prefix>
                    <Lock className="size-4" />
                  </InputGroup.Prefix>
                  <InputGroup.Input autoComplete="current-password" />
                  <InputGroup.Suffix>
                    <button
                      aria-label={showPw ? "Hide password" : "Show password"}
                      disabled={!supabaseReady && !localAuthReady}
                      tabIndex={-1}
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                    >
                      {showPw ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </InputGroup.Suffix>
                </InputGroup>
                <FieldError />
              </TextField>

              <Button
                fullWidth
                isDisabled={fieldsDisabled || loading}
                size="lg"
                type="submit"
                variant="primary"
              >
                {loading ? <Spinner size="sm" /> : <LogIn className="size-4" />}
                <span>
                  {loading
                    ? "Signing in…"
                    : lockSecs > 0
                      ? `Locked — ${lockSecs}s`
                      : "Sign in"}
                </span>
              </Button>
            </Form>

            <p className="m-0 text-center text-sm text-muted">
              {supabaseReady
                ? "Forgot password? Reset via Supabase Dashboard → Authentication."
                : localAuthReady
                  ? "Development-only local access is disabled in production."
                  : "Admin access requires a configured Supabase Auth project."}
            </p>
          </Card.Content>
        </Card>
      </main>
    </div>
  );
}
