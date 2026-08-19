import type { SiteAppearance, ColorScheme } from "@/types/domain";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { sbUpsertSiteSettings, isSupabaseConfigured } from "./supabase";

// ─── Site content shape ─────────────────────────────────────────────────────
export interface Brand {
  name: string;
  subLabel: string;
  tagline: string;
}
export interface Hero {
  badgeText: string;
  headlineLine1: string;
  headlineAccent: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
}
export interface TrustItem {
  icon: string;
  label: string;
  desc: string;
}
export interface RepairBanner {
  eyebrow: string;
  headline: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
}
export interface RepairServiceVariant {
  name: string;
  price: string;
}

export interface SiteRepairService {
  id: string;
  name: string;
  icon: string;
  duration: string;
  priceRange: string;
  description: string;
  // Optional per-part pricing options (e.g. "Screen Repair" -> OEM vs
  // Aftermarket). No default repair service currently populates this, but
  // BookingWizard has a real UI branch that renders it when present.
  variants?: RepairServiceVariant[];
}
export interface About {
  eyebrow: string;
  headline: string;
  lead: string;
  story: string[];
}
export interface BusinessHour {
  days: string;
  hours: string;
}
export interface BusinessInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  hours: BusinessHour[];
}
export interface Appearance extends SiteAppearance {
  logoType: string;
  logoUrl: string;
  logoAlt: string;
}
export interface Seo {
  siteTitle: string;
  titleSuffix: string;
  metaDescription: string;
  keywords: string;
  ogImage: string;
  googleAnalyticsId: string;
  facebookPixelId: string;
}
export interface Social {
  facebook: string;
  instagram: string;
  twitter: string;
  tiktok: string;
  youtube: string;
  yelp: string;
  google: string;
}
export interface FooterLink {
  label: string;
  href: string;
}
export interface SiteFooter {
  tagline: string;
  showHours: boolean;
  showSocial: boolean;
  copyrightName: string;
  extraLinks: FooterLink[];
}
export interface CtaStrip {
  headline: string;
  subtext: string;
  primaryCta: string;
  secondaryCta: string;
}
export interface DeviceType {
  id: string;
  name: string;
  models: string[];
}

export interface SiteContent {
  brand: Brand;
  hero: Hero;
  trustItems: TrustItem[];
  repairBanner: RepairBanner;
  repairServices: SiteRepairService[];
  about: About;
  business: BusinessInfo;
  appearance: Appearance;
  seo: Seo;
  social: Social;
  footer: SiteFooter;
  ctaStrip: CtaStrip;
  deviceTypes: DeviceType[];
}

