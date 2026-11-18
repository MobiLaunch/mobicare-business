import {
  calculateSubtotal,
  calculateTax,
  decrementOrderStock,
  fetchProductsForOrder,
  generateOrderId,
  getShippingCost,
  getSupabaseServerConfig,
  money,
  normalizeShippingMethod,
  restoreOrderStock,
} from "./_order-pricing.js";

// Vercel Serverless Function: /api/stripe-webhook
// Stripe is the source of truth for payment state. Events are cryptographically
// verified before any database mutation is attempted.

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
  const parts = String(signatureHeader)
    .split(",")
    .map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  const timestampNumber = Number(timestamp);
  if (!timestamp || !Number.isFinite(timestampNumber) || signatures.length === 0) {
    return false;
  }
  if (Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody.toString("utf8")}`)
    .digest();

  return signatures.some((signature) => {
    try {
      const provided = Buffer.from(signature, "hex");
      return (
        provided.length === expected.length && timingSafeEqual(provided, expected)
      );
    } catch {
      return false;
    }
  });
}

async function findOrderByPaymentIntent(sbConfig, paymentIntentId) {
  const { url, key } = sbConfig;
  let response = await fetch(
    `${url}/rest/v1/orders?payment_intent_id=eq.${encodeURIComponent(paymentIntentId)}&select=id,status,total,refunded_amount,payment_intent_id&limit=1`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    },
  );

  if (!response.ok) {
    response = await fetch(
      `${url}/rest/v1/orders?payment_intent_id=eq.${encodeURIComponent(paymentIntentId)}&select=id,status,total,payment_intent_id&limit=1`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      },
    );
  }

  if (!response.ok) {
    throw new Error(`Unable to query order (${response.status}).`);
  }
  const orders = await response.json();
  return orders[0] || null;
}

async function fetchOrderItems(sbConfig, orderId) {
  const { url, key } = sbConfig;
  const response = await fetch(
    `${url}/rest/v1/order_items?order_id=eq.${encodeURIComponent(orderId)}&select=product_id,qty`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    },
  );
  if (!response.ok) return [];
  return (await response.json().catch(() => [])) || [];
}

async function updateOrder(sbConfig, orderId, patch) {
  const { url, key } = sbConfig;
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

  if (!response.ok && "refunded_amount" in patch) {
    const { refunded_amount: _ignored, ...fallbackPatch } = patch;
    if (Object.keys(fallbackPatch).length === 0) return;
    response = await fetch(
      `${url}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify(fallbackPatch),
      },
    );
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Unable to update order (${response.status}): ${detail.slice(0, 300)}`,
    );
  }
}

async function transitionOrderToFullRefund(sbConfig, orderId, refundedDollars) {
  const { url, key } = sbConfig;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  let response = await fetch(
    `${url}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&status=neq.refunded`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status: "refunded",
        refunded_amount: refundedDollars,
      }),
    },
  );

  if (!response.ok) {
    response = await fetch(
      `${url}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&status=neq.refunded`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "refunded" }),
      },
    );
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Unable to mark order refunded (${response.status}): ${detail.slice(0, 300)}`,
    );
  }

  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0;
}

