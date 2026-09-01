import {
  assertClose,
  calculateSubtotal,
  calculateTax,
  fetchProductsForOrder,
  getShippingCost,
  money,
} from "./_order-pricing.js";

// Vercel Serverless Function: /api/create-payment-intent
// The browser supplies product IDs/quantities and a shipping method. Prices,
// shipping, tax, and the final amount are calculated server-side.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Idempotency-Key",
  );

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY;
  if (!secretKey) {
    console.error("Stripe is not configured on the server.");
    return res.status(503).json({ error: "Payments are temporarily unavailable." });
  }

  try {
    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return res.status(400).json({ error: "Order has no items." });

    const idempotencyKey = req.headers["idempotency-key"] || body.idempotencyKey;
    if (!idempotencyKey || String(idempotencyKey).trim().length < 16) {
      return res.status(400).json({ error: "A valid idempotency key is required." });
    }

    const normalizedItems = await fetchProductsForOrder(items);
    const subtotal = calculateSubtotal(normalizedItems);
    const shippingCost = money(
      getShippingCost(body.shippingMethod || body.shipping_method, subtotal),
    );
    const tax = calculateTax(subtotal + shippingCost);
    const total = money(subtotal + shippingCost + tax);

    if (total <= 0) return res.status(400).json({ error: "Order total must be positive." });
    if (body.total != null) assertClose(body.total, total, "Order total");

    // Mobicare currently settles all commerce transactions in USD. Do not let
    // the browser select another currency while the order/webhook layer assumes USD.
    const currency = String(body.currency || "usd").toLowerCase();
    if (currency !== "usd") {
      return res.status(400).json({ error: "Only USD payments are supported." });
    }

    const params = new URLSearchParams({
      amount: String(Math.round(total * 100)),
      currency: "usd",
      "automatic_payment_methods[enabled]": "true",
      description: `Mobicare Order: ${normalizedItems.length} item(s)`,
    });

    const shipping = body.shippingAddress || body.shipping_address || body.customer;
    if (shipping && typeof shipping === "object") {
      if (shipping.email) params.set("receipt_email", String(shipping.email).slice(0, 320));
      if (shipping.name) params.set("shipping[name]", String(shipping.name).slice(0, 200));
      if (shipping.address) params.set("shipping[address][line1]", String(shipping.address).slice(0, 200));
      if (shipping.city) params.set("shipping[address][city]", String(shipping.city).slice(0, 100));
      if (shipping.state) params.set("shipping[address][state]", String(shipping.state).slice(0, 100));
      if (shipping.zip) params.set("shipping[address][postal_code]", String(shipping.zip).slice(0, 20));
      params.set("shipping[address][country]", "US");
    }

    const headers = {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": String(idempotencyKey).slice(0, 255),
    };

    const stripeResponse = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers,
      body: params.toString(),
    });
    const stripeData = await stripeResponse.json().catch(() => null);

    if (!stripeResponse.ok) {
      console.error(
        "Stripe API error:",
        stripeData?.error?.type || stripeResponse.status,
        "-",
        stripeData?.error?.message || "(no message)",
        stripeData?.error?.param ? `[param: ${stripeData.error.param}]` : "",
      );
      return res.status(502).json({ error: "Unable to create payment." });
    }

    return res.status(200).json({
      clientSecret: stripeData.client_secret,
      id: stripeData.id,
      status: stripeData.status,
      amount: stripeData.amount,
      subtotal,
      shipping: shippingCost,
      tax,
      total,
    });
  } catch (error) {
    console.error("Payment intent creation error:", error);
    return res.status(400).json({ error: error.message || "Unable to create payment." });
  }
}
