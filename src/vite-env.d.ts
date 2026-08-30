/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  readonly VITE_EMAILJS_SERVICE_ID: string;
  readonly VITE_EMAILJS_BOOKING_TEMPLATE_ID: string;
  readonly VITE_EMAILJS_ORDER_TEMPLATE_ID: string;
  readonly VITE_EMAILJS_PUBLIC_KEY: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_AKKO_PARTNER_ID: string;
  readonly VITE_AKKO_PARTNER_URL: string;
  readonly VITE_LOCAL_ADMIN_PW: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "./__canvas_preview__" {
  import type { ComponentType } from "react";
  const CanvasPreview: ComponentType;
  export default CanvasPreview;
}
