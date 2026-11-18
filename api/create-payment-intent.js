import {
  applyCors,
  assertClose,
  calculateSubtotal,
  calculateTax,
  fetchProductsForOrder,
  getShippingCost,
  getSupabaseServerConfig,
  money,
  normalizeShippingMethod,
  resolveBearerUserId,
  serializeCompactCartItems,
} from "./_order-pricing.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Vercel Serverless Function: /api/create-payment-intent
// The browser supplies product IDs/quantities and a shipping method. Prices,
// shipping, tax, and the final amount are calculated server-side.
export default async function handler(req, res) {
  applyCors(req, res, {
    methods: "POST,OPTIONS",
    headers: "Authorization, Content-Type, Idempotency-Key",
  });

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
    const sbConfig = getSupabaseServerConfig();
    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return res.status(400).json({ error: "Order has no items." });

    const idempotencyKey = req.headers["idempotency-key"] || body.idempotencyKey;
    if (!idempotencyKey || String(idempotencyKey).trim().length < 16) {
      return res.status(400).json({ error: "A valid idempotency key is required." });
    }

    const shippingMethod = normalizeShippingMethod(
      body.shippingMethod || body.shipping_method,
    );
    const normalizedItems = await fetchProductsForOrder(items, { enforceStock: true });
    const subtotal = calculateSubtotal(normalizedItems);
    const shippingCost = money(getShippingCost(shippingMethod, subtotal));
    const tax = calculateTax(subtotal + shippingCost);
    const total = money(subtotal + shippingCost + tax);

    if (total <= 0) return res.status(400).json({ error: "Order total must be positive." });
    if (total < 0.5) {
      return res.status(400).json({
        error: `Order total must be at least $0.50 to check out (currently $${total.toFixed(2)}). Please add another item.`,
      });
    }
    if (body.total != null) assertClose(body.total, total, "Order total");

    const currency = String(body.currency || "usd").toLowerCase();
    if (currency !== "usd") {
      return res.status(400).json({ error: "Only USD payments are supported." });
    }

    const shipping =
      body.shipping ||
      body.shippingAddress ||
      body.shipping_address ||
      body.customer ||
      {};

    const customerName = String(shipping?.name || "").trim().slice(0, 200);
    const customerEmail = String(shipping?.email || "").trim().slice(0, 320);
    const customerPhone = String(shipping?.phone || "").trim().slice(0, 40);
    const streetAddress = String(shipping?.address || shipping?.line1 || "")
      .trim()
      .slice(0, 200);
    const city = String(shipping?.city || "").trim().slice(0, 100);
    const state = String(shipping?.state || "").trim().slice(0, 100);
    const zip = String(shipping?.zip || shipping?.postal_code || "")
      .trim()
      .slice(0, 20);

    const { userId } = await resolveBearerUserId(req, sbConfig, { strict: false });

    const params = new URLSearchParams({
      amount: String(Math.round(total * 100)),
      currency: "usd",
      "automatic_payment_methods[enabled]": "true",
      description: `Mobicare Order: ${normalizedItems.length} item(s)`,
      "metadata[shipping_method]": shippingMethod,
      "metadata[customer_name]": customerName,
      "metadata[customer_email]": customerEmail,
      "metadata[customer_phone]": customerPhone,
      "metadata[shipping_address]": shippingMethod === "pickup" ? "" : streetAddress,
      "metadata[shipping_city]": shippingMethod === "pickup" ? "" : city,
      "metadata[shipping_state]": shippingMethod === "pickup" ? "" : state,
      "metadata[shipping_zip]": shippingMethod === "pickup" ? "" : zip,
      "metadata[cart_items]": serializeCompactCartItems(normalizedItems),
    });

    if (userId) {
      params.set("metadata[user_id]", userId);
    }

    if (customerEmail && EMAIL_RE.test(customerEmail)) {
      params.set("receipt_email", customerEmail);
    }

    if (shippingMethod !== "pickup" && streetAddress) {
      params.set("shipping[name]", customerName || "Customer");
      if (customerPhone) params.set("shipping[phone]", customerPhone);
      params.set("shipping[address][line1]", streetAddress);
      if (city) params.set("shipping[address][city]", city);
      if (state) params.set("shipping[address][state]", state);
      if (zip) params.set("shipping[address][postal_code]", zip);
      params.set("shipping[address][country]", "US");
    }

    const stripeResponse = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": String(idempotencyKey).slice(0, 255),
      },
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
      shippingMethod,
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
