// Vercel Serverless Function: /api/refund-payment-intent
// Issues a real Stripe refund for a paid order. Admin-only. Does NOT write
// the order's status itself — the existing stripe-webhook handler is the
// single source of truth for status transitions (its "charge.refunded"
// case flips the row once Stripe confirms), so this endpoint only ever
// triggers the refund and lets that event land as it normally would.
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

  const sbUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!sbUrl || !serviceKey || !anonKey) {
    console.error("Supabase server credentials are not configured.");
    return res.status(503).json({ error: "Refunds are temporarily unavailable." });
  }

  try {
    // Only a signed-in staff user (per the is_admin() allowlist) may issue a
    // refund. Verify the caller's own token against that RPC rather than
    // trusting anything the client claims about itself.
    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!accessToken) return res.status(401).json({ error: "Authentication required." });

    const adminCheck = await fetch(`${sbUrl}/rest/v1/rpc/is_admin`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    const isAdmin = adminCheck.ok ? await adminCheck.json().catch(() => false) : false;
    if (!isAdmin) return res.status(403).json({ error: "Admin access required." });

    const orderId = String(req.body?.orderId || "").trim();
    if (!orderId) return res.status(400).json({ error: "An order id is required." });

    const orderResponse = await fetch(
      `${sbUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,status,payment_intent_id&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!orderResponse.ok) return res.status(502).json({ error: "Unable to look up order." });

    const orders = await orderResponse.json().catch(() => []);
    const order = orders[0];
    if (!order) return res.status(404).json({ error: "Order not found." });

    if (order.status === "refunded") {
      return res.status(200).json({ ok: true, alreadyRefunded: true });
    }

    const paymentIntentId = String(order.payment_intent_id || "");
    if (!/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) {
      return res.status(409).json({ error: "This order has no payment to refund." });
    }

    const params = new URLSearchParams({ payment_intent: paymentIntentId });
    const stripeResponse = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        // Stable per order so a retry (double click, network blip) can never
        // create two refunds for the same order.
        "Idempotency-Key": `refund_${orderId}`,
      },
      body: params.toString(),
    });
    const stripeData = await stripeResponse.json().catch(() => null);

    if (!stripeResponse.ok) {
      console.error("Stripe refund error:", stripeData?.error?.type || stripeResponse.status);
      return res.status(502).json({ error: stripeData?.error?.message || "Unable to issue refund." });
    }

    return res.status(200).json({
      ok: true,
      refundId: stripeData.id,
      status: stripeData.status,
    });
  } catch (error) {
    console.error("Refund error:", error);
    return res.status(500).json({ error: "Unable to issue refund." });
  }
}
