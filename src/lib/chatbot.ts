import { BUSINESS } from "@/lib/config";
import type { SiteRepairService, BusinessHour } from "@/lib/siteStore";

/**
 * The chat widget's "brain". This is a scripted, keyword-matched assistant —
 * not a live agent and not an LLM — grounded in the same repair/price/hours
 * data the rest of the site renders (so editing those in the admin updates
 * the answers too). Anything it can't answer routes to a real person by
 * call or text, which is stated up front in the UI.
 */

export type ChatAction =
  | { kind: "book"; label: string }
  | { kind: "link"; label: string; to: string }
  | { kind: "tel"; label: string }
  | { kind: "sms"; label: string }
  | { kind: "message"; label: string };

export interface BotReply {
  text: string;
  action?: ChatAction;
}

export interface BotContext {
  repairServices: SiteRepairService[];
  hours: BusinessHour[];
  phone: string;
  city: string;
}

export const QUICK_REPLIES = ["Fix my screen", "How much?", "Hours & location", "Book a repair"];

const has = (text: string, ...needles: string[]) => needles.some((n) => text.includes(n));

function findService(text: string, services: SiteRepairService[]) {
  const aliases: Record<string, string[]> = {
    "screen-repair": ["screen", "crack", "shatter", "display", "glass"],
    "battery-replacement": ["battery", "charge hold", "dies fast", "drain"],
    "water-damage": ["water", "wet", "liquid", "drop in", "toilet", "pool"],
    "charging-port": ["charging port", "won't charge", "wont charge", "not charging", "charger port", "port"],
    "camera-repair": ["camera", "lens", "blurry"],
  };

  return (
    services.find((s) => (aliases[s.id] ?? []).some((a) => text.includes(a))) ||
    services.find((s) => text.includes(s.name.toLowerCase()))
  );
}

function hoursText(hours: BusinessHour[]) {
  return hours.map((h) => `${h.days}: ${h.hours}`).join("\n");
}

export function getReply(input: string, ctx: BotContext): BotReply[] {
  const text = input.toLowerCase().trim();
  const service = findService(text, ctx.repairServices);

  if (!text) return [];

  if (has(text, "book", "appointment", "schedule", "reserve", "come in", "stop by")) {
    return [
      { text: "Love it! Booking takes about a minute — you pick the repair, your device and a time. Walk-ins are welcome too." },
      { text: "Ready when you are 👇", action: { kind: "book", label: "Book a Repair" } },
    ];
  }

  if (has(text, "refund", "money back", "return", "exchange", "defective", "doesn't work", "doesnt work", "broken item")) {
    return [
      { text: "All sales are final and we don't offer refunds or accept returns for buyer's remorse. If an item is defective, we'll exchange it as long as it's in like-new condition with its original packaging and all included accessories." },
      { text: "Full details:", action: { kind: "link", label: "Returns & Exchanges", to: "/returns" } },
    ];
  }

  if (service) {
    return [
      {
        text: `${service.name}: ${service.priceRange}, usually ${service.duration}.\n\n${service.description}`,
      },
      { text: "Every part has a 90-day warranty, and we quote before we start. Want to grab a time?", action: { kind: "book", label: "Book This Repair" } },
    ];
  }

  if (has(text, "how much", "price", "cost", "quote", "estimate", "cheap", "afford")) {
    const lines = ctx.repairServices.slice(0, 5).map((s) => `• ${s.name}: ${s.priceRange}`);

    return [
      { text: `Here's a quick price guide:\n${lines.join("\n")}\n\nThere's a flat $35 bench fee to diagnose anything.` },
      { text: "Tell me what's wrong and I can be more specific.", action: { kind: "book", label: "Get It Fixed" } },
    ];
  }

  if (has(text, "hour", "open", "close", "when", "today", "sunday", "saturday")) {
    return [
      { text: `Here are our hours:\n${hoursText(ctx.hours)}` },
      { text: "Walk-ins always welcome — booking just guarantees your parts are ready.", action: { kind: "book", label: "Book Ahead" } },
    ];
  }

  if (has(text, "where", "address", "location", "directions", "find you", "fairfield")) {
    return [
      { text: `We're at 920 Commerce Drive, Suite 3 — ${ctx.city || "Fairfield, IL 62837"}. Easy parking right out front.` },
      { text: "Open the map for turn-by-turn.", action: { kind: "link", label: "View Map", to: "https://www.google.com/maps/search/?api=1&query=Mobicare+Fairfield+IL" } },
    ];
  }

  if (has(text, "ship", "deliver", "tracking", "arrive", "pickup", "pick up", "free shipping")) {
    return [
      { text: "Standard shipping is free on orders $35+ (3–5 business days). Priority Express is $12.99 (1–2 days), and local pickup in Fairfield is free. Orders placed before 2 PM Mon–Sat ship the same day." },
      { text: "Shipping details:", action: { kind: "link", label: "Shipping Policy", to: "/shipping" } },
    ];
  }

  if (has(text, "privacy", "my data", "personal info")) {
    return [
      { text: "We only collect what we need for repairs, orders and your account, and we don't sell your information." },
      { text: "Read the full policy:", action: { kind: "link", label: "Privacy Policy", to: "/privacy" } },
    ];
  }

  if (has(text, "warranty", "guarantee")) {
    return [{ text: "Every part we install carries a 90-day warranty. If it fails in that window, we replace it free. 👍" }];
  }

  if (has(text, "insurance", "protect", "akko", "plan", "cover")) {
    return [
      { text: "We partner with AKKO for device protection — plans start at $5/mo and cover accidents like drops and spills." },
      { text: "Compare the plans here:", action: { kind: "link", label: "See Protection Plans", to: "/protection" } },
    ];
  }

  if (has(text, "case", "charger", "cable", "accessor", "protector", "shop", "buy")) {
    return [
      { text: "We stock cases, chargers, cables and screen protectors — all the stuff you need after the repair." },
      { text: "Browse the shop:", action: { kind: "link", label: "Shop Accessories", to: "/shop" } },
    ];
  }

  if (has(text, "human", "person", "someone", "call", "phone", "talk", "speak", "text you", "number")) {
    return [
      { text: `Of course! A real person answers at ${ctx.phone || BUSINESS.phone}. Call or text — whichever you like.`, action: { kind: "tel", label: `Call ${ctx.phone || BUSINESS.phone}` } },
      { text: "Or send us a text:", action: { kind: "sms", label: "Text the Shop" } },
    ];
  }

  if (has(text, "diagnos", "bench")) {
    return [{ text: "Our flat $35 bench fee covers a full diagnostic on any device, and you get a no-obligation quote before we do any work." }];
  }

  if (has(text, "thank", "thx", "awesome", "great", "perfect")) {
    return [{ text: "Anytime! 🙌 Let me know if you need anything else." }];
  }

  if (has(text, "hi", "hello", "hey", "yo", "sup") && text.length < 14) {
    return [{ text: "Hey there! 👋 What's going on with your device?" }];
  }

  return [
    { text: "Hmm, I'm a simple bot and didn't catch that one. I can help with prices, hours, location and booking — or a real human can help. Send the shop a message and a person will reply." },
    { text: "Want to reach the shop?", action: { kind: "message", label: "Message the shop" } },
  ];
}
