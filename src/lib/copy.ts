import { useSiteStore } from "@/lib/siteStore";

/**
 * Editable page text that isn't part of a content section. Each entry has a stable key, a label for the editor and the
 * built-in wording. The admin can override any of them from the POS Design studio (saved under `copy` in the site
 * content); anything not overridden keeps the default below. Mirror changes to the POS copy of this list.
 */
export interface CopyEntry { key: string; group: string; label: string; text: string; long?: boolean }

export const COPY: CopyEntry[] = [
  { key: "home.services.title", group: "Homepage", label: "Repairs heading", text: "What can we fix?" },
  { key: "home.services.lead", group: "Homepage", label: "Repairs intro", text: "Choose a repair to start booking. Prices are estimates until we see the device.", long: true },
  { key: "home.how.title", group: "Homepage", label: "How it works heading", text: "How it works" },
  { key: "home.how.lead", group: "Homepage", label: "How it works intro", text: "Three steps from broken to back in your pocket." },
  { key: "home.featured.title", group: "Homepage", label: "Best sellers heading", text: "Best sellers" },
  { key: "home.protect.title", group: "Homepage", label: "Protection banner heading", text: "Never pay full price for a broken phone again" },
  { key: "home.protect.button", group: "Homepage", label: "Protection banner button", text: "See plans" },
  { key: "home.hero.book", group: "Homepage", label: "Hero booking button", text: "Book a repair" },
  { key: "home.hero.shop", group: "Homepage", label: "Hero shop button", text: "Shop accessories" },
  { key: "home.cta.book", group: "Homepage", label: "Bottom banner booking button", text: "Book a repair" },
  { key: "product.trust.delivery", group: "Product page", label: "Delivery row title", text: "Estimated delivery" },
  { key: "product.trust.secure.title", group: "Product page", label: "Secure checkout title", text: "Secure checkout" },
  { key: "product.trust.secure.sub", group: "Product page", label: "Secure checkout text", text: "Payments are encrypted and handled by Stripe.", long: true },
  { key: "product.trust.exchange.title", group: "Product page", label: "Exchange title", text: "Exchange if defective" },
  { key: "product.trust.exchange.sub", group: "Product page", label: "Exchange text", text: "All sales are final. Defective items are exchanged in like-new condition with original packaging.", long: true },
  { key: "repairs.faq.title", group: "Repairs page", label: "FAQ heading", text: "Frequently asked questions" },
  { key: "about.vp.1.title", group: "About page", label: "Highlight 1 title", text: "90-day warranty" },
  { key: "about.vp.1.desc", group: "About page", label: "Highlight 1 text", text: "Every part we replace is covered for 90 days. If it fails, we replace it free.", long: true },
  { key: "about.vp.2.title", group: "About page", label: "Highlight 2 title", text: "Same-day service" },
  { key: "about.vp.2.desc", group: "About page", label: "Highlight 2 text", text: "Most screen and battery repairs are done within one to two hours while you wait.", long: true },
  { key: "about.vp.3.title", group: "About page", label: "Highlight 3 title", text: "Honest pricing" },
  { key: "about.vp.3.desc", group: "About page", label: "Highlight 3 text", text: "A $35 flat bench fee for diagnostics. No hidden fees. You approve the cost before we start.", long: true },
  { key: "about.vp.4.title", group: "About page", label: "Highlight 4 title", text: "All major brands" },
  { key: "about.vp.4.desc", group: "About page", label: "Highlight 4 text", text: "iPhones, Samsung, Google Pixel, iPads, tablets and more. We fix them all.", long: true },
  { key: "about.story.title", group: "About page", label: "Story heading", text: "Our story" },
  { key: "about.stat.1.value", group: "About page", label: "Stat 1 number", text: "100%" },
  { key: "about.stat.1.label", group: "About page", label: "Stat 1 label", text: "Guaranteed parts" },
  { key: "about.stat.2.value", group: "About page", label: "Stat 2 number", text: "1 to 2 hr" },
  { key: "about.stat.2.label", group: "About page", label: "Stat 2 label", text: "Average turnaround" },
  { key: "about.stat.3.value", group: "About page", label: "Stat 3 number", text: "Free" },
  { key: "about.stat.3.label", group: "About page", label: "Stat 3 label", text: "Diagnostics with repair" },
  { key: "about.popular.title", group: "About page", label: "Popular repairs heading", text: "Popular repairs" },
  { key: "footer.tagline", group: "Footer", label: "Tagline", text: "Southern Illinois' repair shop for iPhones, Androids, tablets and more. Quality parts and honest service.", long: true },
  { key: "footer.shop", group: "Footer", label: "Shop column title", text: "Shop" },
  { key: "footer.repairs", group: "Footer", label: "Repairs column title", text: "Repairs" },
  { key: "footer.policies", group: "Footer", label: "Policies column title", text: "Policies" },
  { key: "footer.visit", group: "Footer", label: "Contact column title", text: "Visit or call" },
  { key: "footer.rights", group: "Footer", label: "Copyright ending", text: "All rights reserved." },
  { key: "footer.place", group: "Footer", label: "Location line", text: "Fairfield, Illinois" },
  { key: "nav.home", group: "Menu", label: "Home link", text: "Home" },
  { key: "nav.home.hint", group: "Menu", label: "Home hint", text: "Start here" },
  { key: "nav.shop", group: "Menu", label: "Shop link", text: "Shop" },
  { key: "nav.shop.hint", group: "Menu", label: "Shop hint", text: "Chargers, cases and more" },
  { key: "nav.repairs", group: "Menu", label: "Repairs link", text: "Repairs" },
  { key: "nav.repairs.hint", group: "Menu", label: "Repairs hint", text: "Screens, batteries, water damage" },
  { key: "nav.protection", group: "Menu", label: "Protection link", text: "Protection" },
  { key: "nav.protection.hint", group: "Menu", label: "Protection hint", text: "Plans from $5 a month" },
  { key: "nav.about", group: "Menu", label: "About link", text: "About" },
  { key: "nav.about.hint", group: "Menu", label: "About hint", text: "Our story and shop" },
  { key: "footer.link.shop.all", group: "Footer", label: "Link: All products", text: "All products" },
  { key: "footer.link.shop.chargers", group: "Footer", label: "Link: Chargers", text: "Chargers" },
  { key: "footer.link.shop.cases", group: "Footer", label: "Link: Cases", text: "Cases" },
  { key: "footer.link.shop.screen", group: "Footer", label: "Link: Screen protectors", text: "Screen protectors" },
  { key: "footer.link.shop.cables", group: "Footer", label: "Link: Cables", text: "Cables" },
  { key: "footer.link.rep.all", group: "Footer", label: "Link: All services", text: "All services" },
  { key: "footer.link.rep.screen", group: "Footer", label: "Link: Screen repair", text: "Screen repair" },
  { key: "footer.link.rep.battery", group: "Footer", label: "Link: Battery replacement", text: "Battery replacement" },
  { key: "footer.link.rep.water", group: "Footer", label: "Link: Water damage", text: "Water damage" },
  { key: "footer.link.rep.protect", group: "Footer", label: "Link: Device protection", text: "Device protection" },
  { key: "footer.link.pol.shipping", group: "Footer", label: "Link: Shipping", text: "Shipping" },
  { key: "footer.link.pol.returns", group: "Footer", label: "Link: Returns and exchanges", text: "Returns and exchanges" },
  { key: "footer.link.pol.refunds", group: "Footer", label: "Link: Refunds", text: "Refunds" },
  { key: "footer.link.pol.privacy", group: "Footer", label: "Link: Privacy", text: "Privacy" },
  { key: "wizard.title", group: "Booking form", label: "Form title", text: "Book a repair" },
  { key: "wizard.back", group: "Booking form", label: "Back button", text: "Back" },
  { key: "wizard.continue", group: "Booking form", label: "Continue button", text: "Continue" },
  { key: "wizard.confirm", group: "Booking form", label: "Confirm button", text: "Confirm booking" },
  { key: "wizard.done", group: "Booking form", label: "Done button", text: "Done" },
  { key: "wizard.another", group: "Booking form", label: "Book another button", text: "Book another repair" },
  { key: "wizard.after", group: "Booking form", label: "Message after booking", text: "We'll confirm by phone or email within 2 hours during business hours.", long: true },
  { key: "wizard.step.device", group: "Booking form", label: "Step: Device", text: "Device" },
  { key: "wizard.step.repair", group: "Booking form", label: "Step: Repair", text: "Repair" },
  { key: "wizard.step.schedule", group: "Booking form", label: "Step: Schedule", text: "Schedule" },
  { key: "wizard.step.address", group: "Booking form", label: "Step: Address", text: "Address" },
  { key: "wizard.step.contact", group: "Booking form", label: "Step: Contact", text: "Contact" },
  { key: "wizard.step.confirm", group: "Booking form", label: "Step: Confirm", text: "Confirm" },
  { key: "protection.kicker", group: "Protection page", label: "Top badge", text: "Official AKKO protection partner" },
];

