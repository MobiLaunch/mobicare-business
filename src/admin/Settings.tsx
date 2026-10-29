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
  KeyRound,
  Mail,
  Save,
} from "lucide-react";
import { Alert } from "@/components/arc/alert/alert";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";
import { PasswordField } from "@/components/arc/password-field/password-field";

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

  const ok = (label: string) => <span className="ad-pill" data-tone="success"><CheckCircle2 aria-hidden="true" size={14} />{label}</span>;

  return (
    <div className="ad-stack">
      <AdminPageHeader
        description="Database, payments, notifications and admin credentials."
        title="Settings"
      />

      <AdminSettingsCard
        description="Persist products, categories, orders, and repair bookings in real time."
        icon={Database}
        statusChip={
          connStatus === "ok" || (!connStatus && usingSupabase)
            ? ok(connStatus === "ok" ? "Connected" : "Supabase live")
            : connStatus === "error"
              ? <span className="ad-pill" data-tone="danger"><CircleX aria-hidden="true" size={14} />Connection error</span>
              : null
        }
        title="Supabase database"
      >
        <SettingsStepItem
          description={<>Copy the SQL migration script below, open your Supabase <strong>SQL Editor</strong>, paste, and click <strong>Run</strong>.</>}
          number={1}
          title="Run the database schema"
        >
          <div className="ad-actions">
            <Button variant="secondary" onClick={() => setSqlOpen((o) => !o)}>
              {sqlOpen ? <ChevronUp aria-hidden="true" size={16} /> : <ChevronDown aria-hidden="true" size={16} />}
              {sqlOpen ? "Hide SQL schema" : "View SQL schema"}
            </Button>
            <Button onClick={handleCopySQL}>
              <Copy aria-hidden="true" size={16} />
              {sqlCopied ? "Copied" : "Copy SQL script"}
            </Button>
          </div>
          {sqlOpen && <pre className="ad-pre">{SCHEMA_SQL}</pre>}
        </SettingsStepItem>

        <SettingsStepItem
          description={<>Located in your Supabase project under <strong>Project Settings → API</strong>.</>}
          number={2}
          title="Project API credentials"
        >
          <div className="ad-stack-sm">
            <div className="ad-form-2">
              <Input autoComplete="off" label="Project URL" placeholder="https://your-project.supabase.co" value={sbUrl} onChange={(e) => setSbUrl(e.target.value)} />
              <Input autoComplete="off" label="Anon / public API key" value={sbAnonKey} onChange={(e) => setSbAnonKey(e.target.value)} />
            </div>
            <div className="ad-actions">
              <Button variant="secondary" onClick={handleSaveSupabase}>
                <Save aria-hidden="true" size={16} />Save credentials
              </Button>
              <Button loading={testing} onClick={handleTestConnection}>
                <Database aria-hidden="true" size={16} />{testing ? "Testing…" : "Test connection"}
              </Button>
            </div>
            {connStatus === "error" && <Alert role="alert" title="Connection failed" tone="danger">{connMsg}</Alert>}
            {connStatus === "ok" && <Alert title={connMsg} tone="success" />}
          </div>
        </SettingsStepItem>

        <SettingsStepItem
          description="Push your local products and categories up to the Supabase tables."
          number={3}
          title="Seed the catalog"
        >
          <div className="ad-actions">
            <Button disabled={seeding || !isSupabaseConfigured()} loading={seeding} onClick={handleSeedData}>
              <CloudUpload aria-hidden="true" size={16} />
              {seeding ? "Seeding…" : `Seed ${storeProducts.length} products & ${storeCategories.length} categories`}
            </Button>
            {!isSupabaseConfigured() && <span className="ad-hint">Connect Supabase first</span>}
          </div>
        </SettingsStepItem>
      </AdminSettingsCard>

      <AdminSettingsCard
        description="Send automated confirmation emails for new repair bookings and store orders."
        icon={Mail}
        title="EmailJS notifications"
      >
        <SettingsStepItem
          description={<>From <strong>dashboard.emailjs.com</strong>: your service, public key, and the two template IDs.</>}
          number={1}
          title="EmailJS credentials"
        >
          <div className="ad-stack-sm">
            <div className="ad-form-2">
              <Input autoComplete="off" label="Service ID" value={emailjs.serviceId} onChange={(e) => setEmailjs((s) => ({ ...s, serviceId: e.target.value }))} />
              <Input autoComplete="off" label="Public key" value={emailjs.publicKey} onChange={(e) => setEmailjs((s) => ({ ...s, publicKey: e.target.value }))} />
              <Input autoComplete="off" label="Booking template ID" value={emailjs.bookingTemplate} onChange={(e) => setEmailjs((s) => ({ ...s, bookingTemplate: e.target.value }))} />
              <Input autoComplete="off" label="Order template ID" value={emailjs.orderTemplate} onChange={(e) => setEmailjs((s) => ({ ...s, orderTemplate: e.target.value }))} />
            </div>
            <div className="ad-actions">
              <Button onClick={handleSaveEmailjs}><Save aria-hidden="true" size={16} />Save EmailJS settings</Button>
            </div>
          </div>
        </SettingsStepItem>
      </AdminSettingsCard>

      <AdminSettingsCard
        description="Publishable key for embedded card checkout, Apple Pay, and Google Pay. Secret keys stay server-side only."
        icon={CreditCard}
        statusChip={stripeSaved ? ok("Configured") : <span className="ad-pill" data-tone="neutral">Not configured</span>}
        title="Stripe payments"
      >
        <SettingsStepItem
          description={<>From <strong>dashboard.stripe.com/apikeys</strong>, the key starting with <code>pk_</code>. Safe to store here; it&rsquo;s designed to be public.</>}
          number={1}
          title="Publishable key"
        >
          <div className="ad-stack-sm" style={{ maxWidth: "28rem" }}>
            <Input autoComplete="off" label="Publishable key" placeholder="pk_live_… or pk_test_…" value={stripePubKey} onChange={(e) => setStripePubKey(e.target.value)} />
            <div className="ad-actions">
              <Button onClick={handleSaveStripeKey}><Save aria-hidden="true" size={16} />Save publishable key</Button>
            </div>
          </div>
        </SettingsStepItem>

        <SettingsStepItem
          description="These never go in this form. They grant full account access and must live only in your hosting provider's environment variables."
          number={2}
          title="Secret key & webhook secret (server-side only)"
        >
          <div className="ad-note">
            <p>1. Set <code>STRIPE_SECRET_KEY</code> (starts with <code>sk_</code>) as an environment variable in your hosting platform.</p>
            <p>2. Point your Stripe webhook to <code>/api/stripe-webhook</code>, listening for <code>payment_intent.succeeded</code>, <code>payment_intent.payment_failed</code>, <code>payment_intent.canceled</code>, and <code>charge.refunded</code>, and set <code>STRIPE_WEBHOOK_SECRET</code> the same way.</p>
          </div>
        </SettingsStepItem>
      </AdminSettingsCard>

      <AdminSettingsCard
        description={isSupabaseConfigured() ? "Update your administrator password via Supabase Auth." : "Local fallback access mode active."}
        icon={KeyRound}
        title="Admin account security"
      >
        {isSupabaseConfigured() ? (
          <div className="ad-stack-sm">
            <div className="ad-form-2">
              <PasswordField autoComplete="new-password" description="At least 12 characters." label="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              <PasswordField autoComplete="new-password" label="Confirm new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
            </div>
            <div className="ad-actions">
              <Button onClick={handleChangePw}><KeyRound aria-hidden="true" size={16} />Update password</Button>
            </div>
          </div>
        ) : (
          <Alert title="Local development mode" tone="warning">
            Set <code>VITE_LOCAL_ADMIN_PW</code> in your <code>.env</code> file.
          </Alert>
        )}
      </AdminSettingsCard>
    </div>
  );
}
