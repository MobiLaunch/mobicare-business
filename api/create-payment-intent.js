// Vercel Serverless Function: /api/create-payment-intent
// Handles creation of Stripe PaymentIntents for store checkouts.

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST", "OPTIONS"]);
    return res.status(405).json({
      error: `Method ${req.method} Not Allowed. Please send a POST request.`,
    });
  }

  try {
    const { amount, currency = "usd", items, shipping, idempotencyKey } =
      req.body || {};

    // Validate amount before hitting Stripe — reject negative/absent totals
    const amountCents = Math.round(Number(amount));

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return res.status(400).json({
        error: "Invalid payment amount.",
      });
    }

    const stripeSecretKey =
      process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY;

    if (stripeSecretKey) {
      // Use direct fetch to Stripe API so zero extra serverless dependencies are required
      const params = new URLSearchParams();

      params.append("amount", String(amountCents));
      params.append("currency", currency);
      params.append("automatic_payment_methods[enabled]", "true");

      if (shipping?.email) {
        params.append("receipt_email", shipping.email);
      }

      if (shipping?.name) {
        params.append("shipping[name]", shipping.name);
      }

      if (shipping?.address) {
        params.append("shipping[address][line1]", shipping.address);
        if (shipping.city)
          params.append("shipping[address][city]", shipping.city);
        if (shipping.state)
          params.append("shipping[address][state]", shipping.state);
        if (shipping.zip)
          params.append("shipping[address][postal_code]", shipping.zip);
        params.append("shipping[address][country]", "US");
      }

      if (items && Array.isArray(items)) {
        params.append(
          "description",
          `Mobicare Order: ${items.length} item(s)`,
        );
      }

      const headers = {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      };

      if (idempotencyKey) {
        headers["Idempotency-Key"] = String(idempotencyKey);
      }

      const stripeResponse = await fetch(
        "https://api.stripe.com/v1/payment_intents",
        {
          method: "POST",
          headers,
          body: params.toString(),
        },
      );

      const stripeData = await stripeResponse.json();

      if (!stripeResponse.ok) {
        console.error("Stripe API Error:", stripeData);
        return res.status(stripeResponse.status || 400).json({
          error: stripeData.error?.message || "Failed to create PaymentIntent",
        });
      }

      return res.status(200).json({
        clientSecret: stripeData.client_secret,
        id: stripeData.id,
        status: stripeData.status,
      });
    }

    // Fallback / simulated response when STRIPE_SECRET_KEY is not configured yet
    return res.status(200).json({
      ok: true,
      simulated: true,
      clientSecret: `sim_secret_${Date.now()}`,
      id: `pi_sim_${Date.now()}`,
      message:
        "PaymentIntent processed in simulation mode. Set STRIPE_SECRET_KEY in Vercel to enable live card charges.",
    });
  } catch (error) {
    console.error("Payment intent creation error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error creating payment intent",
    });
  }
}
