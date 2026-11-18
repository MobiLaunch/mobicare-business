import {
  applyCors,
  assertClose,
  calculateSubtotal,
  calculateTax,
  fetchProductsForOrder,
  getShippingCost,
  money,
  resolveUserIdFromAuth,
} from "./_order-pricing.js";

const SHOP_PICKUP_ADDRESS = "920 Commerce Drive, Suite 3";
const SHOP_PICKUP_CITY = "Fairfield";
const SHOP_PICKUP_STATE = "IL";
const SHOP_PICKUP_ZIP = "62837";

// Vercel Serverless Function: /api/create-payment-intent
// The browser supplies product IDs/quantities and a shipping method. Prices,
// shipping, tax, and the final amount are calculated server-side.
export default async function handler(req, res) {
  applyCors(req, res);

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

    const shippingMethod = String(body.shippingMethod || body.shipping_method || "standard").trim();
    const normalizedItems = await fetchProductsForOrder(items);
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

    // Best-effort user linkage for self-healing webhook recovery
    const { userId } = await resolveUserIdFromAuth(req);

    const params = new URLSearchParams({
      amount: String(Math.round(total * 100)),
      currency: "usd",
      "automatic_payment_methods[enabled]": "true",
      description: `Mobicare Order: ${normalizedItems.length} item(s)`,
    });

    const customer =
      body.shipping ||
      body.shippingAddress ||
      body.shipping_address ||
      body.customer ||
      {};

    if (customer && typeof customer === "object") {
      const email = String(customer.email || "").trim();
      const name = String(customer.name || "").trim();
      const phone = String(customer.phone || "").trim();
      const address = String(customer.address || customer.line1 || "").trim();
      const city = String(customer.city || "").trim();
      const state = String(customer.state || "").trim();
      const zip = String(customer.zip || customer.postal_code || "").trim();

      if (email) params.set("receipt_email", email.slice(0, 320));

      // Only send a physical carrier shipping block to Stripe when shipping to the customer
      if (shippingMethod !== "pickup" && address) {
        if (name) params.set("shipping[name]", name.slice(0, 200));
        if (phone) params.set("shipping[phone]", phone.slice(0, 40));
        params.set("shipping[address][line1]", address.slice(0, 200));
        if (city) params.set("shipping[address][city]", city.slice(0, 100));
        if (state) params.set("shipping[address][state]", state.slice(0, 100));
        if (zip) params.set("shipping[address][postal_code]", zip.slice(0, 20));
        params.set("shipping[address][country]", "US");
      }

      // Attach compact metadata so stripe-webhook.js can self-heal orders if the browser
      // closes immediately after confirmCardPayment before /api/create-order completes.
      params.set("metadata[shipping_method]", shippingMethod);
      if (userId) params.set("metadata[user_id]", userId);
      if (name) params.set("metadata[customer_name]", name.slice(0, 200));
      if (email) params.set("metadata[customer_email]", email.slice(0, 320));
      if (phone) params.set("metadata[customer_phone]", phone.slice(0, 40));
      params.set(
        "metadata[shipping_address]",
        (shippingMethod === "pickup" ? `Fairfield Store Pickup — ${SHOP_PICKUP_ADDRESS}` : address).slice(0, 300),
      );
      params.set("metadata[shipping_city]", (shippingMethod === "pickup" ? SHOP_PICKUP_CITY : city).slice(0, 100));
      params.set("metadata[shipping_state]", (shippingMethod === "pickup" ? SHOP_PICKUP_STATE : state).slice(0, 100));
      params.set("metadata[shipping_zip]", (shippingMethod === "pickup" ? SHOP_PICKUP_ZIP : zip).slice(0, 20));
      params.set("metadata[subtotal]", subtotal.toFixed(2));
      params.set("metadata[shipping_cost]", shippingCost.toFixed(2));
      params.set("metadata[tax]", tax.toFixed(2));

      const compactCart = JSON.stringify(
        normalizedItems.map((i) => ({ id: i.product_id, q: i.qty })),
      );
      if (compactCart.length <= 500) {
        params.set("metadata[cart_items]", compactCart);
      }
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
