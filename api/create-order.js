import {
  applyCors,
  assertClose,
  calculateSubtotal,
  calculateTax,
  decrementOrderStock,
  fetchProductsForOrder,
  generateOrderId,
  getShippingCost,
  getSupabaseServerConfig,
  money,
  normalizeShippingMethod,
  resolveBearerUserId,
} from "./_order-pricing.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_ORDER_ID_RE = /^[A-Za-z0-9_-]{4,64}$/;

async function fetchExistingOrderByPaymentIntent(sbConfig, paymentIntentId) {
  const { url, key } = sbConfig;
  const response = await fetch(
    `${url}/rest/v1/orders?select=id,status,subtotal,shipping_cost,tax,total,shipping_method,user_id&payment_intent_id=eq.${encodeURIComponent(paymentIntentId)}&limit=1`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    },
  );
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []);
  return rows[0] || null;
}

async function orderHasLineItems(sbConfig, orderId) {
  const { url, key } = sbConfig;
  const response = await fetch(
    `${url}/rest/v1/order_items?select=id&order_id=eq.${encodeURIComponent(orderId)}&limit=1`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    },
  );
  if (!response.ok) return false;
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0;
}

async function insertOrderLineItems(sbConfig, orderId, normalizedItems) {
  const { url, key } = sbConfig;
  const lineItems = normalizedItems.map((item) => ({
    order_id: orderId,
    product_id: item.product_id,
    name: item.name,
    price: item.price,
    qty: item.qty,
  }));

  const response = await fetch(
    `${url}/rest/v1/order_items?on_conflict=order_id,product_id`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(lineItems),
    },
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error("create-order: order_items insert failed:", errData);
    throw new Error("Failed to persist order items.");
  }
}

async function refundCapturedPaymentOnStockFailure(secretKey, paymentIntentId) {
  try {
    const response = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `auto_refund_oos_${paymentIntentId}`,
      },
      body: new URLSearchParams({
        payment_intent: paymentIntentId,
        reason: "requested_by_customer",
      }).toString(),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("Auto-refund on stock exhaustion failed:", data);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Auto-refund exception:", err);
    return false;
  }
}

