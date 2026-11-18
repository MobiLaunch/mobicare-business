import { useSyncExternalStore } from "react";

// ─── Environment variable helpers ─────────────────────────────────────────────
function requireEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined;

  if (!value) {
    console.warn(
      `[config] Missing environment variable: ${key}. See .env.example.`,
    );
  }

  return value || "";
}

// ─── Shared ShopConfig loaded from site_settings('shop-config') ───────────────
export interface RuntimeShopConfig {
  storefrontUrl: string;
  stripePublishableKey: string;
  reviewUrl: string;
  emailjs: {
    serviceId: string;
    bookingTemplate: string;
    orderTemplate: string;
    publicKey: string;
  };
  loyalty?: {
    enabled: boolean;
    pointsPerDollar: number;
    redeemPoints: number;
    redeemValue: number;
  };
}

let _runtimeShopConfig: RuntimeShopConfig = {
  storefrontUrl: "https://www.shopmobicare.com",
  stripePublishableKey: "",
  reviewUrl: "",
  emailjs: {
    serviceId: "",
    bookingTemplate: "",
    orderTemplate: "",
    publicKey: "",
  },
};

const _listeners = new Set<() => void>();
function notifyShopConfigListeners() {
  _listeners.forEach((fn) => fn());
}

export function setRuntimeShopConfig(partial: Partial<RuntimeShopConfig>) {
  _runtimeShopConfig = {
    ..._runtimeShopConfig,
    ...partial,
    emailjs: {
      ..._runtimeShopConfig.emailjs,
      ...(partial.emailjs || {}),
    },
  };
  notifyShopConfigListeners();
}

export function getRuntimeShopConfig(): RuntimeShopConfig {
  return _runtimeShopConfig;
}

export function subscribeShopConfig(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

export function useRuntimeShopConfig(): RuntimeShopConfig {
  return useSyncExternalStore(
    subscribeShopConfig,
    getRuntimeShopConfig,
    getRuntimeShopConfig,
  );
}

// ─── Supabase ─────────────────────────────────────────────────────────────────
export const SUPABASE_URL = requireEnv("VITE_SUPABASE_URL");
export const SUPABASE_ANON_KEY = requireEnv("VITE_SUPABASE_ANON_KEY");

// ─── Stripe ───────────────────────────────────────────────────────────────────
export function getStripePublishableKey(): string {
  const lsKey =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("stripe_publishable_key")
      : null;

  return (
    lsKey?.trim() ||
    _runtimeShopConfig.stripePublishableKey?.trim() ||
    (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string) ||
    ""
  );
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripePublishableKey());
}

// ─── EmailJS ──────────────────────────────────────────────────────────────────
export const EMAILJS_CONFIG = {
  serviceId: requireEnv("VITE_EMAILJS_SERVICE_ID"),
  bookingTemplateId: requireEnv("VITE_EMAILJS_BOOKING_TEMPLATE_ID"),
  orderTemplateId: requireEnv("VITE_EMAILJS_ORDER_TEMPLATE_ID"),
  publicKey: requireEnv("VITE_EMAILJS_PUBLIC_KEY"),
};

export function getEmailJSConfig() {
  const lsService =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("ejs_service")
      : null;
  const lsBooking =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("ejs_booking")
      : null;
  const lsOrder =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("ejs_order")
      : null;
  const lsPubkey =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("ejs_pubkey")
      : null;

  return {
    serviceId:
      lsService?.trim() ||
      _runtimeShopConfig.emailjs.serviceId?.trim() ||
      EMAILJS_CONFIG.serviceId,
    bookingTemplateId:
      lsBooking?.trim() ||
      _runtimeShopConfig.emailjs.bookingTemplate?.trim() ||
      EMAILJS_CONFIG.bookingTemplateId,
    orderTemplateId:
      lsOrder?.trim() ||
      _runtimeShopConfig.emailjs.orderTemplate?.trim() ||
      EMAILJS_CONFIG.orderTemplateId,
    publicKey:
      lsPubkey?.trim() ||
      _runtimeShopConfig.emailjs.publicKey?.trim() ||
      EMAILJS_CONFIG.publicKey,
  };
}

export function getReviewUrl(): string {
  return _runtimeShopConfig.reviewUrl?.trim() || "";
}

export function getStorefrontUrl(): string {
  return (
    _runtimeShopConfig.storefrontUrl?.trim() || "https://www.shopmobicare.com"
  );
}

export const GOOGLE_MAPS_API_KEY = requireEnv("VITE_GOOGLE_MAPS_API_KEY");

// ─── Business info defaults ───────────────────────────────────────────────────
export const BUSINESS = {
  name: "Mobicare Device Recovery",
  tagline: "Fix. Protect. Upgrade.",
  phone: "618-204-1497",
  email: "Mobicarehello@gmail.com",
  address: "920 Commerce Drive, Suite 3, Fairfield, IL 62837",
  city: "Fairfield, IL 62837",
  hours: [
    { days: "Monday – Friday", hours: "9:00 AM – 6:00 PM" },
    { days: "Saturday", hours: "10:00 AM – 4:00 PM" },
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
