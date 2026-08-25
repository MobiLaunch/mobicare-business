import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleX,
  CloudUpload,
  Copy,
  CreditCard,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Save,
  TriangleAlert,
} from "lucide-react";
import {
  Alert,
  Button,
  FieldError,
  InputGroup,
  Label,
  TextField,
} from "@heroui/react";

import { useAdminStore, useProductStore, useToastStore } from "@/lib/store";
import { getStripePublishableKey, isStripeConfigured } from "@/lib/config";
import {
  isSupabaseConfigured,
  resetClient,
  sbSeedInitialData,
  testConnection,
} from "@/lib/supabase";
import AdminPageHeader from "@/admin/components/AdminPageHeader";
import AdminSettingsCard, {
  SettingsStepItem,
} from "@/admin/components/AdminSettingsCard";
import { SCHEMA_SQL } from "@/admin/schemaSql";

type ConnStatus = null | "ok" | "error";

export default function Settings() {
  const changePassword = useAdminStore((s) => s.changePassword);
  const addToast = useToastStore((s) => s.add);
  const storeRefresh = useProductStore((s) => s.refresh);
  const usingSupabase = useProductStore((s) => s.usingSupabase);
  const storeProducts = useProductStore((s) => s.products);
  const storeCategories = useProductStore((s) => s.categories);

  // Supabase creds
  const [sbUrl, setSbUrl] = useState(localStorage.getItem("sb_url") || "");
  const [sbAnonKey, setSbAnonKey] = useState(
    localStorage.getItem("sb_anon_key") || "",
  );
  const [connStatus, setConnStatus] = useState<ConnStatus>(null);
  const [connMsg, setConnMsg] = useState("");
  const [testing, setTesting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [sqlOpen, setSqlOpen] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // EmailJS
  const [emailjs, setEmailjs] = useState({
    serviceId: localStorage.getItem("ejs_service") || "",
    bookingTemplate: localStorage.getItem("ejs_booking") || "",
    orderTemplate: localStorage.getItem("ejs_order") || "",
    publicKey: localStorage.getItem("ejs_pubkey") || "",
  });

  // Stripe
  const [stripePubKey, setStripePubKey] = useState(getStripePublishableKey());
  const [stripeSaved, setStripeSaved] = useState(isStripeConfigured());

  // Password
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (usingSupabase) {
      setConnStatus("ok");
      setConnMsg("Connected");
    } else if (isSupabaseConfigured()) {
      setConnStatus("error");
      setConnMsg("Configured but not connected — test the connection");
    }
  }, [usingSupabase]);

  const handleSaveSupabase = () => {
    localStorage.setItem("sb_url", sbUrl.trim());
    localStorage.setItem("sb_anon_key", sbAnonKey.trim());
    resetClient();
    setConnStatus(null);
    addToast("Supabase credentials saved", "success");
  };

  const handleTestConnection = async () => {
    if (!sbUrl || !sbAnonKey) {
      addToast("Enter URL and anon key first", "error");

      return;
    }
    localStorage.setItem("sb_url", sbUrl.trim());
    localStorage.setItem("sb_anon_key", sbAnonKey.trim());
    resetClient();
    setTesting(true);
    setConnStatus(null);
    const result = await testConnection();

    setTesting(false);
    if (result.ok) {
      setConnStatus("ok");
      setConnMsg("Connection successful!");
      addToast("Supabase connected!", "success");
      storeRefresh();
    } else {
      setConnStatus("error");
      setConnMsg(result.error || "Unknown error");
      addToast(`Connection failed: ${result.error}`, "error");
    }
  };

  const handleSeedData = async () => {
    if (!isSupabaseConfigured()) {
      addToast("Connect Supabase first", "error");

      return;
    }
    setSeeding(true);
    const result = await sbSeedInitialData(storeProducts, storeCategories);

    setSeeding(false);
    if (result.ok) {
      addToast("Sample data seeded to Supabase!", "success");
      storeRefresh();
    } else {
      addToast(`Seed failed: ${result.error}`, "error");
    }
  };

  const handleCopySQL = () => {
    navigator.clipboard
      .writeText(SCHEMA_SQL)
      .then(() => {
        setSqlCopied(true);
        setTimeout(() => setSqlCopied(false), 2000);
      })
      .catch(() => {
        addToast("Could not access the clipboard — copy the SQL manually.", "error");
      });
  };

  const handleSaveEmailjs = () => {
    localStorage.setItem("ejs_service", emailjs.serviceId);
    localStorage.setItem("ejs_booking", emailjs.bookingTemplate);
    localStorage.setItem("ejs_order", emailjs.orderTemplate);
    localStorage.setItem("ejs_pubkey", emailjs.publicKey);
    addToast("EmailJS settings saved and ready for bookings.", "success");
  };

  const handleSaveStripeKey = () => {
    const trimmed = stripePubKey.trim();

    if (trimmed && !trimmed.startsWith("pk_")) {
      addToast(
        'Publishable keys start with "pk_" — double-check you copied the right key.',
        "error",
      );

      return;
    }
    localStorage.setItem("stripe_publishable_key", trimmed);
    setStripeSaved(!!trimmed);
    addToast("Stripe publishable key saved", "success");
  };

  const handleChangePw = async () => {
    if (!newPw || !confirmPw) {
      addToast("Fill in both password fields", "error");

      return;
    }
    if (newPw !== confirmPw) {
      addToast("Passwords do not match", "error");

      return;
    }
    if (newPw.length < 12) {
      addToast("Password must be at least 12 characters", "error");

      return;
    }
    const { error } = await changePassword(newPw);

    if (error) {
      addToast(
        `Failed to update password: ${(error as { message?: string }).message}`,
        "error",
      );
    } else {
      addToast("Password updated successfully via Supabase Auth", "success");
      setNewPw("");
      setConfirmPw("");
    }
  };

  return (
    <div>
      <AdminPageHeader
        description="Manage your cloud database credentials, payment webhooks, notification engines, and admin credentials."
        eyebrow="System Configuration"
        title="Store & Integration Settings"
      />

      {/* Supabase */}
      <AdminSettingsCard
        description="Persist products, categories, orders, and repair bookings in real-time."
        icon={Database}
        statusChip={
          connStatus === "ok" || (!connStatus && usingSupabase) ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-bold text-success">
              <CheckCircle2 className="size-4" />{" "}
              {connStatus === "ok" ? "Connected" : "Supabase Live"}
            </span>
          ) : connStatus === "error" ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-danger/15 px-3 py-1.5 text-xs font-bold text-danger">
              <CircleX className="size-4" /> Connection Error
            </span>
          ) : null
        }
        title="Supabase Cloud Database"
      >
        <SettingsStepItem
          description={
            <>
              Copy the SQL migration script below, navigate to your Supabase{" "}
              <strong>SQL Editor</strong>, paste, and click <strong>Run</strong>
              .
            </>
          }
          number={1}
          title="Execute Database Schema SQL"
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setSqlOpen((o) => !o)}>
              {sqlOpen ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              <span>{sqlOpen ? "Collapse SQL Schema" : "View SQL Schema"}</span>
            </Button>
            <Button variant="primary" onClick={handleCopySQL}>
              <Copy className="size-4" />
              <span>
                {sqlCopied ? "Copied to Clipboard!" : "Copy SQL Script"}
              </span>
            </Button>
          </div>
          {sqlOpen && (
            <pre className="max-h-80 overflow-y-auto rounded-2xl bg-surface-tertiary p-4 text-xs">
              {SCHEMA_SQL}
            </pre>
          )}
        </SettingsStepItem>

        <SettingsStepItem
          description={
            <>
              Located in your Supabase project under{" "}
              <strong>Project Settings → API</strong>.
            </>
          }
          number={2}
          title="Project API Credentials"
        >
          <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <TextField
              className="flex flex-col gap-1.5"
              value={sbUrl}
              onChange={setSbUrl}
            >
              <Label>Project URL (https://your-project.supabase.co)</Label>
              <InputGroup>
                <InputGroup.Input />
              </InputGroup>
            </TextField>
            <TextField
              className="flex flex-col gap-1.5"
              value={sbAnonKey}
              onChange={setSbAnonKey}
            >
              <Label>Anon / Public API Key</Label>
              <InputGroup>
                <InputGroup.Input />
              </InputGroup>
            </TextField>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="outline" onClick={handleSaveSupabase}>
              <Save className="size-4" />
              <span>Save API Credentials</span>
            </Button>
            <Button
              isDisabled={testing}
              variant="primary"
              onClick={handleTestConnection}
            >
              <Database className="size-4" />
              <span>{testing ? "Testing Connection…" : "Test Connection"}</span>
            </Button>
          </div>
          {connStatus === "error" && (
            <Alert className="mt-3" role="alert" status="danger">
              <Alert.Indicator>
                <TriangleAlert className="size-4" />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Description>{connMsg}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}
          {connStatus === "ok" && (
            <Alert className="mt-3" status="success">
              <Alert.Indicator>
                <CheckCircle2 className="size-4" />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Description>{connMsg}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}
        </SettingsStepItem>

        <SettingsStepItem
          description="Push your local products and categories up to Supabase database tables."
          number={3}
          title="Seed Initial Catalog Data"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button
              isDisabled={seeding || !isSupabaseConfigured()}
              variant="primary"
              onClick={handleSeedData}
            >
              <CloudUpload className="size-4" />
              <span>
                {seeding
                  ? "Seeding Catalog…"
                  : `Seed ${storeProducts.length} Products & ${storeCategories.length} Categories`}
              </span>
            </Button>
            {!isSupabaseConfigured() && (
              <span className="text-[13px] text-muted">
                Connect Supabase first
              </span>
            )}
          </div>
        </SettingsStepItem>
      </AdminSettingsCard>

      {/* EmailJS */}
      <AdminSettingsCard
        description="Send automated confirmation emails for new repair bookings and store checkout orders."
        icon={Mail}
        title="EmailJS Notifications"
      >
        <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <TextField
            className="flex flex-col gap-1.5"
            value={emailjs.serviceId}
            onChange={(v) => setEmailjs((s) => ({ ...s, serviceId: v }))}
          >
            <Label>EmailJS Service ID</Label>
            <InputGroup>
              <InputGroup.Input />
            </InputGroup>
          </TextField>
          <TextField
            className="flex flex-col gap-1.5"
            value={emailjs.publicKey}
            onChange={(v) => setEmailjs((s) => ({ ...s, publicKey: v }))}
          >
            <Label>Public Key</Label>
            <InputGroup>
              <InputGroup.Input />
            </InputGroup>
          </TextField>
          <TextField
            className="flex flex-col gap-1.5"
            value={emailjs.bookingTemplate}
            onChange={(v) => setEmailjs((s) => ({ ...s, bookingTemplate: v }))}
          >
            <Label>Booking Template ID</Label>
            <InputGroup>
              <InputGroup.Input />
            </InputGroup>
          </TextField>
          <TextField
            className="flex flex-col gap-1.5"
            value={emailjs.orderTemplate}
            onChange={(v) => setEmailjs((s) => ({ ...s, orderTemplate: v }))}
          >
            <Label>Order Template ID</Label>
            <InputGroup>
              <InputGroup.Input />
            </InputGroup>
          </TextField>
        </div>
        <Button variant="primary" onClick={handleSaveEmailjs}>
          <Save className="size-4" />
          <span>Save EmailJS Settings</span>
        </Button>
      </AdminSettingsCard>

      {/* Stripe */}
      <AdminSettingsCard
        description="Publishable key for embedded card checkout, Apple Pay, and Google Pay. Secret keys stay server-side only."
        icon={CreditCard}
        statusChip={
          stripeSaved ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-bold text-success">
              <CheckCircle2 className="size-4" /> Configured
            </span>
          ) : (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-tertiary px-3 py-1.5 text-xs font-bold text-muted">
              Not Configured
            </span>
          )
        }
        title="Stripe Payment Integration"
      >
        <SettingsStepItem
          description={
            <>
              From <strong>dashboard.stripe.com/apikeys</strong> — the key
              starting with <code>pk_</code>. Safe to store here; it&rsquo;s
              designed to be public.
            </>
          }
          number={1}
          title="Publishable Key"
        >
          <TextField
            className="mb-3 flex flex-col gap-1.5 sm:max-w-md"
            value={stripePubKey}
            onChange={setStripePubKey}
          >
            <Label>Publishable Key (pk_live_… or pk_test_…)</Label>
            <InputGroup>
              <InputGroup.Input />
            </InputGroup>
          </TextField>
          <Button variant="primary" onClick={handleSaveStripeKey}>
            <Save className="size-4" />
            <span>Save Publishable Key</span>
          </Button>
        </SettingsStepItem>

        <SettingsStepItem
          description="These two never go in this form, and never should — they grant full account access and must live only in your hosting provider's environment variables, never in a browser-reachable database or bundle."
          number={2}
          title="Secret Key & Webhook Secret (server-side only)"
        >
          <div className="rounded-2xl bg-surface-tertiary p-5">
            <p className="m-0 mb-1.5 text-[13px] text-muted">
              1. Set <code>STRIPE_SECRET_KEY</code> (starts with{" "}
              <code>sk_</code>) as an environment variable in your hosting
              platform.
            </p>
            <p className="m-0 text-[13px] text-muted">
              2. Point your Stripe Webhook to <code>/api/stripe-webhook</code>,
              listening for <code>checkout.session.completed</code>, and set{" "}
              <code>STRIPE_WEBHOOK_SECRET</code> the same way.
            </p>
          </div>
        </SettingsStepItem>
      </AdminSettingsCard>

      {/* Password */}
      <AdminSettingsCard
        description={
          isSupabaseConfigured()
            ? "Update your administrator account password via Supabase Auth."
            : "Local fallback access mode active."
        }
        icon={KeyRound}
        title="Admin Account Security"
      >
        {isSupabaseConfigured() ? (
          <div>
            <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <TextField
                className="flex flex-col gap-1.5"
                type={showPw ? "text" : "password"}
                value={newPw}
                onChange={setNewPw}
              >
                <Label>New Password (min 12 chars)</Label>
                <InputGroup>
                  <InputGroup.Input />
                  <InputGroup.Suffix>
                    <button
                      aria-label={showPw ? "Hide password" : "Show password"}
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
              <TextField
                className="flex flex-col gap-1.5"
                type="password"
                value={confirmPw}
                onChange={setConfirmPw}
              >
                <Label>Confirm New Password</Label>
                <InputGroup>
                  <InputGroup.Input />
                </InputGroup>
                <FieldError />
              </TextField>
            </div>
            <Button variant="primary" onClick={handleChangePw}>
              <KeyRound className="size-4" />
              <span>Update Password</span>
            </Button>
          </div>
        ) : (
          <Alert status="warning">
            <Alert.Indicator>
              <TriangleAlert className="size-4" />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Description>
                Local development mode active. Set{" "}
                <code>VITE_LOCAL_ADMIN_PW</code> in your <code>.env</code> file.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}
      </AdminSettingsCard>
    </div>
  );
}
