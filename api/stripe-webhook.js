import {
  calculateSubtotal,
  fetchProductsForOrder,
  generateOrderId,
  getShippingCost,
  getSupabaseServerConfig,
  money,
} from "./_order-pricing.js";

// Vercel Serverless Function: /api/stripe-webhook
// Stripe is the source of truth for payment state. Events are authenticated
// before any database mutation is attempted.
// Note: `order_restock` trigger on `public.orders` automatically restores stock
// when `status` transitions to 'refunded' / 'cancelled' / 'payment_failed', and
// `order_item_take_stock` on `public.order_items` decrements stock on self-heal.

export const config = {
  api: {
    bodyParser: false,
  },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;

  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const parts = String(signatureHeader).split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  const timestampNumber = Number(timestamp);
  if (!timestamp || !Number.isFinite(timestampNumber) || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody.toString("utf8")}`)
    .digest();

  return signatures.some((signature) => {
    try {
      const provided = Buffer.from(signature, "hex");
      return provided.length === expected.length && timingSafeEqual(provided, expected);
    } catch {
      return false;
    }
  });
}

async function findOrderByPaymentIntent(paymentIntentId) {
  const { url, key } = getSupabaseServerConfig();
  const response = await fetch(
    `${url}/rest/v1/orders?payment_intent_id=eq.${encodeURIComponent(paymentIntentId)}&select=id,status,total,payment_intent_id&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    },
  );

  if (!response.ok) throw new Error(`Unable to query order (${response.status}).`);
  const orders = await response.json();
  return orders[0] || null;
}

