// Vercel Serverless Function: /api/stripe-webhook
// Stripe is the source of truth for payment state. The webhook is intentionally
// strict: an unconfigured signing secret is a deployment error, not a reason to
// accept unverified payment events.

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
  const timestamp = String(signatureHeader)
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.startsWith("t="))
    ?.slice(2);

  const signatures = String(signatureHeader)
    .split(",")
    .map((part) => part.trim().slice(0, 2) === "v1" ? part.trim().slice(3) : null)
    .filter(Boolean);

  if (!timestamp || signatures.length === 0) return false;

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) return false;

  // Stripe recommends a five-minute tolerance for webhook replay protection.
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
      console.error("Stripe webhook signature verification failed.");
      return res.status(400).json({ error: "Invalid signature" });
    }

    let event;
    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return res.status(400).json({ error: "Invalid JSON payload" });
    }

    const object = event?.data?.object;
    console.info("Received Stripe webhook event:", event?.type || "unknown");

    switch (event?.type) {
      case "payment_intent.succeeded":
        console.info("Payment succeeded:", object?.id);
        // Order fulfillment/reconciliation is intentionally handled in the
        // next step once the database schema for payment_intent_id is verified.
        break;

      case "payment_intent.payment_failed":
        console.warn("Payment failed:", object?.id);
        break;

      case "payment_intent.canceled":
        console.warn("Payment canceled:", object?.id);
        break;

      case "charge.refunded":
        console.info("Charge refunded:", object?.id);
        break;

      default:
        // Unknown Stripe events should still be acknowledged after successful
        // signature verification so Stripe does not repeatedly retry them.
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ error: "Webhook processing failed." });
  }
}
