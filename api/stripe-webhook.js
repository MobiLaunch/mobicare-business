// Vercel Serverless Function: /api/stripe-webhook
// Handles webhook events from Stripe (e.g., checkout.session.completed, payment_intent.succeeded)

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
    const event = req.body;

    console.info("Received Stripe webhook event:", event?.type || "unknown");

    // Acknowledge receipt of the webhook event
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error processing webhook",
    });
  }
}
