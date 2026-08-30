// Vercel Serverless Function: /api/cancel-payment-intent
// Cancels an incomplete PaymentIntent when a customer abandons checkout.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY;
  if (!secretKey) return res.status(503).json({ error: "Payments are temporarily unavailable." });

  try {
    const paymentIntentId = String(req.body?.paymentIntentId || "").trim();
    if (!/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) {
      return res.status(400).json({ error: "A valid payment intent is required." });
    }

    const response = await fetch(
      `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}/cancel`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${secretKey}` },
      },
    );
    const data = await response.json().catch(() => null);

    // Cancellation is intentionally idempotent from the checkout's perspective.
    // If Stripe reports that the intent is already canceled, treat it as success.
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
