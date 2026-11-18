import { timingSafeEqual } from "node:crypto";
import { applyCors } from "./_order-pricing.js";

function secretsMatch(expected, provided) {
  if (typeof expected !== "string" || typeof provided !== "string" || !expected || !provided) {
    return false;
  }
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

// Vercel Serverless Function: /api/cancel-payment-intent
// Cancels an incomplete PaymentIntent when a customer abandons checkout.
// Requires the matching clientSecret so callers can only cancel their own session.
export default async function handler(req, res) {
  applyCors(req, res, "POST,OPTIONS", "Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY;
  if (!secretKey) return res.status(503).json({ error: "Payments are temporarily unavailable." });

  try {
    const paymentIntentId = String(req.body?.paymentIntentId || "").trim();
    const clientSecret = String(req.body?.clientSecret || "").trim();

    if (!/^pi_[A-Za-z0-9_]+$/.test(paymentIntentId)) {
      return res.status(400).json({ error: "A valid payment intent is required." });
    }
    if (!/^pi_[A-Za-z0-9_]+_secret_[A-Za-z0-9]+$/.test(clientSecret)) {
      return res.status(400).json({ error: "A valid client secret is required." });
    }

    const getResponse = await fetch(
      `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}`,
      {
        headers: { Authorization: `Bearer ${secretKey}` },
      },
    );
    const pi = await getResponse.json().catch(() => null);

    if (!getResponse.ok || !pi?.id) {
      return res.status(404).json({ error: "Payment session not found." });
    }

    if (!secretsMatch(pi.client_secret, clientSecret)) {
      return res.status(403).json({ error: "Forbidden." });
    }

    if (pi.status === "canceled") {
      return res.status(200).json({ ok: true, status: "canceled" });
    }
    if (pi.status === "succeeded") {
      return res.status(409).json({ error: "Completed payments cannot be cancelled." });
    }

    const response = await fetch(
      `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}/cancel`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${secretKey}` },
      },
    );
    const data = await response.json().catch(() => null);

    // Cancellation is intentionally idempotent from checkout's perspective.
    if (!response.ok && data?.error?.code !== "payment_intent_unexpected_state") {
      console.error("Stripe cancellation error:", data?.error?.type || response.status);
      return res.status(502).json({ error: "Unable to cancel payment session." });
    }

    return res.status(200).json({ ok: true, status: data?.status || "canceled" });
  } catch (error) {
    console.error("Payment intent cancellation error:", error);
    return res.status(500).json({ error: "Unable to cancel payment session." });
  }
}