// ─── Default site content ──────────────────────────────────────────────────
export const DEFAULT_SITE_CONTENT: SiteContent = {
  brand: {
    name: "Mobicare",
    subLabel: "Device Recovery",
    tagline: "Fix. Protect. Upgrade.",
  },
  hero: {
    badgeText: "Fairfield, Illinois \u00b7 Est. 2019",
    headlineLine1: "Fix. Protect.",
    headlineAccent: "Upgrade.",
    description:
      "Southern Illinois' premier device repair shop. Cracked screen? Dead battery? Water damage? We fix it fast \u2014 and stock everything you need to keep your devices safe after.",
    primaryCta: "Shop Accessories",
    secondaryCta: "Call 618-204-1497",
  },
  trustItems: [
    {
      icon: "bolt",
      label: "Same-Day Repairs",
      desc: "Most screen & battery jobs done same day",
    },
    {
      icon: "shield",
      label: "90-Day Warranty",
      desc: "All repairs covered, no questions asked",
    },
    {
      icon: "schedule",
      label: "Free Diagnostics",
      desc: "No charge to find out what's wrong",
    },
    {
      icon: "star",
      label: "4.9\u2605 Rating",
      desc: "Hundreds of happy customers in Fairfield",
    },
  ],
  repairBanner: {
    eyebrow: "Device Repair",
    headline: "Broken device?\nWe fix it fast.",
    description:
      "Cracked screens, dead batteries, water damage, charging ports, cameras \u2014 if it's broken, there's a good chance we can fix it same-day. Free diagnostic on every device.",
    primaryCta: "See Repair Services",
    secondaryCta: "Call First",
  },
  repairServices: [
    {
      id: "screen-repair",
      name: "Screen Repair",
      icon: "smartphone",
      duration: "1\u20132 hours",
      priceRange: "$49 \u2013 $249",
      description:
        "Cracked or shattered display? We replace screens on iPhones, Androids, and tablets with OEM-quality parts.",
    },
    {
      id: "battery-replacement",
      name: "Battery Replacement",
      icon: "battery_full",
      duration: "30\u201360 min",
      priceRange: "$39 \u2013 $89",
      description:
        "Restore your phone to full battery life. We carry batteries for hundreds of models.",
    },
    {
      id: "water-damage",
      name: "Water Damage Recovery",
      icon: "water_drop",
      duration: "24\u201348 hours",
      priceRange: "Free diagnostic",
      description:
        "Dropped your phone in water? Bring it in immediately. Our ultrasonic cleaning process saves most devices.",
    },
    {
      id: "charging-port",
      name: "Charging Port Repair",
      icon: "ev_station",
      duration: "45\u201390 min",
      priceRange: "$45 \u2013 $99",
      description:
        "Won't charge or connect to a computer? We repair loose or corroded charging ports.",
    },
    {
      id: "camera-repair",
      name: "Camera Repair",
      icon: "photo_camera",
      duration: "1\u20132 hours",
      priceRange: "$59 \u2013 $149",
      description:
        "Blurry, cracked, or non-functional camera module replacement.",
    },
    {
      id: "data-recovery",
      name: "Data Recovery",
      icon: "sd_card",
      duration: "2\u20135 days",
      priceRange: "Quote after diagnostic",
      description:
        "Lost photos, contacts, or files? We recover data from damaged or non-booting devices.",
    },
  ],
  about: {
    eyebrow: "About Us",
    headline: "Mobicare Device Recovery",
    lead: "We're a locally-owned electronics repair shop in Fairfield, Illinois \u2014 serving Wayne County and surrounding areas with honest, fast, quality repairs.",
    story: [
      "Mobicare started with a simple belief: your devices should be repaired by someone who actually cares about doing the job right. As a locally-owned shop, we're not chasing volume \u2014 we're building a reputation, one repair at a time.",
      "We fix what the big-box stores won't touch, and we're honest about what can and can't be done. Free diagnostics mean you'll always know the cost before committing to a repair. No surprises, no hidden fees.",
      "We're also expanding into accessories and certified pre-owned devices \u2014 making it easier for everyone in southern Illinois to get the gear they need at fair prices.",
    ],
  },
  business: {
    name: "Mobicare Device Recovery",
    phone: "618-204-1497",
    email: "Mobicarehello@gmail.com",
    address: "Fairfield, Illinois",
    city: "Fairfield, IL 62837",
    hours: [
      { days: "Monday \u2013 Friday", hours: "9:00 AM \u2013 6:00 PM" },
      { days: "Saturday", hours: "10:00 AM \u2013 4:00 PM" },
      { days: "Sunday", hours: "Closed" },
    ],
  },
  appearance: {
    logoType: "image",
    logoUrl: "",
    logoAlt: "Mobicare logo",
    accentColor: "#13522B",
    accentColorDeep: "#0A3318",
    bgBase: "#F8FAF4",
    bgSurface: "#F8FAF7",
    bgElevated: "#ECEFE8",
    fontFamily: "system",
    fontUrl: "",
    colorScheme: "light",
  },
  seo: {
    siteTitle: "Mobicare Device Recovery",
    titleSuffix: "| Mobicare",
    metaDescription:
      "Southern Illinois' premier device repair shop. Fast screen repairs, battery replacements, water damage recovery, and mobile accessories in Fairfield, IL.",
    keywords:
      "phone repair, screen repair, battery replacement, Fairfield Illinois, device recovery",
    ogImage: "",
    googleAnalyticsId: "",
    facebookPixelId: "",
  },
  social: {
    facebook: "",
    instagram: "",
    twitter: "",
    tiktok: "",
    youtube: "",
    yelp: "",
    google: "",
  },
  footer: {
    tagline: "Fast repairs. Fair prices. Local experts.",
    showHours: true,
    showSocial: true,
    copyrightName: "Mobicare Device Recovery",
    extraLinks: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
  ctaStrip: {
    headline: "Ready to get your device fixed?",
    subtext: "Walk-ins welcome. Most repairs done same day.",
    primaryCta: "Book Appointment",
    secondaryCta: "Browse Shop",
  },
  deviceTypes: [
    {
      id: "iphone",
      name: "iPhone",
      models: [
        "iPhone 15 Pro Max",
        "iPhone 15 Pro",
        "iPhone 15",
        "iPhone 14 Pro Max",
        "iPhone 14 Pro",
        "iPhone 14",
        "iPhone 13",
        "iPhone 12",
        "iPhone 11",
        "iPhone SE",
      ],
    },
    {
      id: "android",
      name: "Android / Samsung",
      models: [
        "Galaxy S24 Ultra",
        "Galaxy S24",
        "Galaxy S23 Ultra",
        "Galaxy S23",
        "Galaxy S22 Ultra",
        "Galaxy A54",
        "Pixel 8 Pro",
        "Pixel 8",
      ],
    },
    {
      id: "ipad",
      name: "iPad / Tablet",
      models: [
        "iPad Pro 12.9",
        "iPad Pro 11",
        "iPad Air",
        "iPad Mini",
        "iPad 10th Gen",
        "Galaxy Tab S9",
      ],
    },
    {
      id: "laptop",
      name: "Laptop / PC",
      models: [
        "MacBook Pro M-Series",
        "MacBook Air M-Series",
        "Dell XPS",
        "Lenovo ThinkPad",
        "HP Spectre",
      ],
    },
    {
      id: "console",
      name: "Game Console",
      models: [
        "PlayStation 5",
        "PlayStation 4",
        "Xbox Series X",
        "Xbox Series S",
        "Nintendo Switch OLED",
        "Nintendo Switch",
      ],
    },
    { id: "other", name: "Other Device", models: [] },
  ],
};

// ─── Font presets ───────────────────────────────────────────────────────────
export interface FontPreset {
  id: string;
  label: string;
  css: string;
  url: string;
}

export const FONT_PRESETS: FontPreset[] = [
  {
    id: "system",
    label: "SF Pro (System Default)",
    css: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    url: "",
  },
  {
    id: "inter",
    label: "Inter",
    css: '"Inter", system-ui, sans-serif',
    url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
  },
  {
    id: "outfit",
    label: "Outfit",
    css: '"Outfit", system-ui, sans-serif',
    url: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap",
  },
  {
    id: "poppins",
    label: "Poppins",
    css: '"Poppins", system-ui, sans-serif',
    url: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap",
  },
  {
    id: "montserrat",
    label: "Montserrat",
    css: '"Montserrat", system-ui, sans-serif',
    url: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap",
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    css: '"DM Sans", system-ui, sans-serif',
    url: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap",
  },
  {
    id: "geist",
    label: "Geist",
    css: '"Geist", system-ui, sans-serif',
    url: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap",
  },
  { id: "custom", label: "Custom URL", css: "", url: "" },
];

// ─── Apply appearance → HeroUI v3 CSS custom properties (instant, no reload) ─
// NOTE (HeroUI v3 migration): the previous version of this function wrote to
// --cyan / --cyan-dim / --cyan-glow / --cyan-deep / --border-accent / --bg-base /
// --bg-surface / --bg-elevated / --bg-panel / --shadow-cyan / --font-display /
// --font-body. None of those custom properties were ever read by any CSS rule
// in this project (BeerCSS themes its own components via its internal JS
// engine, which this function never called) — so the admin "Appearance" panel's
// accent color, background colors, and font pickers have not visibly changed
// anything in the actual UI. This rewrite targets HeroUI v3's real theme
// tokens (@heroui/styles/dist/themes/default/variables.css) so those controls
// actually work. HeroUI derives hover/soft/focus states from --accent and
// --accent-foreground automatically via color-mix(), so we no longer need to
// hand-compute dim/glow/shadow variants ourselves.
export function applyAppearance(a: Appearance) {
  const s = document.documentElement.style;
  const scheme: ColorScheme = a.colorScheme || "dark";

  // Set data-theme on <html>. HeroUI's own theme CSS matches
  // `.dark, [data-theme="dark"]`, so this attribute alone drives HeroUI's
  // dark-mode cascade too — no need to also toggle a `.dark` class.
  document.documentElement.setAttribute("data-theme", scheme);
  // Update PWA theme-color
  const themeMetaDark = document.querySelector(
    'meta[name="theme-color"][media*="dark"]',
  );
  const themeMetaLight = document.querySelector(
    'meta[name="theme-color"][media*="light"]',
  );

  if (themeMetaDark)
    themeMetaDark.setAttribute(
      "content",
      scheme === "dark" ? "#000000" : a.bgBase || "#000000",
    );
  if (themeMetaLight)
    themeMetaLight.setAttribute(
      "content",
      scheme === "light" ? "#f5f5f7" : "#000000",
    );

  // "Accent Deep (CTAs)" is described in the admin UI as the solid background
  // used on primary buttons — that's exactly HeroUI's --accent role.
  // "Accent (Primary)" is described as active links/badges — map it to
  // --link and --focus (the brighter, more frequently-visible accent).
  const ctaColor = a.accentColorDeep || a.accentColor;

  if (ctaColor) {
    s.setProperty("--accent", ctaColor);
    s.setProperty("--accent-foreground", pickForeground(ctaColor));
  }
  if (a.accentColor) {
    s.setProperty("--link", a.accentColor);
    s.setProperty("--focus", a.accentColor);
  }

  if (scheme === "dark") {
    // Backgrounds are only admin-customizable in dark mode — light mode
    // keeps HeroUI's built-in light-theme neutrals (same asymmetry the
    // previous implementation had, just now actually wired up).
    if (a.bgBase) s.setProperty("--background", a.bgBase);
    if (a.bgSurface) s.setProperty("--surface", a.bgSurface);
    if (a.bgElevated) s.setProperty("--surface-secondary", a.bgElevated);
  } else {
    s.removeProperty("--background");
    s.removeProperty("--surface");
    s.removeProperty("--surface-secondary");
  }

  const preset = FONT_PRESETS.find((f) => f.id === a.fontFamily);

  if (preset && preset.css) {
    if (preset.url) injectFontLink(preset.id, preset.url);
    // Tailwind v4's own font token — HeroUI/Tailwind base styles apply this
    // to the document by default, so no extra CSS rule is needed to consume it.
    s.setProperty("--font-sans", preset.css);
  }
  if (a.fontFamily === "custom" && a.fontUrl) {
    injectFontLink("custom-font", a.fontUrl);
  }
}

// Naive relative-luminance check to pick a readable foreground (button label
// color) for an arbitrary admin-chosen accent color. Good enough for a solid
// CTA color; not a full WCAG contrast solver.
function pickForeground(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  return luminance > 0.6 ? "#0a0a0a" : "#fafafa";
}

function injectFontLink(id: string, url: string) {
  if (document.getElementById(`font-link-${id}`)) return;
  const link = document.createElement("link");

  link.id = `font-link-${id}`;
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
}

const syncToSupabase = (state: SiteContent) => {
  if (isSupabaseConfigured()) {
    const cleanState: SiteContent = {
      brand: state.brand,
      hero: state.hero,
      trustItems: state.trustItems,
      repairBanner: state.repairBanner,
      repairServices: state.repairServices,
      about: state.about,
      business: state.business,
      appearance: state.appearance,
      seo: state.seo,
      social: state.social,
      footer: state.footer,
      ctaStrip: state.ctaStrip,
      deviceTypes: state.deviceTypes,
    };

    sbUpsertSiteSettings(cleanState as unknown as Record<string, unknown>);
  }
};

// ─── Store ──────────────────────────────────────────────────────────────────
interface SiteContentState extends SiteContent {
  updateBrand: (data: Partial<Brand>) => void;
  updateHero: (data: Partial<Hero>) => void;
  updateRepairBanner: (data: Partial<RepairBanner>) => void;
  updateAbout: (data: Partial<About>) => void;
  updateBusiness: (data: Partial<BusinessInfo>) => void;
  updateAppearance: (data: Partial<Appearance>) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  updateTrustItem: (index: number, data: Partial<TrustItem>) => void;
  updateRepairService: (id: string, data: Partial<SiteRepairService>) => void;
  addRepairService: (service: SiteRepairService) => void;
  deleteRepairService: (id: string) => void;
  setRepairServices: (services: SiteRepairService[]) => void;
  setDeviceTypes: (deviceTypes: DeviceType[]) => void;
  updateBusinessHour: (index: number, data: Partial<BusinessHour>) => void;
  updateSeo: (data: Partial<Seo>) => void;
  updateSocial: (data: Partial<Social>) => void;
  updateFooter: (data: Partial<SiteFooter>) => void;
  updateCtaStrip: (data: Partial<CtaStrip>) => void;
  resetToDefaults: () => void;
}

export const useSiteStore = create<SiteContentState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SITE_CONTENT,

      updateBrand: (data) => {
        set({ brand: { ...get().brand, ...data } });
        syncToSupabase(get());
      },
      updateHero: (data) => {
        set({ hero: { ...get().hero, ...data } });
        syncToSupabase(get());
      },
      updateRepairBanner: (data) => {
        set({ repairBanner: { ...get().repairBanner, ...data } });
        syncToSupabase(get());
      },
      updateAbout: (data) => {
        set({ about: { ...get().about, ...data } });
        syncToSupabase(get());
      },
      updateBusiness: (data) => {
        set({ business: { ...get().business, ...data } });
        syncToSupabase(get());
      },
      updateAppearance: (data) => {
        const next = { ...get().appearance, ...data };

        set({ appearance: next });
        applyAppearance(next);
        syncToSupabase(get());
      },
      setColorScheme: (scheme) => {
        const next = { ...get().appearance, colorScheme: scheme };

        set({ appearance: next });
        applyAppearance(next);
        syncToSupabase(get());
      },
      updateTrustItem: (index, data) => {
        const items = [...get().trustItems];

        items[index] = { ...items[index], ...data };
        set({ trustItems: items });
        syncToSupabase(get());
      },
      updateRepairService: (id, data) => {
        set({
          repairServices: get().repairServices.map((s) =>
            s.id === id ? { ...s, ...data } : s,
          ),
        });
        syncToSupabase(get());
      },
      addRepairService: (service) => {
        set({ repairServices: [...get().repairServices, service] });
        syncToSupabase(get());
      },
      deleteRepairService: (id) => {
        set({
          repairServices: get().repairServices.filter((s) => s.id !== id),
        });
        syncToSupabase(get());
      },
      setRepairServices: (services) => {
        set({ repairServices: services });
        syncToSupabase(get());
      },
      setDeviceTypes: (deviceTypes) => {
        set({ deviceTypes });
        syncToSupabase(get());
      },
      updateBusinessHour: (index, data) => {
        const hours = [...get().business.hours];

        hours[index] = { ...hours[index], ...data };
        set({ business: { ...get().business, hours } });
        syncToSupabase(get());
      },
      updateSeo: (data) => {
        set({ seo: { ...get().seo, ...data } });
        syncToSupabase(get());
      },
      updateSocial: (data) => {
        set({ social: { ...get().social, ...data } });
        syncToSupabase(get());
      },
      updateFooter: (data) => {
        set({ footer: { ...get().footer, ...data } });
        syncToSupabase(get());
      },
      updateCtaStrip: (data) => {
        set({ ctaStrip: { ...get().ctaStrip, ...data } });
        syncToSupabase(get());
      },
      resetToDefaults: () => {
        set({ ...DEFAULT_SITE_CONTENT });
        applyAppearance(DEFAULT_SITE_CONTENT.appearance);
        syncToSupabase(DEFAULT_SITE_CONTENT);
      },
    }),
    { name: "mobicare-site-content" },
  ),
);