const DEFAULTS = new Map(COPY.map((c) => [c.key, c.text]));

/** Preview mode (the storefront inside the POS design studio): elements become clickable to edit. Decided once at load, so it survives in-site navigation. */
const PREVIEW = (() => {
  try {
    if (typeof window === "undefined" || window.parent === window) return false;
    if (/[?&]preview=1/.test(window.location.search)) sessionStorage.setItem("mc-preview", "1");

    return sessionStorage.getItem("mc-preview") === "1";
  } catch { return false; }
})();

export const inPreview = (): boolean => PREVIEW;

/**
 * `const c = useCopy();` then `<h2 {...c.p("home.how.title")}>{c("home.how.title")}</h2>`.
 * `c.p(path)` adds the click-to-edit marker, but only inside the design preview. Pass a copy key for page text,
 * or `section.field` / `section.index.field` for content such as `hero.headlineLine1`.
 */
export function useCopy() {
  const overrides = useSiteStore((s) => (s as unknown as { copy?: Record<string, string> }).copy) || {};
  const text = (key: string): string => {
    const v = overrides[key];

    return typeof v === "string" && v !== "" ? v : DEFAULTS.get(key) ?? "";
  };
  const preview = inPreview();

  text.p = (path: string): Record<string, string> => (preview ? { "data-edit": DEFAULTS.has(path) ? `copy.${path}` : path } : {});

  return text;
}
