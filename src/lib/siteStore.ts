import type { SiteAppearance, ColorScheme } from "@/types/domain";
import { applyDesign } from "@/lib/designTokens";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  getClient,
  sbUpsertSiteSettings,
  isSupabaseConfigured,
} from "./supabase";

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
  /** Optional hero background: a photo or a looping video. */
  mediaType?: "none" | "image" | "video";
  mediaUrl?: string;
  mediaPoster?: string;
  mediaDim?: number;
}
export interface HowStep {
  title: string;
  body: string;
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
// Device taxonomy: Manufacturer → Device Type → Model → Generation(s).
// Generation is optional per model — a model with no generations listed is
// bookable on its own (e.g. a one-off product with no year/variant split).
export interface DeviceModel {
  id: string;
  name: string;
  generations: string[];
}
export interface DeviceCategory {
  id: string;
  name: string;
  models: DeviceModel[];
}
/**
 * Device types, in the order a repair counter meets them rather than
 * alphabetically. The catalogue is stored brand-first, so the booking wizard
 * derives its first step from this list and shows only the brands that make
 * that kind of device.
 */
export const DEVICE_KIND_ORDER = [
  "Phone",
  "Tablet",
  "Laptop",
  "Desktop",
  "Watch",
  "Audio",
  "Smart Home",
] as const;

export interface DeviceManufacturer {
  id: string;
  name: string;
  categories: DeviceCategory[];
}

export interface HouseCallPricing {
  residentialFirstHour: number;
  residentialAdditionalHourRate: number;
  commercialFirstHour: number;
  commercialAdditionalHourRate: number;
}

export interface SiteContent {
  brand: Brand;
  hero: Hero;
  trustItems: TrustItem[];
  heroPoints: string[];
  howItWorks: HowStep[];
  repairBanner: RepairBanner;
  repairServices: SiteRepairService[];
  about: About;
  business: BusinessInfo;
  appearance: Appearance;
  seo: Seo;
  social: Social;
  footer: SiteFooter;
  ctaStrip: CtaStrip;
  deviceManufacturers: DeviceManufacturer[];
  houseCallPricing: HouseCallPricing;
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
  heroPoints: [
    "90-day parts warranty",
    "Same-day on most repairs",
    "iPhone, Android and iPad",
  ],
  howItWorks: [
    {
      title: "Tell us what's wrong",
      body: "Book online in about a minute, or walk in. The $35 bench fee covers a full diagnostic.",
    },
    {
      title: "Fixed fast",
      body: "Most screens and batteries are done the same day, often in one to two hours.",
    },
    {
      title: "Backed for 90 days",
      body: "Every part we install carries a 90-day warranty. We quote before we start.",
    },
  ],
  trustItems: [
    {
      icon: "bolt",
      label: "Same-Day Repairs",
      desc: "Most screen & battery jobs done same day",
    },
    {
      icon: "shield",
      label: "90-Day Warranty",
      desc: "Every part we replace is covered",
    },
    {
      icon: "schedule",
      label: "$35 Bench Fee",
      desc: "Flat diagnostic fee on any device",
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
      "Cracked screens, dead batteries, water damage, charging ports, cameras \u2014 if it's broken, there's a good chance we can fix it same-day. $35 bench fee to diagnose any device.",
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
      priceRange: "$35 Bench Fee",
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
    {
      id: "tablet-repair",
      name: "iPad & Tablet Repair",
      icon: "tablet_mac",
      duration: "Same Day",
      priceRange: "$59 \u2013 $199",
      description:
        "Glass digitizer, LCD display, charging port, and battery replacement for all iPad models.",
    },
    {
      id: "back-glass",
      name: "Laser Back Glass Repair",
      icon: "smartphone",
      duration: "2\u20133 hours",
      priceRange: "$69 \u2013 $149",
      description:
        "Shattered back glass removed via specialized high-precision laser separation.",
    },
  ],
  about: {
    eyebrow: "About Us",
    headline: "Mobicare Device Recovery",
    lead: "We're a locally-owned electronics repair shop in Fairfield, Illinois \u2014 serving Wayne County and surrounding areas with honest, fast, quality repairs.",
    story: [
      "Mobicare started with a simple belief: your devices should be repaired by someone who actually cares about doing the job right. As a locally-owned shop, we're not chasing volume \u2014 we're building a reputation, one repair at a time.",
      "We fix what the big-box stores won't touch, and we're honest about what can and can't be done. A $35 bench fee covers full diagnostics on every device, so you'll always know the cost before committing to a repair. No surprises, no hidden fees.",
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
    accentColor: "",
    accentColorDeep: "",
    bgBase: "",
    bgSurface: "",
    bgElevated: "",
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
  deviceManufacturers: [
    {
      id: "apple",
      name: "Apple",
      categories: [
        {
          id: "apple-phone",
          name: "Phone",
          models: [
            {
              id: "apple-iphone",
              name: "iPhone",
              generations: [
                "17 Pro Max",
                "17 Pro",
                "17",
                "Air",
                "16e",
                "16 Pro Max",
                "16 Pro",
                "16 Plus",
                "16",
                "15 Pro Max",
                "15 Pro",
                "15 Plus",
                "15",
                "SE (3rd gen)",
                "14 Pro Max",
                "14 Pro",
                "14 Plus",
                "14",
                "13 Pro Max",
                "13 Pro",
                "13",
                "13 mini",
                "12 Pro Max",
                "12 Pro",
                "12",
                "12 mini",
                "SE (2nd gen)",
                "11 Pro Max",
                "11 Pro",
                "11",
              ],
            },
          ],
        },
        {
          id: "apple-tablet",
          name: "Tablet",
          models: [
            {
              id: "apple-ipad-pro",
              name: "iPad Pro",
              generations: [
                "(8th gen, M5)",
                "(7th gen, M4)",
                "(6th gen, M2)",
                "(5th gen, M1)",
                "(4th gen, A12Z)",
              ],
            },
            {
              id: "apple-ipad-air",
              name: "iPad Air",
              generations: [
                "(8th gen, M4)",
                "(7th gen, M3)",
                "(6th gen, M2)",
                "(5th gen, M1)",
                "(4th gen)",
                "(3rd gen)",
              ],
            },
            {
              id: "apple-ipad",
              name: "iPad",
              generations: [
                "(11th gen, A16)",
                "(10th gen)",
                "(9th gen)",
                "(8th gen)",
                "(7th gen)",
              ],
            },
            {
              id: "apple-ipad-mini",
              name: "iPad mini",
              generations: ["(7th gen, A17 Pro)", "(6th gen)", "(5th gen)"],
            },
          ],
        },
        {
          id: "apple-laptop",
          name: "Laptop",
          models: [
            {
              id: "apple-macbook-pro",
              name: "MacBook Pro",
              generations: [
                '16" (M5 Pro/Max)',
                '14" (M5)',
                '16" (M4 Pro/Max)',
                '14" (M4)',
                '16" (M3 Pro/Max)',
                '14" (M3)',
                '16" (M2 Pro/Max)',
                '14" (M2 Pro/Max)',
                '13" (M2)',
                '16" (M1 Pro/Max)',
                '14" (M1 Pro/Max)',
                '13" (M1)',
                '16" (Intel)',
                '13" (Intel)',
              ],
            },
            {
              id: "apple-macbook-air",
              name: "MacBook Air",
              generations: [
                '15" (M5)',
                '13" (M5)',
                '15" (M4)',
                '13" (M4)',
                '15" (M3)',
                '13" (M3)',
                '15" (M2)',
                '13" (M2)',
                '13" (M1)',
                '13" (Intel)',
              ],
            },
            { id: "apple-macbook-neo", name: "MacBook Neo", generations: [] },
          ],
        },
        {
          id: "apple-desktop",
          name: "Desktop",
          models: [
            {
              id: "apple-mac-studio",
              name: "Mac Studio",
              generations: [
                "(M5 Max/Ultra)",
                "(M3 Ultra)",
                "(M2 Max/Ultra)",
                "(M1 Max/Ultra)",
              ],
            },
            {
              id: "apple-mac-mini",
              name: "Mac mini",
              generations: ["(M6/M5 Pro)", "(M4/M4 Pro)", "(M1)", "(Intel)"],
            },
            {
              id: "apple-imac",
              name: "iMac",
              generations: ['24" (M4)', '24" (M3)', '24" (M1)', "(Intel)"],
            },
            {
              id: "apple-mac-pro",
              name: "Mac Pro",
              generations: ["(M2 Ultra)", "(2019, Intel Xeon)"],
            },
          ],
        },
        {
          id: "apple-watch",
          name: "Watch",
          models: [
            {
              id: "apple-series",
              name: "Series",
              generations: ["11", "10", "9", "8", "7", "6", "5"],
            },
            {
              id: "apple-se",
              name: "SE",
              generations: ["(3rd gen)", "(2nd gen)", "(1st gen)"],
            },
            {
              id: "apple-ultra",
              name: "Ultra",
              generations: ["3", "2", "(1st gen)"],
            },
          ],
        },
        {
          id: "apple-audio",
          name: "Audio",
          models: [
            {
              id: "apple-airpods-pro",
              name: "AirPods Pro",
              generations: ["3", "(2nd gen)", "(1st gen)"],
            },
            {
              id: "apple-airpods-max",
              name: "AirPods Max",
              generations: ["2", "(1st gen)"],
            },
            {
              id: "apple-airpods",
              name: "AirPods",
              generations: ["4 (ANC)", "4", "(3rd gen)", "(2nd gen)"],
            },
          ],
        },
        {
          id: "apple-smart-home",
          name: "Smart Home",
          models: [
            {
              id: "apple-homepod",
              name: "HomePod",
              generations: ["(2nd gen)", "(1st gen)"],
            },
            { id: "apple-homepod-mini", name: "HomePod mini", generations: [] },
          ],
        },
      ],
    },
    {
      id: "samsung",
      name: "Samsung",
      categories: [
        {
          id: "samsung-phone",
          name: "Phone",
          models: [
            {
              id: "samsung-galaxy",
              name: "Galaxy",
              generations: [
                "S26 Ultra",
                "S25 Ultra",
                "S24 FE",
                "Z Fold 7",
                "Z Flip 7",
                "A57 5G",
                "A56",
                "A36",
                "A27 5G",
                "A17 5G",
                "A17 4G",
                "A07 4G",
              ],
            },
          ],
        },
        {
          id: "samsung-tablet",
          name: "Tablet",
          models: [
            {
              id: "samsung-galaxy-tab",
              name: "Galaxy Tab",
              generations: ["S11 Ultra", "S10 FE+", "A11+", "A11"],
            },
          ],
        },
        {
          id: "samsung-laptop",
          name: "Laptop",
          models: [
            {
              id: "samsung-galaxy",
              name: "Galaxy",
              generations: ["Book6 Pro", 'Chromebook Go 14"'],
            },
          ],
        },
        {
          id: "samsung-watch",
          name: "Watch",
          models: [
            {
              id: "samsung-galaxy-watch",
              name: "Galaxy Watch",
              generations: ["8", "FE"],
            },
          ],
        },
        {
          id: "samsung-audio",
          name: "Audio",
          models: [
            {
              id: "samsung-galaxy-buds",
              name: "Galaxy Buds",
              generations: ["4 Pro", "4"],
            },
          ],
        },
      ],
    },
    {
      id: "google",
      name: "Google",
      categories: [
        {
          id: "google-phone",
          name: "Phone",
          models: [
            {
              id: "google-pixel",
              name: "Pixel",
              generations: ["10 Pro Fold", "10 Pro", "10a", "8a"],
            },
          ],
        },
        {
          id: "google-tablet",
          name: "Tablet",
          models: [
            {
              id: "google-pixel-tablet",
              name: "Pixel Tablet",
              generations: [],
            },
          ],
        },
        {
          id: "google-watch",
          name: "Watch",
          models: [
            {
              id: "google-pixel-watch",
              name: "Pixel Watch",
              generations: ["4"],
            },
          ],
        },
        {
          id: "google-audio",
          name: "Audio",
          models: [
            {
              id: "google-pixel-buds",
              name: "Pixel Buds",
              generations: ["Pro 2"],
            },
          ],
        },
        {
          id: "google-smart-home",
          name: "Smart Home",
          models: [
            {
              id: "google-nest",
              name: "Nest",
              generations: [
                "Hub Max",
                "Learning Thermostat (4th gen)",
                "Thermostat (2020)",
                "Doorbell (3rd gen, wired)",
              ],
            },
            {
              id: "google-nest-x-yale",
              name: "Nest x Yale",
              generations: ["Smart Lock"],
            },
          ],
        },
      ],
    },
    {
      id: "motorola",
      name: "Motorola",
      categories: [
        {
          id: "motorola-phone",
          name: "Phone",
          models: [
            {
              id: "motorola-moto",
              name: "Moto",
              generations: [
                "G 2025",
                "G Stylus",
                "G Power",
                "G Play",
                "G85 5G",
                "G56",
              ],
            },
            { id: "motorola-edge", name: "Edge", generations: ["70 Fusion"] },
          ],
        },
        {
          id: "motorola-tablet",
          name: "Tablet",
          models: [
            {
              id: "motorola-motopad",
              name: "MotoPad",
              generations: ["(2026)"],
            },
          ],
        },
      ],
    },
    {
      id: "oneplus",
      name: "OnePlus",
      categories: [
        {
          id: "oneplus-phone",
          name: "Phone",
          models: [
            { id: "oneplus-oneplus", name: "OnePlus", generations: ["13R"] },
            { id: "oneplus-nord", name: "Nord", generations: ["N-series"] },
          ],
        },
        {
          id: "oneplus-watch",
          name: "Watch",
          models: [{ id: "oneplus-watch", name: "Watch", generations: ["2R"] }],
        },
      ],
    },
    {
      id: "nothing",
      name: "Nothing",
      categories: [
        {
          id: "nothing-phone",
          name: "Phone",
          models: [
            {
              id: "nothing-phone",
              name: "Phone",
              generations: ["(4b)", "(3a)"],
            },
          ],
        },
        {
          id: "nothing-watch",
          name: "Watch",
          models: [
            { id: "nothing-cmf", name: "CMF", generations: ["Watch 3 Pro"] },
          ],
        },
      ],
    },
    {
      id: "tcl",
      name: "TCL",
      categories: [
        {
          id: "tcl-phone",
          name: "Phone",
          models: [
            {
              id: "tcl-tcl",
              name: "TCL",
              generations: ["50 series", "40 series"],
            },
          ],
        },
      ],
    },
    {
      id: "hp",
      name: "HP",
      categories: [
        {
          id: "hp-laptop",
          name: "Laptop",
          models: [
            {
              id: "hp-hp",
              name: "HP",
              generations: ["17 series", "15 series", "14 series"],
            },
          ],
        },
      ],
    },
    {
      id: "dell",
      name: "Dell",
      categories: [
        {
          id: "dell-laptop",
          name: "Laptop",
          models: [{ id: "dell-xps", name: "XPS", generations: [] }],
        },
      ],
    },
    {
      id: "alienware",
      name: "Alienware",
      categories: [
        {
          id: "alienware-laptop",
          name: "Laptop",
          models: [
            {
              id: "alienware-alienware",
              name: "Alienware",
              generations: ["16X Aurora"],
            },
          ],
        },
      ],
    },
    {
      id: "lenovo",
      name: "Lenovo",
      categories: [
        {
          id: "lenovo-tablet",
          name: "Tablet",
          models: [
            { id: "lenovo-tab", name: "Tab", generations: ["Plus"] },
            { id: "lenovo-idea-tab", name: "Idea Tab", generations: [] },
          ],
        },
        {
          id: "lenovo-laptop",
          name: "Laptop",
          models: [
            { id: "lenovo-yoga", name: "Yoga", generations: [] },
            {
              id: "lenovo-ideapad",
              name: "IdeaPad",
              generations: ["Pro series"],
            },
          ],
        },
      ],
    },
    {
      id: "asus",
      name: "Asus",
      categories: [
        {
          id: "asus-laptop",
          name: "Laptop",
          models: [
            { id: "asus-zenbook", name: "Zenbook", generations: ["A14"] },
            { id: "asus-proart", name: "ProArt", generations: ["PZ14"] },
            {
              id: "asus-chromebook-plus",
              name: "Chromebook Plus",
              generations: ["CX34"],
            },
          ],
        },
      ],
    },
    {
      id: "acer",
      name: "Acer",
      categories: [
        {
          id: "acer-laptop",
          name: "Laptop",
          models: [
            {
              id: "acer-swift",
              name: "Swift",
              generations: ["16 AI", "Go 16 AI"],
            },
            { id: "acer-nitro", name: "Nitro", generations: ["V 16 AI"] },
          ],
        },
      ],
    },
    {
      id: "msi",
      name: "MSI",
      categories: [
        {
          id: "msi-laptop",
          name: "Laptop",
          models: [
            { id: "msi-prestige", name: "Prestige", generations: ["16 AI+"] },
          ],
        },
      ],
    },
    {
      id: "lg",
      name: "LG",
      categories: [
        {
          id: "lg-laptop",
          name: "Laptop",
          models: [{ id: "lg-gram", name: "gram", generations: ["Pro 16"] }],
        },
      ],
    },
    {
      id: "framework",
      name: "Framework",
      categories: [
        {
          id: "framework-laptop",
          name: "Laptop",
          models: [
            {
              id: "framework-framework-laptop",
              name: "Framework Laptop",
              generations: ["13"],
            },
          ],
        },
      ],
    },
    {
      id: "gateway",
      name: "Gateway",
      categories: [
        {
          id: "gateway-laptop",
          name: "Laptop",
          models: [
            {
              id: "gateway-gateway",
              name: "Gateway",
              generations: ['16" FHD Windows 11'],
            },
          ],
        },
      ],
    },
    {
      id: "microsoft",
      name: "Microsoft",
      categories: [
        {
          id: "microsoft-tablet",
          name: "Tablet",
          models: [
            {
              id: "microsoft-surface",
              name: "Surface",
              generations: ["Pro 11"],
            },
          ],
        },
        {
          id: "microsoft-laptop",
          name: "Laptop",
          models: [
            {
              id: "microsoft-surface",
              name: "Surface",
              generations: ["Pro (base)"],
            },
          ],
        },
      ],
    },
    {
      id: "amazon",
      name: "Amazon",
      categories: [
        {
          id: "amazon-tablet",
          name: "Tablet",
          models: [
            {
              id: "amazon-fire",
              name: "Fire",
              generations: [
                "Max 11",
                "HD 10 Kids",
                "HD 8 Kids Pro",
                "HD 8",
                "7 Kids",
              ],
            },
          ],
        },
        {
          id: "amazon-smart-home",
          name: "Smart Home",
          models: [
            {
              id: "amazon-echo",
              name: "Echo",
              generations: ["Hub", "Show 8", "(4th gen)", "Dot Max", "Pop"],
            },
            {
              id: "amazon-smart-thermostat",
              name: "Smart Thermostat",
              generations: [],
            },
            { id: "amazon-smart-plug", name: "Smart Plug", generations: [] },
          ],
        },
      ],
    },
    {
      id: "blink",
      name: "Blink",
      categories: [
        {
          id: "blink-smart-home",
          name: "Smart Home",
          models: [
            {
              id: "blink-blink",
              name: "Blink",
              generations: ["Battery Doorbell 2K+", "Mini 2"],
            },
          ],
        },
      ],
    },
    {
      id: "ring",
      name: "Ring",
      categories: [
        {
          id: "ring-smart-home",
          name: "Smart Home",
          models: [
            {
              id: "ring-ring",
              name: "Ring",
              generations: ["Battery Doorbell Pro"],
            },
          ],
        },
      ],
    },
    {
      id: "remarkable",
      name: "reMarkable",
      categories: [
        {
          id: "remarkable-tablet",
          name: "Tablet",
          models: [
            { id: "remarkable-paper-pro", name: "Paper Pro", generations: [] },
          ],
        },
      ],
    },
    {
      id: "garmin",
      name: "Garmin",
      categories: [
        {
          id: "garmin-watch",
          name: "Watch",
          models: [
            { id: "garmin-venu", name: "Venu", generations: ["4"] },
            {
              id: "garmin-forerunner",
              name: "Forerunner",
              generations: ["165"],
            },
            { id: "garmin-vivosmart", name: "vivosmart", generations: ["5"] },
          ],
        },
      ],
    },
    {
      id: "fitbit",
      name: "Fitbit",
      categories: [
        {
          id: "fitbit-watch",
          name: "Watch",
          models: [
            { id: "fitbit-sense", name: "Sense", generations: ["2"] },
            { id: "fitbit-charge", name: "Charge", generations: ["6"] },
            { id: "fitbit-inspire", name: "Inspire", generations: ["3"] },
          ],
        },
      ],
    },
    {
      id: "amazfit",
      name: "Amazfit",
      categories: [
        {
          id: "amazfit-watch",
          name: "Watch",
          models: [
            { id: "amazfit-active", name: "Active", generations: ["2"] },
            { id: "amazfit-bip", name: "Bip", generations: ["6"] },
          ],
        },
      ],
    },
    {
      id: "bose",
      name: "Bose",
      categories: [
        {
          id: "bose-audio",
          name: "Audio",
          models: [
            {
              id: "bose-quietcomfort",
              name: "QuietComfort",
              generations: ["Ultra Earbuds (2nd gen)", "Earbuds (2024)"],
            },
          ],
        },
      ],
    },
    {
      id: "sennheiser",
      name: "Sennheiser",
      categories: [
        {
          id: "sennheiser-audio",
          name: "Audio",
          models: [
            {
              id: "sennheiser-momentum",
              name: "Momentum",
              generations: ["True Wireless 4"],
            },
          ],
        },
      ],
    },
    {
      id: "master-dynamic",
      name: "Master & Dynamic",
      categories: [
        {
          id: "master-dynamic-audio",
          name: "Audio",
          models: [
            { id: "master-dynamic-mw08", name: "MW08", generations: [] },
          ],
        },
      ],
    },
    {
      id: "anker-soundcore",
      name: "Anker Soundcore",
      categories: [
        {
          id: "anker-soundcore-audio",
          name: "Audio",
          models: [
            {
              id: "anker-soundcore-space",
              name: "Space",
              generations: ["A40"],
            },
          ],
        },
      ],
    },
    {
      id: "sony",
      name: "Sony",
      categories: [
        {
          id: "sony-audio",
          name: "Audio",
          models: [{ id: "sony-wf-c710n", name: "WF-C710N", generations: [] }],
        },
      ],
    },
    {
      id: "ecobee",
      name: "ecobee",
      categories: [
        {
          id: "ecobee-smart-home",
          name: "Smart Home",
          models: [
            {
              id: "ecobee-smart-thermostat",
              name: "Smart Thermostat",
              generations: ["Premium", "Enhanced"],
            },
          ],
        },
      ],
    },
    {
      id: "schlage",
      name: "Schlage",
      categories: [
        {
          id: "schlage-smart-home",
          name: "Smart Home",
          models: [{ id: "schlage-encode", name: "Encode", generations: [] }],
        },
      ],
    },
    {
      id: "kwikset",
      name: "Kwikset",
      categories: [
        {
          id: "kwikset-smart-home",
          name: "Smart Home",
          models: [{ id: "kwikset-kevo", name: "Kevo", generations: [] }],
        },
      ],
    },
    {
      id: "august",
      name: "August",
      categories: [
        {
          id: "august-smart-home",
          name: "Smart Home",
          models: [
            {
              id: "august-smart-lock",
              name: "Smart Lock",
              generations: ["Pro"],
            },
          ],
        },
      ],
    },
    {
      id: "dreame",
      name: "Dreame",
      categories: [
        {
          id: "dreame-smart-home",
          name: "Smart Home",
          models: [
            {
              id: "dreame-x60",
              name: "X60",
              generations: ["Max Ultra Complete"],
            },
            { id: "dreame-d10", name: "D10", generations: ["Plus Gen 2"] },
          ],
        },
      ],
    },
    {
      id: "roborock",
      name: "Roborock",
      categories: [
        {
          id: "roborock-smart-home",
          name: "Smart Home",
          models: [
            { id: "roborock-saros", name: "Saros", generations: ["20"] },
            { id: "roborock-qv", name: "QV", generations: ["35S"] },
          ],
        },
      ],
    },
    {
      id: "dyson",
      name: "Dyson",
      categories: [
        {
          id: "dyson-smart-home",
          name: "Smart Home",
          models: [
            {
              id: "dyson-spot-scrub-ai",
              name: "Spot+Scrub Ai",
              generations: [],
            },
          ],
        },
      ],
    },
    {
      id: "shark",
      name: "Shark",
      categories: [
        {
          id: "shark-smart-home",
          name: "Smart Home",
          models: [
            {
              id: "shark-powerdetect",
              name: "PowerDetect",
              generations: ["UV Reveal"],
            },
          ],
        },
      ],
    },
    {
      id: "eero",
      name: "eero",
      categories: [
        {
          id: "eero-smart-home",
          name: "Smart Home",
          models: [{ id: "eero-eero", name: "eero", generations: ["7"] }],
        },
      ],
    },
    {
      id: "philips",
      name: "Philips",
      categories: [
        {
          id: "philips-smart-home",
          name: "Smart Home",
          models: [{ id: "philips-hue", name: "Hue", generations: ["bulbs"] }],
        },
      ],
    },
  ],
  houseCallPricing: {
    residentialFirstHour: 110,
    residentialAdditionalHourRate: 55,
    commercialFirstHour: 175,
    commercialAdditionalHourRate: 87.5,
  },
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
  {
    id: "manrope",
    label: "Manrope",
    css: '"Manrope", sans-serif',
    url: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap",
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    css: '"Space Grotesk", sans-serif',
    url: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
  },
  {
    id: "plus-jakarta",
    label: "Plus Jakarta Sans",
    css: '"Plus Jakarta Sans", sans-serif',
    url: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
  },
  {
    id: "sora",
    label: "Sora",
    css: '"Sora", sans-serif',
    url: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap",
  },
  {
    id: "nunito",
    label: "Nunito",
    css: '"Nunito", sans-serif',
    url: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap",
  },
  {
    id: "raleway",
    label: "Raleway",
    css: '"Raleway", sans-serif',
    url: "https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&display=swap",
  },
  {
    id: "playfair",
    label: "Playfair Display (serif)",
    css: '"Playfair Display", serif',
    url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap",
  },
  {
    id: "lora",
    label: "Lora (serif)",
    css: '"Lora", serif',
    url: "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap",
  },
  {
    id: "fraunces",
    label: "Fraunces (serif)",
    css: '"Fraunces", serif',
    url: "https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&display=swap",
  },
  {
    id: "jetbrains",
    label: "JetBrains Mono (mono)",
    css: '"JetBrains Mono", monospace',
    url: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap",
  },
  { id: "custom", label: "Custom URL", css: "", url: "" },
];

// ─── Apply appearance → HeroUI v3 CSS custom properties ────────────────────
export function applyAppearance(a: Appearance) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const s = root.style;

  // Resolve mode ('system' evaluation vs explicit 'dark' / 'light')
  let scheme = a.colorScheme || "dark";

  if (scheme === ("system" as unknown)) {
    scheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  const isDark = scheme === "dark";

  // Set data-theme on <html> and sync dark/light classes for Hero UI & Tailwind
  root.setAttribute("data-theme", scheme);
  root.classList.toggle("dark", isDark);
  root.classList.toggle("light", !isDark);
  s.setProperty("color-scheme", scheme);

  // Update PWA theme-color
  const themeMetaDark = document.querySelector(
    'meta[name="theme-color"][media*="dark"]',
  );
  const themeMetaLight = document.querySelector(
    'meta[name="theme-color"][media*="light"]',
  );

  if (themeMetaDark)
    themeMetaDark.setAttribute("content", isDark ? "#09150E" : "#ffffff");
  if (themeMetaLight)
    themeMetaLight.setAttribute("content", !isDark ? "#F8FAF4" : "#09150E");

  // If custom accent color override is provided, apply to Hero UI v3 and custom tokens
  const accent = a.accentColor?.trim();
  const accentDeep = a.accentColorDeep?.trim();

  if (accent || accentDeep) {
    const primaryColor = accent || accentDeep || "";
    const primaryDeepColor = accentDeep || accent || "";
    const foregroundColor = pickForeground(primaryColor);

    s.setProperty("--accent", primaryColor);
    s.setProperty("--accent-foreground", foregroundColor);
    s.setProperty("--link", primaryColor);
    s.setProperty("--focus", primaryColor);

    // Hero UI v3 primary color mapping
    s.setProperty("--heroui-primary", primaryColor);
    s.setProperty("--heroui-primary-500", primaryColor);
    s.setProperty("--heroui-primary-600", primaryDeepColor);
    s.setProperty("--heroui-primary-700", primaryDeepColor);
    s.setProperty("--heroui-primary-foreground", foregroundColor);
    s.setProperty("--color-primary", primaryColor);
    s.setProperty("--color-primary-foreground", foregroundColor);

    // Soft/tinted accent (icon chips, badges, hover backgrounds) has no
    // dedicated admin field — derive it from the custom accent so it
    // doesn't sit stuck at the stylesheet's default green next to a
    // customized primary color.
    s.setProperty("--accent-soft", hexToRgba(primaryColor, isDark ? 0.16 : 0.12));
    s.setProperty("--accent-soft-foreground", primaryColor);
  } else {
    s.removeProperty("--accent");
    s.removeProperty("--accent-foreground");
    s.removeProperty("--link");
    s.removeProperty("--focus");

    s.removeProperty("--heroui-primary");
    s.removeProperty("--heroui-primary-500");
    s.removeProperty("--heroui-primary-600");
    s.removeProperty("--heroui-primary-700");
    s.removeProperty("--heroui-primary-foreground");
    s.removeProperty("--color-primary");
    s.removeProperty("--color-primary-foreground");
    s.removeProperty("--accent-soft");
    s.removeProperty("--accent-soft-foreground");
  }

  // Handle custom background overrides cleanly. These are picked by an
  // admin looking at one specific theme, so they only apply in that same
  // theme — otherwise a light-mode background pick permanently overrides
  // dark mode's own palette (inline styles beat the stylesheet's
  // [data-theme="dark"] rules regardless of what data-theme says), leaving
  // dark-mode text rendered on a stuck-light background.
  if (!isDark && a.bgBase && a.bgBase.trim()) {
    s.setProperty("--background", a.bgBase);
    s.setProperty("--heroui-background", a.bgBase);
  } else {
    s.removeProperty("--background");
    s.removeProperty("--heroui-background");
  }

  if (!isDark && a.bgSurface && a.bgSurface.trim()) {
    s.setProperty("--surface", a.bgSurface);
  } else {
    s.removeProperty("--surface");
  }

  if (!isDark && a.bgElevated && a.bgElevated.trim()) {
    s.setProperty("--surface-secondary", a.bgElevated);
  } else {
    s.removeProperty("--surface-secondary");
  }

  const preset = FONT_PRESETS.find((f) => f.id === a.fontFamily);

  if (preset && preset.css) {
    if (preset.url) injectFontLink(preset.id, preset.url);
    s.setProperty("--font-sans", preset.css);
  } else {
    s.removeProperty("--font-sans");
  }

  if (a.fontFamily === "custom" && a.fontUrl) {
    injectFontLink("custom-font", a.fontUrl);
  }

  applyDesign(a);
}

// The color scheme actually shown: this visitor's local override if they've
// ever toggled it, otherwise the admin-configured site-wide default.
export function getEffectiveColorScheme(state: {
  appearance: Appearance;
  viewerColorScheme: ColorScheme | null;
}): ColorScheme {
  return state.viewerColorScheme ?? state.appearance.colorScheme;
}

function pickForeground(hex: string): string {
  const h = hex.replace("#", "");

  if (h.length !== 6) return "#fafafa";
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  return luminance > 0.6 ? "#0a0a0a" : "#fafafa";
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");

  if (h.length !== 6) return hex;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  const sb = isSupabaseConfigured() ? getClient() : null;

  if (sb) {
    const cleanState: SiteContent = {
      brand: state.brand,
      hero: state.hero,
      trustItems: state.trustItems,
      heroPoints: state.heroPoints,
      howItWorks: state.howItWorks,
      repairBanner: state.repairBanner,
      repairServices: state.repairServices,
      about: state.about,
      business: state.business,
      appearance: state.appearance,
      seo: state.seo,
      social: state.social,
      footer: state.footer,
      ctaStrip: state.ctaStrip,
      deviceManufacturers: state.deviceManufacturers,
      houseCallPricing: state.houseCallPricing,
    };

    void sb.auth.getSession().then(({ data }) => {
      if (data.session) {
        void sbUpsertSiteSettings(
          cleanState as unknown as Record<string, unknown>,
        );
      }
    });
  }
};

// ─── Store ──────────────────────────────────────────────────────────────────
interface SiteContentState extends SiteContent {
  // This visitor's own light/dark override, kept ONLY in this browser's
  // localStorage — never sent to Supabase, never touched by the
  // site-content fetch/merge on load. `appearance.colorScheme` is the
  // admin-configured site-wide DEFAULT (synced via Supabase, editable from
  // Site Editor → Appearance); `viewerColorScheme` is this one visitor's
  // personal override of that default, or null to just follow it. Without
  // this split, the public header toggle and the shared site default were
  // the same field, so every fresh page load re-fetched the site default
  // from Supabase and silently stomped whatever the visitor had toggled.
  viewerColorScheme: ColorScheme | null;
  updateBrand: (data: Partial<Brand>) => void;
  updateHero: (data: Partial<Hero>) => void;
  updateRepairBanner: (data: Partial<RepairBanner>) => void;
  updateAbout: (data: Partial<About>) => void;
  updateBusiness: (data: Partial<BusinessInfo>) => void;
  updateAppearance: (data: Partial<Appearance>) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setViewerColorScheme: (scheme: ColorScheme | null) => void;
  updateTrustItem: (index: number, data: Partial<TrustItem>) => void;
  setHomeCopy: (data: { heroPoints?: string[]; howItWorks?: HowStep[] }) => void;
  updateRepairService: (id: string, data: Partial<SiteRepairService>) => void;
  addRepairService: (service: SiteRepairService) => void;
  deleteRepairService: (id: string) => void;
  setRepairServices: (services: SiteRepairService[]) => void;
  setDeviceManufacturers: (manufacturers: DeviceManufacturer[]) => void;
  updateHouseCallPricing: (data: Partial<HouseCallPricing>) => void;
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
      viewerColorScheme: null,

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
        applyAppearance({ ...next, colorScheme: get().viewerColorScheme ?? scheme });
        syncToSupabase(get());
      },
      // Purely local — this browser's personal light/dark override. Never
      // synced to Supabase, so it can never be clobbered by a site-content
      // fetch and never affects other visitors.
      setViewerColorScheme: (scheme) => {
        set({ viewerColorScheme: scheme });
        applyAppearance({
          ...get().appearance,
          colorScheme: scheme ?? get().appearance.colorScheme,
        });
      },
      setHomeCopy: (data) => {
        set(data);
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
      setDeviceManufacturers: (manufacturers) => {
        set({ deviceManufacturers: manufacturers });
        syncToSupabase(get());
      },
      updateHouseCallPricing: (data) => {
        set({ houseCallPricing: { ...get().houseCallPricing, ...data } });
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
    {
      name: "mobicare-site-content",
      version: 3,
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== "object")
          return persistedState as SiteContent;
        const state = { ...(persistedState as Record<string, unknown>) };

        if (state.appearance && typeof state.appearance === "object") {
          const app = { ...(state.appearance as Record<string, unknown>) };

          if (app.accentColor === "#13522B" || app.accentColor === "#0A3318") {
            app.accentColor = "";
          }
          if (
            app.accentColorDeep === "#0A3318" ||
            app.accentColorDeep === "#13522B"
          ) {
            app.accentColorDeep = "";
          }
          state.appearance = app;
        }

        // v2 → v3: deviceTypes (flat 2-level) replaced by deviceManufacturers
        // (Manufacturer → Category → Model → Generation). Old shape doesn't
        // convert cleanly, so drop it and let the new default seed data
        // through instead of leaving orphaned/incompatible data around.
        delete state.deviceTypes;

        return state as unknown as SiteContent;
      },
    },
  ),
);

// Bootstrap initial appearance on module load.
if (typeof document !== "undefined") {
  const bootstrapState = useSiteStore.getState();
  const bootstrapAppearance = { ...bootstrapState.appearance };
  const LEGACY = ["#13522B", "#0A3318", "#13522b", "#0a3318"];

  if (LEGACY.includes(bootstrapAppearance.accentColor))
    bootstrapAppearance.accentColor = "";
  if (LEGACY.includes(bootstrapAppearance.accentColorDeep))
    bootstrapAppearance.accentColorDeep = "";
  applyAppearance({
    ...bootstrapAppearance,
    colorScheme: getEffectiveColorScheme(bootstrapState),
  });
}