async function selfHealOrderFromPaymentIntent(sbConfig, piObject) {
  const rawCart = piObject?.metadata?.cart_items;
  if (!rawCart) return null;

  let parsedCart;
  try {
    parsedCart = JSON.parse(rawCart);
  } catch {
    return null;
  }
  if (!Array.isArray(parsedCart) || parsedCart.length === 0) return null;

  const itemsInput = parsedCart
    .map((entry) => ({
      id: String(entry?.id || "").trim(),
      qty: Number(entry?.q ?? entry?.qty ?? 0),
    }))
    .filter((entry) => entry.id && Number.isInteger(entry.qty) && entry.qty > 0);

  if (!itemsInput.length) return null;

  const normalizedItems = await fetchProductsForOrder(itemsInput, {
    enforceStock: false,
    allowInactive: true,
  });

  const meta = piObject.metadata || {};
  let shippingMethod = "standard";
  try {
    shippingMethod = normalizeShippingMethod(meta.shipping_method || "standard");
  } catch {
    shippingMethod = "standard";
  }

  const subtotal = calculateSubtotal(normalizedItems);
  const shippingCost = money(getShippingCost(shippingMethod, subtotal));
  const tax = calculateTax(subtotal + shippingCost);
  const computedTotal = money(subtotal + shippingCost + tax);
  const capturedDollars = money(
    Number(piObject.amount_received ?? piObject.amount ?? 0) / 100,
  );
  const total = capturedDollars > 0 ? capturedDollars : computedTotal;

  const metaUserId = String(meta.user_id || "").trim();
  const userId = UUID_RE.test(metaUserId) ? metaUserId : null;
  const stripeAddr = piObject.shipping?.address || {};

  const orderRow = {
    id: generateOrderId(),
    payment_intent_id: piObject.id,
    status: "paid",
    customer_name: String(meta.customer_name || piObject.shipping?.name || "").slice(0, 200),
    customer_email: String(meta.customer_email || piObject.receipt_email || "").slice(0, 320),
    customer_phone: String(meta.customer_phone || piObject.shipping?.phone || "").slice(0, 40),
    shipping_method: shippingMethod,
    shipping_address:
      shippingMethod === "pickup"
        ? ""
        : String(meta.shipping_address || stripeAddr.line1 || "").slice(0, 500),
    shipping_city:
      shippingMethod === "pickup"
        ? ""
        : String(meta.shipping_city || stripeAddr.city || "").slice(0, 120),
    shipping_state:
      shippingMethod === "pickup"
        ? ""
        : String(meta.shipping_state || stripeAddr.state || "").slice(0, 120),
    shipping_zip:
      shippingMethod === "pickup"
        ? ""
        : String(meta.shipping_zip || stripeAddr.postal_code || "").slice(0, 20),
    subtotal,
    shipping_cost: shippingCost,
    tax,
    total,
    ...(userId ? { user_id: userId } : {}),
  };

  const { url, key } = sbConfig;
  const orderResponse = await fetch(`${url}/rest/v1/orders`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(orderRow),
  });

  if (!orderResponse.ok) {
    // Concurrent create-order request likely won the unique payment_intent_id race
    return await findOrderByPaymentIntent(sbConfig, piObject.id);
  }

  const created = await orderResponse.json().catch(() => []);
  const savedOrder = created[0];
  if (!savedOrder?.id) return null;

  const stockResult = await decrementOrderStock(sbConfig, normalizedItems);
  if (!stockResult.ok) {
    await fetch(`${url}/rest/v1/orders?id=eq.${encodeURIComponent(savedOrder.id)}`, {
      method: "DELETE",
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    }).catch(() => null);

    const secretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY;
    if (secretKey) {
      await fetch("https://api.stripe.com/v1/refunds", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": `auto_refund_oos_${piObject.id}`,
        },
        body: new URLSearchParams({
          payment_intent: piObject.id,
          reason: "requested_by_customer",
        }).toString(),
      }).catch((err) => console.error("Webhook auto-refund failed:", err));
    }
    return { autoRefundedOutOfStock: true };
  }

  const lineItems = normalizedItems.map((item) => ({
    order_id: savedOrder.id,
    product_id: item.product_id,
    name: item.name,
    price: item.price,
    qty: item.qty,
  }));

  const itemsResponse = await fetch(
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

  if (!itemsResponse.ok) {
    const detail = await itemsResponse.text().catch(() => "");
    throw new Error(`Webhook order_items insert failed: ${detail.slice(0, 300)}`);
  }

  return savedOrder;
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
    const paymentIntentId = event?.type?.startsWith("payment_intent.")
      ? object?.id
      : object?.payment_intent;

    if (!paymentIntentId) return res.status(200).json({ received: true });

    const sbConfig = getSupabaseServerConfig();
    let order = await findOrderByPaymentIntent(sbConfig, paymentIntentId);

    if (!order && event.type === "payment_intent.succeeded") {
      const healed = await selfHealOrderFromPaymentIntent(sbConfig, object);
      if (healed?.autoRefundedOutOfStock) {
        return res.status(200).json({ received: true, autoRefundedOutOfStock: true });
      }
      if (healed?.id) {
        order = healed;
      }
    }

    if (!order) {
      // Canceled/failed intents and auto-refunded OOS intents legitimately have no order row
      if (
        event.type === "payment_intent.canceled" ||
        event.type === "payment_intent.payment_failed" ||
        event.type === "charge.refunded"
      ) {
        return res.status(200).json({ received: true, ignored: "no_order" });
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
        if (order.status !== "paid" && order.status !== "processing" && order.status !== "shipped" && order.status !== "delivered" && order.status !== "refunded") {
          await updateOrder(sbConfig, order.id, { status: "paid" });
        }
        break;
      }

      case "payment_intent.payment_failed":
        if (order.status !== "paid" && order.status !== "refunded") {
          await updateOrder(sbConfig, order.id, { status: "payment_failed" });
        }
        break;

      case "payment_intent.canceled":
        if (order.status !== "paid" && order.status !== "refunded") {
          await updateOrder(sbConfig, order.id, { status: "cancelled" });
        }
        break;

      case "charge.refunded": {
        const amountRefundedCents = Number(object?.amount_refunded ?? 0);
        const chargeAmountCents = Number(
          object?.amount ?? Math.round(Number(order.total || 0) * 100),
        );
        const refundedDollars = money(amountRefundedCents / 100);
        const isFullRefund =
          chargeAmountCents > 0 && amountRefundedCents >= chargeAmountCents;

        if (isFullRefund) {
          if (order.status !== "refunded") {
            const didTransition = await transitionOrderToFullRefund(
              sbConfig,
              order.id,
              refundedDollars,
            );
            if (didTransition) {
              const items = await fetchOrderItems(sbConfig, order.id);
              await restoreOrderStock(sbConfig, items);
            }
          } else if (
            Math.abs(Number(order.refunded_amount || 0) - refundedDollars) > 0.005
          ) {
            await updateOrder(sbConfig, order.id, {
              refunded_amount: refundedDollars,
            });
          }
        } else {
          // Partial refund: update refunded_amount ONLY, keep existing fulfillment status
          await updateOrder(sbConfig, order.id, {
            refunded_amount: refundedDollars,
          });
        }
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
