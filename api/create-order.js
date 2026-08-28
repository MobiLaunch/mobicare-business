// Vercel Serverless Function: /api/create-order
// Persists a completed order to Supabase server-side using the service-role key.
// The API never reports a simulated order as successfully persisted.

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
    const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!sbUrl || !sbKey) {
      console.error("Supabase server credentials are not configured.");
      return res.status(503).json({ error: "Orders are temporarily unavailable." });
    }

    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    let userId = null;

    if (accessToken) {
      const whoResponse = await fetch(`${sbUrl.replace(/\/$/, "")}/auth/v1/user`, {
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!whoResponse.ok) {
        return res.status(401).json({ error: "Invalid authentication token." });
      }

      const who = await whoResponse.json().catch(() => null);
      userId = who?.id || null;
    }

    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return res.status(400).json({ error: "Order has no items." });
    }

    const normalizedItems = items.map((item) => {
      const price = Number(item.price);
      const qty = Number(item.qty);

      if (!item.name || !Number.isFinite(price) || price < 0 || !Number.isInteger(qty) || qty < 1) {
        throw new Error(`Invalid line item: ${item.name || "(unnamed)"}`);
      }

      return {
        product_id: item.id ? String(item.id) : null,
        name: String(item.name).slice(0, 300),
        price,
        qty,
      };
    });

    const money = (value) => {
      const number = Number(value);
      return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : 0;
    };

    const subtotal = money(
      normalizedItems.reduce((sum, item) => sum + item.price * item.qty, 0),
    );
    const shippingCost = money(body.shipping);
    const tax = money(body.tax);
    const total = money(subtotal + shippingCost + tax);

    if (total <= 0) {
      return res.status(400).json({ error: "Order total must be positive." });
    }

    // A completed payment should supply the Stripe PaymentIntent ID. Keeping
    // it on the order makes webhook reconciliation possible and prevents the
    // order system from becoming detached from the payment system.
    const paymentIntentId = String(
      body.paymentIntentId || body.payment_intent_id || "",
    ).trim();

    if (!paymentIntentId) {
      return res.status(400).json({ error: "Payment intent is required." });
    }

    const customer = body.customer || {};
    const orderRow = {
      id: String(body.id || "").trim() || undefined,
      status: "paid",
      customer_name: String(customer.name || "").slice(0, 200),
      customer_email: String(customer.email || "").slice(0, 320),
      customer_phone: String(customer.phone || "").slice(0, 40),
      shipping_address: String(customer.address || "").slice(0, 500),
      shipping_city: String(customer.city || "").slice(0, 120),
      shipping_state: String(customer.state || "").slice(0, 120),
      shipping_zip: String(customer.zip || "").slice(0, 20),
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
      Prefer: "return=representation",
    };

    const orderResponse = await fetch(`${sbUrl.replace(/\/$/, "")}/rest/v1/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(orderRow),
    });

    if (!orderResponse.ok) {
      const errData = await orderResponse.json().catch(() => ({}));
      console.error("create-order: orders insert failed:", errData);
      return res.status(orderResponse.status === 409 ? 409 : 500).json({
        error: "Failed to persist order.",
      });
    }

    const createdOrders = await orderResponse.json().catch(() => []);
    const savedOrder = createdOrders[0];

    if (!savedOrder?.id) {
      return res.status(500).json({ error: "Order insert returned no row." });
    }

    const lineItems = normalizedItems.map((item) => ({
      order_id: savedOrder.id,
      ...item,
    }));

    const itemsResponse = await fetch(`${sbUrl.replace(/\/$/, "")}/rest/v1/order_items`, {
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
      total,
    });
  } catch (error) {
    console.error("create-order error:", error);
    return res.status(400).json({
      error: error.message || "Invalid order.",
    });
  }
}
