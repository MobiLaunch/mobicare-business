// Vercel Serverless Function: /api/stripe-webhook
// Stripe is the source of truth for payment state. Events are authenticated
// before any database mutation is attempted.

export const config = {
  api: {
    bodyParser: false,
  },
};

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

function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials are not configured.");
  return { url: url.replace(/\/$/, ""), key };
}

async function findOrderByPaymentIntent(paymentIntentId) {
  const { url, key } = supabaseConfig();
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
  const { url, key } = supabaseConfig();
  const response = await fetch(
    `${url}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`,
    {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(patch),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Unable to update order (${response.status}): ${detail.slice(0, 300)}`);
  }
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

    const order = await findOrderByPaymentIntent(paymentIntentId);

    // Stripe may deliver the payment event before create-order has persisted
    // the order. A non-2xx response makes Stripe retry the event later.
    if (!order) {
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
        if (order.status !== "paid") await updateOrder(order.id, { status: "paid" });
        break;
      }

      case "payment_intent.payment_failed":
        if (order.status !== "paid") await updateOrder(order.id, { status: "payment_failed" });
        break;

      case "payment_intent.canceled":
        if (order.status !== "paid") await updateOrder(order.id, { status: "canceled" });
        break;

      case "charge.refunded":
        if (order.status !== "refunded") await updateOrder(order.id, { status: "refunded" });
        break;

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ error: "Webhook processing failed." });
  }
}
