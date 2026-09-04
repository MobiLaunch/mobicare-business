// ─── Environment variable helpers ─────────────────────────────────────────────
// All sensitive values come from .env (VITE_ prefix exposes them to the browser).
// Never hardcode credentials here. See .env.example for required variables.

function requireEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined;

  if (!value) {
    console.warn(
      `[config] Missing environment variable: ${key}. See .env.example.`,
    );
  }

  return value || "";
}

// ─── Supabase ─────────────────────────────────────────────────────────────────
export const SUPABASE_URL = requireEnv("VITE_SUPABASE_URL");
export const SUPABASE_ANON_KEY = requireEnv("VITE_SUPABASE_ANON_KEY");

// ─── NovaOps POS ────────────────────────────────────────────────────────────
// The shop's NovaOps (Supabase Auth) user id — customer_messages rows are
// scoped to it so the POS's Messages -> Customer Chat can find them. Single
// shop, so this is one fixed id; get it from Supabase Dashboard ->
// Authentication -> Users (the account signed into NovaOps).
export const NOVAOPS_PROFILE_ID = requireEnv("VITE_NOVAOPS_PROFILE_ID");

// ─── Stripe ───────────────────────────────────────────────────────────────────
// Publishable key for client-side card elements / payment redirects.
// Can be configured in Admin Settings (stored in localStorage) or via VITE_STRIPE_PUBLISHABLE_KEY.
// Secret keys stay server-side only in hosting environment variables.
export function getStripePublishableKey(): string {
  return (
    (typeof localStorage !== "undefined"
      ? localStorage.getItem("stripe_publishable_key")
      : null) ||
    (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string) ||
    ""
  );
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripePublishableKey());
}

// ─── EmailJS ──────────────────────────────────────────────────────────────────
// Can be configured via .env or in Admin Settings (stored in localStorage).
// Admin-settings values win so post-deployment changes don't require a rebuild.
export const EMAILJS_CONFIG = {
  serviceId: requireEnv("VITE_EMAILJS_SERVICE_ID"),
  bookingTemplateId: requireEnv("VITE_EMAILJS_BOOKING_TEMPLATE_ID"),
  orderTemplateId: requireEnv("VITE_EMAILJS_ORDER_TEMPLATE_ID"),
  publicKey: requireEnv("VITE_EMAILJS_PUBLIC_KEY"),
};

// Backwards-compatible helper used by BookingWizard
export function getEmailJSConfig() {
  if (typeof localStorage === "undefined") return EMAILJS_CONFIG;

  const lsService = localStorage.getItem("ejs_service");
  const lsBooking = localStorage.getItem("ejs_booking");
  const lsOrder = localStorage.getItem("ejs_order");
  const lsPubkey = localStorage.getItem("ejs_pubkey");

  return {
    serviceId: lsService || EMAILJS_CONFIG.serviceId,
    bookingTemplateId: lsBooking || EMAILJS_CONFIG.bookingTemplateId,
    orderTemplateId: lsOrder || EMAILJS_CONFIG.orderTemplateId,
    publicKey: lsPubkey || EMAILJS_CONFIG.publicKey,
  };
}

export const GOOGLE_MAPS_API_KEY = requireEnv("VITE_GOOGLE_MAPS_API_KEY");

// ─── Business info ────────────────────────────────────────────────────────────
// Non-sensitive — fine to stay in source code. Edit here to update site defaults.
export const BUSINESS = {
  name: "Mobicare Device Recovery",
  tagline: "Fix. Protect. Upgrade.",
  phone: "618-204-1497",
  email: "Mobicarehello@gmail.com",
  address: "Fairfield, Illinois",
  city: "Fairfield, IL 62837",
  hours: [
    { days: "Monday – Friday", hours: "10:00 AM – 6:00 PM" },
    { days: "Saturday", hours: "12:00 PM – 4:00 PM" },
    { days: "Sunday", hours: "Closed" },
  ],
  social: { facebook: "", instagram: "", google: "" },
};

// ─── AKKO Protection & Insurance ──────────────────────────────────────────────
export const AKKO_CONFIG = {
  partnerId: (import.meta.env.VITE_AKKO_PARTNER_ID as string) || "mobicare",
  partnerUrl:
    (import.meta.env.VITE_AKKO_PARTNER_URL as string) ||
    "https://getakko.com/?ref=mobicare",
  docsUrl: "https://docs.getakko.com/public/v2/introduction",
  phonePlanPrice: 5,
  everythingPlanPrice: 15,
  familyPlanPrice: 25,
};