async function updateOrder(orderId, patch) {
  const { url, key } = getSupabaseServerConfig();
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };

  let response = await fetch(
    `${url}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify(patch),
    },
  );

  // Graceful fallback if additive refunded_amount column hasn't been applied yet
  if (!response.ok && "refunded_amount" in patch) {
    const detail = await response.text();
    if (detail.includes("refunded_amount")) {
      const fallbackPatch = { ...patch };
      delete fallbackPatch.refunded_amount;
      if (Object.keys(fallbackPatch).length === 0) return;
      response = await fetch(
        `${url}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify(fallbackPatch),
        },
      );
    } else {
      throw new Error(`Unable to update order (${response.status}): ${detail.slice(0, 300)}`);
    }
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Unable to update order (${response.status}): ${detail.slice(0, 300)}`);
  }
}

async function selfHealOrderFromPaymentIntent(pi) {
  const meta = pi?.metadata || {};
  if (!meta.cart_items) return null;

  let rawItems;
  try {
    rawItems = JSON.parse(meta.cart_items);
  } catch {
    return null;
  }
  if (!Array.isArray(rawItems) || rawItems.length === 0) return null;

  const { url, key } = getSupabaseServerConfig();
  const normalizedItems = await fetchProductsForOrder(rawItems, { enforceStock: false });
  const shippingMethod = String(meta.shipping_method || "standard").trim();
  const subtotal = meta.subtotal != null ? money(meta.subtotal) : calculateSubtotal(normalizedItems);
  const shippingCost =
    meta.shipping_cost != null ? money(meta.shipping_cost) : money(getShippingCost(shippingMethod, subtotal));
  const paidDollars = money(Number(pi.amount_received ?? pi.amount ?? 0) / 100);
  const tax =
    meta.tax != null ? money(meta.tax) : money(Math.max(0, paidDollars - subtotal - shippingCost));
  const total = paidDollars > 0 ? paidDollars : money(subtotal + shippingCost + tax);
  const userId = UUID_RE.test(String(meta.user_id || "")) ? String(meta.user_id) : null;

  const baseRow = {
    id: generateOrderId(),
    status: "paid",
    payment_intent_id: pi.id,
    ...(userId ? { user_id: userId } : {}),
    customer_name: String(meta.customer_name || pi.shipping?.name || "").slice(0, 200),
    customer_email: String(meta.customer_email || pi.receipt_email || "").slice(0, 320),
    customer_phone: String(meta.customer_phone || pi.shipping?.phone || "").slice(0, 40),
    shipping_address: String(meta.shipping_address || pi.shipping?.address?.line1 || "").slice(0, 500),
    shipping_city: String(meta.shipping_city || pi.shipping?.address?.city || "").slice(0, 120),
    shipping_state: String(meta.shipping_state || pi.shipping?.address?.state || "").slice(0, 120),
    shipping_zip: String(meta.shipping_zip || pi.shipping?.address?.postal_code || "").slice(0, 20),
    subtotal,
    shipping_cost: shippingCost,
    tax,
    total,
  };

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  let orderRes = await fetch(`${url}/rest/v1/orders`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...baseRow, shipping_method: shippingMethod }),
  });

  if (!orderRes.ok) {
    const errObj = await orderRes.json().catch(() => ({}));
    if (JSON.stringify(errObj).includes("shipping_method")) {
      orderRes = await fetch(`${url}/rest/v1/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify(baseRow),
      });
    } else if (errObj?.code === "23505") {
      return findOrderByPaymentIntent(pi.id);
    } else {
      throw new Error(`Unable to self-heal order: ${JSON.stringify(errObj).slice(0, 200)}`);
    }
  }

  if (!orderRes.ok) return findOrderByPaymentIntent(pi.id);
  const created = await orderRes.json().catch(() => []);
  const saved = created[0];
  if (!saved?.id) return null;

  const lineItems = normalizedItems.map((item) => ({
    order_id: saved.id,
    ...item,
  }));
  await fetch(`${url}/rest/v1/order_items`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify(lineItems),
  });

  return saved;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_SIGNING_SECRET;

  if (!webhookSecret) {
    console.error("Stripe webhook secret is not configured.");
    return res.status(503).json({ error: "Webhook is not configured." });
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers["stripe-signature"];

    if (!(await verifyStripeSignature(rawBody, signature, webhookSecret))) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    let event;
    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return res.status(400).json({ error: "Invalid JSON payload" });
    }

    const object = event?.data?.object;
    const paymentIntentId =
      event?.type?.startsWith("payment_intent.")
        ? object?.id
        : object?.payment_intent;

    if (!paymentIntentId) return res.status(200).json({ received: true });

    let order = await findOrderByPaymentIntent(paymentIntentId);

    if (!order && event.type === "payment_intent.succeeded") {
      // Give the browser's immediate /api/create-order request a brief head start
      // on the very first webhook delivery, then self-heal from PaymentIntent metadata
      // if the customer closed the tab before /api/create-order completed.
      const eventCreated = Number(event.created || object?.created || 0);
      const ageSeconds = eventCreated ? Date.now() / 1000 - eventCreated : 999;

      if (ageSeconds >= 10 && object?.metadata?.cart_items) {
        order = await selfHealOrderFromPaymentIntent(object);
      }
    }

    if (!order) {
      // For failed or canceled intents that never created an order row, acknowledge cleanly
      if (event.type === "payment_intent.payment_failed" || event.type === "payment_intent.canceled") {
        return res.status(200).json({ received: true, ignored: true });
      }
      console.warn("Stripe event has no matching order yet:", paymentIntentId);
      return res.status(409).json({ error: "Order not found yet." });
    }

    switch (event.type) {
      case "payment_intent.succeeded": {
        const expectedAmount = Math.round(Number(order.total) * 100);
        if (Number(object.amount_received ?? object.amount) !== expectedAmount) {
          console.error("Stripe amount mismatch for order:", order.id);
          return res.status(409).json({ error: "Payment amount does not match order." });
        }
        if (object.currency && object.currency.toLowerCase() !== "usd") {
          return res.status(409).json({ error: "Unsupported payment currency." });
        }
        if (order.status === "payment_failed" || order.status === "cancelled") {
          await updateOrder(order.id, { status: "paid" });
        }
        break;
      }

      case "payment_intent.payment_failed":
        if (order.status !== "paid" && order.status !== "shipped" && order.status !== "delivered") {
          await updateOrder(order.id, { status: "payment_failed" });
        }
        break;

      case "payment_intent.canceled":
        if (order.status !== "paid" && order.status !== "shipped" && order.status !== "delivered") {
          await updateOrder(order.id, { status: "cancelled" });
        }
        break;

      case "charge.refunded": {
        const chargeAmount = Number(object.amount || 0);
        const refundedCents = Number(object.amount_refunded || 0);
        const isFullRefund = chargeAmount > 0 && refundedCents >= chargeAmount;
        const patch = {
          refunded_amount: money(refundedCents / 100),
          ...(isFullRefund && order.status !== "refunded" ? { status: "refunded" } : {}),
        };
        await updateOrder(order.id, patch);
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ error: "Webhook processing failed." });
  }
}
