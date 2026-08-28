import {
  assertClose,
  calculateSubtotal,
  fetchProductsForOrder,
  getShippingCost,
  getSupabaseServerConfig,
  money,
} from "./_order-pricing.js";

// Vercel Serverless Function: /api/create-order
// Persists an already-paid order. Product prices and shipping are calculated
// from server-side data; the browser cannot choose the item price.
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

  try {
    const { url: sbUrl, key: sbKey } = getSupabaseServerConfig();
    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];

    if (!items.length) return res.status(400).json({ error: "Order has no items." });

    const normalizedItems = await fetchProductsForOrder(items);
    const subtotal = calculateSubtotal(normalizedItems);
    const shippingCost = money(getShippingCost(body.shippingMethod || body.shipping_method, subtotal));
    const tax = money(body.tax || 0);
    const total = money(subtotal + shippingCost + tax);

    if (total <= 0) return res.status(400).json({ error: "Order total must be positive." });
    if (body.total != null) assertClose(body.total, total, "Order total");

    const paymentIntentId = String(
      body.paymentIntentId || body.payment_intent_id || "",
    ).trim();
    if (!/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) {
      return res.status(400).json({ error: "A valid payment intent is required." });
    }

    // Verify the PaymentIntent amount before marking the order paid. This
    // protects against changing the cart between payment creation and order
    // creation, and keeps the database total tied to the Stripe charge.
    const secretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY;
    if (!secretKey) {
      console.error("Stripe is not configured on the server.");
      return res.status(503).json({ error: "Payments are temporarily unavailable." });
    }

    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    const paymentIntent = await stripeResponse.json().catch(() => null);

    if (!stripeResponse.ok || !paymentIntent?.id) {
      return res.status(400).json({ error: "Unable to verify payment." });
    }

    if (paymentIntent.status !== "succeeded") {
      return res.status(402).json({ error: "Payment has not completed." });
    }

    if (Number(paymentIntent.amount) !== Math.round(total * 100)) {
      return res.status(409).json({ error: "Payment amount does not match the order." });
    }

    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;
    let userId = null;

    if (accessToken) {
      const whoResponse = await fetch(`${sbUrl}/auth/v1/user`, {
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!whoResponse.ok) return res.status(401).json({ error: "Invalid authentication token." });
      const who = await whoResponse.json().catch(() => null);
      userId = who?.id || null;
    }

    const customer = body.customer || body.shippingAddress || {};
    const orderRow = {
      id: String(body.id || "").trim() || undefined,
      status: "paid",
      customer_name: String(customer.name || "").slice(0, 200),
      customer_email: String(customer.email || "").slice(0, 320),
      customer_phone: String(customer.phone || "").slice(0, 40),
      shipping_address: String(customer.address || customer.line1 || "").slice(0, 500),
      shipping_city: String(customer.city || "").slice(0, 120),
      shipping_state: String(customer.state || "").slice(0, 120),
      shipping_zip: String(customer.zip || customer.postal_code || "").slice(0, 20),
      subtotal,
      shipping_cost: shippingCost,
      tax,
      total,
      ...(userId ? { user_id: userId } : {}),
      payment_intent_id: paymentIntentId,
    };

    const headers = {
      apikey: sbKey,
      Authorization: `Bearer ${sbKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation,resolution=ignore-duplicates",
    };

    const orderResponse = await fetch(`${sbUrl}/rest/v1/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(orderRow),
    });

    if (!orderResponse.ok) {
      const errData = await orderResponse.json().catch(() => ({}));
      console.error("create-order: orders insert failed:", errData);
      return res.status(500).json({ error: "Failed to persist order." });
    }

    const createdOrders = await orderResponse.json().catch(() => []);
    const savedOrder = createdOrders[0];

    if (!savedOrder?.id) {
      // A duplicate PaymentIntent/order is safe to treat as already persisted;
      // return a stable conflict instead of creating a second order.
      return res.status(409).json({ error: "Order has already been recorded." });
    }

    const lineItems = normalizedItems.map((item) => ({
      order_id: savedOrder.id,
      ...item,
    }));

    const itemsResponse = await fetch(`${sbUrl}/rest/v1/order_items`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify(lineItems),
    });

    if (!itemsResponse.ok) {
      const itemsErr = await itemsResponse.json().catch(() => ({}));
      console.error("create-order: order_items insert failed:", itemsErr);
      return res.status(500).json({ error: "Failed to persist order items." });
    }

    return res.status(201).json({
      ok: true,
      orderId: savedOrder.id,
      userId,
      subtotal,
      shipping: shippingCost,
      tax,
      total,
    });
  } catch (error) {
    console.error("create-order error:", error);
    return res.status(400).json({ error: error.message || "Invalid order." });
  }
}
