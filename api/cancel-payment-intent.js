import { timingSafeEqual } from "node:crypto";
import { applyCors } from "./_order-pricing.js";

const CANCELABLE_STATUSES = new Set([
  "requires_payment_method",
  "requires_capture",
  "requires_confirmation",
  "requires_action",
  "processing",
]);

function secretsEqual(expected, provided) {
  if (typeof expected !== "string" || typeof provided !== "string") return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Vercel Serverless Function: /api/cancel-payment-intent
// Cancels an incomplete PaymentIntent when a customer abandons checkout,
// authenticated by verifying the PaymentIntent's client_secret.
export default async function handler(req, res) {
  applyCors(req, res, {
    methods: "POST,OPTIONS",
    headers: "Authorization, Content-Type",
  });

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY;
  if (!secretKey) {
    return res.status(503).json({ error: "Payments are temporarily unavailable." });
  }

  try {
    const paymentIntentId = String(
      req.body?.paymentIntentId || req.body?.payment_intent_id || "",
    ).trim();
    const clientSecret = String(
      req.body?.clientSecret || req.body?.client_secret || "",
    ).trim();

    if (!/^pi_[A-Za-z0-9_]+$/.test(paymentIntentId)) {
      return res.status(400).json({ error: "A valid payment intent is required." });
    }
    if (!clientSecret || !clientSecret.startsWith(`${paymentIntentId}_secret_`)) {
      return res.status(400).json({ error: "A matching clientSecret is required." });
    }

    const retrieveResponse = await fetch(
      `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}`,
      {
        headers: { Authorization: `Bearer ${secretKey}` },
      },
    );
    const pi = await retrieveResponse.json().catch(() => null);

    if (!retrieveResponse.ok || !pi?.id) {
      return res.status(404).json({ error: "Payment session not found." });
    }

    if (!secretsEqual(pi.client_secret, clientSecret)) {
      return res.status(403).json({ error: "Invalid payment session credentials." });
    }

    if (pi.status === "canceled") {
      return res.status(200).json({ ok: true, status: "canceled", alreadyCanceled: true });
    }

    if (!CANCELABLE_STATUSES.has(pi.status)) {
      return res.status(409).json({
        error: `Payment session cannot be canceled in state "${pi.status}".`,
        status: pi.status,
      });
    }

    const cancelResponse = await fetch(
      `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}/cancel`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${secretKey}` },
      },
    );
    const cancelData = await cancelResponse.json().catch(() => null);

    if (
      !cancelResponse.ok &&
      cancelData?.error?.code !== "payment_intent_unexpected_state"
    ) {
      console.error(
        "Stripe cancellation error:",
        cancelData?.error?.type || cancelResponse.status,
      );
      return res.status(502).json({ error: "Unable to cancel payment session." });
    }

    return res.status(200).json({
      ok: true,
      status: cancelData?.status || "canceled",
    });
  } catch (error) {
    console.error("Payment intent cancellation error:", error);
    return res.status(500).json({ error: "Unable to cancel payment session." });
  }
}