async function deleteUnfulfilledOrderRow(sbConfig, orderId) {
  const { url, key } = sbConfig;
  await fetch(`${url}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
    method: "DELETE",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  }).catch(() => null);
}

// Vercel Serverless Function: /api/create-order
// Persists an already-paid order, atomically decrements product stock, and
// automatically refunds the customer if stock ran out during payment capture.
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

  try {
    const sbConfig = getSupabaseServerConfig();
    const { url: sbUrl, key: sbKey } = sbConfig;
    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];

    if (!items.length) return res.status(400).json({ error: "Order has no items." });

    const paymentIntentId = String(
      body.paymentIntentId || body.payment_intent_id || "",
    ).trim();
    if (!/^pi_[A-Za-z0-9_]+$/.test(paymentIntentId)) {
      return res.status(400).json({ error: "A valid payment intent is required." });
    }

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

    if (paymentIntent.currency && String(paymentIntent.currency).toLowerCase() !== "usd") {
      return res.status(409).json({ error: "Unsupported payment currency." });
    }

    const { userId: bearerUserId, invalidToken } = await resolveBearerUserId(
      req,
      sbConfig,
      { strict: true },
    );
    if (invalidToken) {
      return res.status(401).json({ error: "Invalid authentication token." });
    }

    const metaUserId = String(paymentIntent.metadata?.user_id || "").trim();
    const userId = bearerUserId || (UUID_RE.test(metaUserId) ? metaUserId : null);

    const shippingMethod = normalizeShippingMethod(
      body.shippingMethod ||
        body.shipping_method ||
        paymentIntent.metadata?.shipping_method ||
        "standard",
    );

    const normalizedItems = await fetchProductsForOrder(items, {
      enforceStock: false,
      allowInactive: true,
    });
    const subtotal = calculateSubtotal(normalizedItems);
    const shippingCost = money(getShippingCost(shippingMethod, subtotal));
    const tax = calculateTax(subtotal + shippingCost);
    const total = money(subtotal + shippingCost + tax);

    if (total <= 0) return res.status(400).json({ error: "Order total must be positive." });
    if (body.total != null) assertClose(body.total, total, "Order total");

    const capturedCents = Number(paymentIntent.amount_received ?? paymentIntent.amount);
    if (capturedCents !== Math.round(total * 100)) {
      return res.status(409).json({ error: "Payment amount does not match the order." });
    }

    // Idempotency check: verify BOTH the order row AND its order_items exist
    const existingOrder = await fetchExistingOrderByPaymentIntent(sbConfig, paymentIntentId);
    if (existingOrder?.id) {
      const hasItems = await orderHasLineItems(sbConfig, existingOrder.id);
      if (!hasItems) {
        const stockResult = await decrementOrderStock(sbConfig, normalizedItems);
        if (!stockResult.ok) {
          await deleteUnfulfilledOrderRow(sbConfig, existingOrder.id);
          await refundCapturedPaymentOnStockFailure(secretKey, paymentIntentId);
          return res.status(409).json({
            error: `Sorry, "${stockResult.failedItem?.name || "an item"}" just sold out while your payment was processing. Your payment has been automatically refunded in full.`,
            refunded: true,
          });
        }
        await insertOrderLineItems(sbConfig, existingOrder.id, normalizedItems);
      }

      return res.status(200).json({
        ok: true,
        orderId: existingOrder.id,
        alreadyExists: true,
        userId: existingOrder.user_id || userId,
        shippingMethod: existingOrder.shipping_method || shippingMethod,
        subtotal: Number(existingOrder.subtotal ?? subtotal),
        shipping: Number(existingOrder.shipping_cost ?? shippingCost),
        tax: Number(existingOrder.tax ?? tax),
        total: Number(existingOrder.total ?? total),
      });
    }

    const customer =
      body.customer || body.shipping || body.shippingAddress || body.shipping_address || {};
    const meta = paymentIntent.metadata || {};

    const rawClientId = String(body.id || "").trim();
    // Ensure server-side collision safety even if client sends a timestamp-only ID
    const initialOrderId =
      rawClientId && SAFE_ORDER_ID_RE.test(rawClientId) && rawClientId.split("-").length >= 3
        ? rawClientId
        : generateOrderId();

    const buildOrderRow = (orderId) => ({
      id: orderId,
      status: "paid",
      customer_name: String(customer.name || meta.customer_name || "").slice(0, 200),
      customer_email: String(customer.email || meta.customer_email || "").slice(0, 320),
      customer_phone: String(customer.phone || meta.customer_phone || "").slice(0, 40),
      shipping_method: shippingMethod,
      shipping_address:
        shippingMethod === "pickup"
          ? ""
          : String(customer.address || customer.line1 || meta.shipping_address || "").slice(0, 500),
      shipping_city:
        shippingMethod === "pickup"
          ? ""
          : String(customer.city || meta.shipping_city || "").slice(0, 120),
      shipping_state:
        shippingMethod === "pickup"
          ? ""
          : String(customer.state || meta.shipping_state || "").slice(0, 120),
      shipping_zip:
        shippingMethod === "pickup"
          ? ""
          : String(customer.zip || customer.postal_code || meta.shipping_zip || "").slice(0, 20),
      subtotal,
      shipping_cost: shippingCost,
      tax,
      total,
      ...(userId ? { user_id: userId } : {}),
      payment_intent_id: paymentIntentId,
    });

    const postHeaders = {
      apikey: sbKey,
      Authorization: `Bearer ${sbKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    let orderResponse = await fetch(`${sbUrl}/rest/v1/orders`, {
      method: "POST",
      headers: postHeaders,
      body: JSON.stringify(buildOrderRow(initialOrderId)),
    });

    if (!orderResponse.ok) {
      const errData = await orderResponse.json().catch(() => ({}));
      // Check if stripe-webhook or a concurrent request already created the order for this PaymentIntent
      const racedOrder = await fetchExistingOrderByPaymentIntent(sbConfig, paymentIntentId);
      if (racedOrder?.id) {
        const hasItems = await orderHasLineItems(sbConfig, racedOrder.id);
        if (!hasItems) {
          await insertOrderLineItems(sbConfig, racedOrder.id, normalizedItems);
        }
        return res.status(200).json({
          ok: true,
          orderId: racedOrder.id,
          alreadyExists: true,
          userId: racedOrder.user_id || userId,
          shippingMethod: racedOrder.shipping_method || shippingMethod,
          subtotal,
          shipping: shippingCost,
          tax,
          total,
        });
      }

      // Retry once with a fresh collision-safe server ID if primary key collided
      if (errData?.code === "23505") {
        orderResponse = await fetch(`${sbUrl}/rest/v1/orders`, {
          method: "POST",
          headers: postHeaders,
          body: JSON.stringify(buildOrderRow(generateOrderId())),
        });
      }

      if (!orderResponse.ok) {
        const retryErr = await orderResponse.json().catch(() => errData);
        console.error("create-order: orders insert failed:", retryErr);
        return res.status(500).json({ error: "Failed to persist order." });
      }
    }

    const createdOrders = await orderResponse.json().catch(() => []);
    const savedOrder = createdOrders[0];

    if (!savedOrder?.id) {
      return res.status(409).json({ error: "Order has already been recorded." });
    }

    // Atomically decrement stock now that we hold the unique payment_intent_id order lock
    const stockResult = await decrementOrderStock(sbConfig, normalizedItems);
    if (!stockResult.ok) {
      await deleteUnfulfilledOrderRow(sbConfig, savedOrder.id);
      await refundCapturedPaymentOnStockFailure(secretKey, paymentIntentId);
      return res.status(409).json({
        error: `Sorry, "${stockResult.failedItem?.name || "an item"}" just sold out while your payment was processing. Your payment has been automatically refunded in full.`,
        refunded: true,
      });
    }

    await insertOrderLineItems(sbConfig, savedOrder.id, normalizedItems);

    return res.status(201).json({
      ok: true,
      orderId: savedOrder.id,
      userId,
      shippingMethod,
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
