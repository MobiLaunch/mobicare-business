import {
  applyCors,
  assertClose,
  calculateSubtotal,
  calculateTax,
  fetchProductsForOrder,
  generateOrderId,
  getShippingCost,
  getSupabaseServerConfig,
  money,
  resolveUserIdFromAuth,
} from "./_order-pricing.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHOP_PICKUP_ADDRESS = "Fairfield Store Pickup — 920 Commerce Drive, Suite 3";
const SHOP_PICKUP_CITY = "Fairfield";
const SHOP_PICKUP_STATE = "IL";
const SHOP_PICKUP_ZIP = "62837";

async function issueAutoRefund(secretKey, paymentIntentId) {
  try {
    const params = new URLSearchParams({
      payment_intent: paymentIntentId,
      reason: "requested_by_customer",
    });
    const response = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `auto_refund_oos_${paymentIntentId}`,
      },
      body: params.toString(),
    });
    return response.ok;
  } catch (err) {
    console.error("create-order: automatic refund failed:", err);
    return false;
  }
}

async function ensureOrderItemsExist(sbUrl, sbHeaders, orderId, items) {
  const checkRes = await fetch(
    `${sbUrl}/rest/v1/order_items?select=id&order_id=eq.${encodeURIComponent(orderId)}&limit=1`,
    { headers: sbHeaders },
  );
  if (checkRes.ok) {
    const existingItems = await checkRes.json().catch(() => []);
    if (Array.isArray(existingItems) && existingItems.length > 0) return true;
  }

  // Backfill missing line items (fires order_item_take_stock trigger in Postgres)
  const normalized = await fetchProductsForOrder(items, { enforceStock: false });
  const lineItems = normalized.map((item) => ({
    order_id: orderId,
    ...item,
  }));
  const insertRes = await fetch(`${sbUrl}/rest/v1/order_items`, {
    method: "POST",
    headers: { ...sbHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(lineItems),
  });
  return insertRes.ok;
}

// Vercel Serverless Function: /api/create-order
// Persists an already-paid order. Product prices, shipping, tax, and totals
// are calculated server-side and tied to the Stripe PaymentIntent.
// NOTE: Stock is decremented by the database trigger `order_item_take_stock`
// on `public.order_items` — do NOT invoke a separate stock-decrement RPC here.
export default async function handler(req, res) {
  applyCors(req, res);

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

    const authResult = await resolveUserIdFromAuth(req);
    if (authResult.hasToken && !authResult.valid) {
      return res.status(401).json({ error: "Invalid authentication token." });
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

    const metadataUserId = String(paymentIntent.metadata?.user_id || "").trim();
    const userId =
      authResult.userId || (UUID_RE.test(metadataUserId) ? metadataUserId : null);

    const sbBaseHeaders = { apikey: sbKey, Authorization: `Bearer ${sbKey}` };

    // Idempotency at the database boundary: a PaymentIntent can only create one order.
    // Also verifies order_items exist and backfills them if a prior call failed mid-way.
    const existingResponse = await fetch(
      `${sbUrl}/rest/v1/orders?select=id,user_id,subtotal,shipping_cost,tax,total&payment_intent_id=eq.${encodeURIComponent(paymentIntentId)}&limit=1`,
      { headers: sbBaseHeaders },
    );

    if (existingResponse.ok) {
      const existing = await existingResponse.json().catch(() => []);
      const found = existing[0];
      if (found?.id) {
        await ensureOrderItemsExist(sbUrl, sbBaseHeaders, found.id, items);
        if (userId && !found.user_id) {
          await fetch(`${sbUrl}/rest/v1/orders?id=eq.${encodeURIComponent(found.id)}`, {
            method: "PATCH",
            headers: { ...sbBaseHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ user_id: userId }),
          }).catch(() => undefined);
        }
        return res.status(200).json({
          ok: true,
          orderId: found.id,
          alreadyExists: true,
          userId: found.user_id || userId,
          subtotal: money(found.subtotal ?? 0),
          shipping: money(found.shipping_cost ?? 0),
          tax: money(found.tax ?? 0),
          total: money(found.total ?? 0),
        });
      }
    }

    // Re-verify live product stock right before inserting. If stock hit 0 while
    // Stripe was capturing payment, automatically issue a full refund so the
    // customer is never charged without receiving an order.
    let normalizedItems;
    try {
      normalizedItems = await fetchProductsForOrder(items, { enforceStock: true });
    } catch (stockError) {
      if (stockError?.code === "OUT_OF_STOCK" || stockError?.code === "UNAVAILABLE") {
        const refunded = await issueAutoRefund(secretKey, paymentIntentId);
        return res.status(409).json({
          error: refunded
            ? `${stockError.message} Your card has been automatically refunded in full.`
            : `${stockError.message} Please contact the shop with reference ${paymentIntentId} for an immediate refund.`,
          refunded,
        });
      }
      throw stockError;
    }

    const shippingMethod = String(
      body.shippingMethod ||
        body.shipping_method ||
        paymentIntent.metadata?.shipping_method ||
        "standard",
    ).trim();
    const subtotal = calculateSubtotal(normalizedItems);
    const shippingCost = money(getShippingCost(shippingMethod, subtotal));
    const tax = calculateTax(subtotal + shippingCost);
    const total = money(subtotal + shippingCost + tax);

    if (total <= 0) return res.status(400).json({ error: "Order total must be positive." });
    if (body.total != null) assertClose(body.total, total, "Order total");

    if (Number(paymentIntent.amount) !== Math.round(total * 100)) {
      return res.status(409).json({ error: "Payment amount does not match the order." });
    }

    const customer = body.customer || body.shipping || body.shippingAddress || {};
    const isPickup = shippingMethod === "pickup";
    const clientOrderId = String(body.id || "").trim();
    const orderId = /^ORD-[A-Z0-9]{6,}-[A-Z0-9]{4,}$/.test(clientOrderId)
      ? clientOrderId
      : generateOrderId();

    const baseOrderRow = {
      id: orderId,
      status: "paid",
      customer_name: String(customer.name || paymentIntent.metadata?.customer_name || "").slice(0, 200),
      customer_email: String(customer.email || paymentIntent.metadata?.customer_email || "").slice(0, 320),
      customer_phone: String(customer.phone || paymentIntent.metadata?.customer_phone || "").slice(0, 40),
      shipping_address: String(
        isPickup
          ? SHOP_PICKUP_ADDRESS
          : customer.address || customer.line1 || paymentIntent.metadata?.shipping_address || "",
      ).slice(0, 500),
      shipping_city: String(
        isPickup ? SHOP_PICKUP_CITY : customer.city || paymentIntent.metadata?.shipping_city || "",
      ).slice(0, 120),
      shipping_state: String(
        isPickup ? SHOP_PICKUP_STATE : customer.state || paymentIntent.metadata?.shipping_state || "",
      ).slice(0, 120),
      shipping_zip: String(
        isPickup ? SHOP_PICKUP_ZIP : customer.zip || customer.postal_code || paymentIntent.metadata?.shipping_zip || "",
      ).slice(0, 20),
      subtotal,
      shipping_cost: shippingCost,
      tax,
      total,
      ...(userId ? { user_id: userId } : {}),
      payment_intent_id: paymentIntentId,
    };

    const headers = {
      ...sbBaseHeaders,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    let orderResponse = await fetch(`${sbUrl}/rest/v1/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...baseOrderRow, shipping_method: shippingMethod }),
    });

    // Graceful fallback if additive shipping_method column hasn't been applied yet
    if (!orderResponse.ok) {
      const firstErr = await orderResponse.json().catch(() => ({}));
      const errText = JSON.stringify(firstErr);
      if (errText.includes("shipping_method")) {
        orderResponse = await fetch(`${sbUrl}/rest/v1/orders`, {
          method: "POST",
          headers,
          body: JSON.stringify(baseOrderRow),
        });
      } else if (firstErr?.code === "23505") {
        // Concurrent webhook self-heal already inserted the order for this PaymentIntent
        const raceCheck = await fetch(
          `${sbUrl}/rest/v1/orders?select=id&payment_intent_id=eq.${encodeURIComponent(paymentIntentId)}&limit=1`,
          { headers: sbBaseHeaders },
        );
        const raced = raceCheck.ok ? await raceCheck.json().catch(() => []) : [];
        if (raced[0]?.id) {
          await ensureOrderItemsExist(sbUrl, sbBaseHeaders, raced[0].id, items);
          return res.status(200).json({
            ok: true,
            orderId: raced[0].id,
            alreadyExists: true,
            userId,
            subtotal,
            shipping: shippingCost,
            tax,
            total,
          });
        }
      } else {
        console.error("create-order: orders insert failed:", firstErr);
        return res.status(500).json({ error: "Failed to persist order." });
      }
    }

    if (!orderResponse.ok) {
      const errData = await orderResponse.json().catch(() => ({}));
      console.error("create-order: orders insert retry failed:", errData);
      return res.status(500).json({ error: "Failed to persist order." });
    }

    const createdOrders = await orderResponse.json().catch(() => []);
    const savedOrder = createdOrders[0];

    if (!savedOrder?.id) {
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
