import { getClient, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Storefront settings (Stripe publishable key, EmailJS ids) are edited in the POS and stored in the
 * shared `site_settings` table. They are public values, so the site reads them on load and mirrors
 * them into the keys the config helpers already read.
 */
export async function syncShopConfig(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const sb = getClient();

  if (!sb) return;
  try {
    const { data } = await sb.from("site_settings").select("content").eq("id", "shop-config").maybeSingle();
    const c = data?.content as
      | { stripePublishableKey?: string; emailjs?: { serviceId?: string; bookingTemplate?: string; orderTemplate?: string; publicKey?: string } }
      | undefined;

    if (!c) return;
    const put = (key: string, value?: string) => { if (value) localStorage.setItem(key, value); };

    put("stripe_publishable_key", c.stripePublishableKey);
    put("ejs_service", c.emailjs?.serviceId);
    put("ejs_booking", c.emailjs?.bookingTemplate);
    put("ejs_order", c.emailjs?.orderTemplate);
    put("ejs_pubkey", c.emailjs?.publicKey);
  } catch {
    /* storage or network unavailable: the build-time values still apply */
  }
}
