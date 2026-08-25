// Vercel Serverless Function: /api/stripe-webhook
// Handles webhook events from Stripe (e.g., checkout.session.completed, payment_intent.succeeded)
//
// SECURITY: When STRIPE_WEBHOOK_SECRET is configured, the event signature is
// verified against the raw request body before processing. Unverified
// (forged) payloads are rejected with 400. Signature verification requires
// the exact raw bytes, so body parsing is disabled via `export const config`.

export const config = {
  api: {
    bodyParser: false,
  },
};

const WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_SIGNING_SECRET;

/**
 * Verifies the Stripe-Signature header against the raw body.
 * Implements Stripe's v1 scheme (t=timestamp,v1=hmac_sha256) using only
 * Node built-ins so no extra dependency is required.
 */
async function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader) return false;

  const parts = Object.fromEntries(
    String(sigHeader)
      .split(",")
      .map((kv) => kv.split("=")),
  );
  const timestamp = parts["t"];
  const providedSig = parts["v1"];

  if (!timestamp || !providedSig) return false;

  // Reject events older than 5 minutes to prevent replay attacks
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));

  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(providedSig, "utf8");

  return a.length === b.length && timingSafeEqual(a, b);
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST", "OPTIONS"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const rawBody = await readRawBody(req);

    // Verify authenticity before trusting anything in the payload.
    if (WEBHOOK_SECRET) {
      const signatureHeader = req.headers["stripe-signature"];
      const valid = await verifyStripeSignature(
        rawBody,
        signatureHeader,
        WEBHOOK_SECRET,
      );

      if (!valid) {
        console.error("Stripe webhook signature verification failed");
        return res.status(400).json({ error: "Invalid signature" });
      }
    } else {
      console.warn(
        "STRIPE_WEBHOOK_SECRET is not set — accepting unverified webhook payloads. " +
          "Configure it in your hosting environment to reject forged events.",
      );
    }

    let event;

    try {
      event = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ error: "Invalid JSON payload" });
    }

    console.info("Received Stripe webhook event:", event?.type || "unknown");

    switch (event?.type) {
      case "payment_intent.succeeded":
      case "checkout.session.completed":
        // Order fulfillment is handled by the store's order pipeline;
        // extend here to trigger emails / inventory updates as needed.
        break;
      case "payment_intent.payment_failed":
        console.warn("Payment failed:", event?.data?.object?.id);
        break;
      default:
        break;
    }

    // Acknowledge receipt of the webhook event
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error processing webhook",
    });
  }
}
