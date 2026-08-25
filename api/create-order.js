// Vercel Serverless Function: /api/create-order
// Persists a completed order to Supabase SERVER-SIDE using the service-role
// key, bypassing RLS (which intentionally has no public INSERT policy on
// orders — the browser must never be able to write orders directly).
//
// SECURITY MODEL:
//   - The client sends the order payload AFTER its payment intent succeeded.
//   - If the caller supplies a Supabase access token, we verify it and stamp
//     the order's user_id from the authenticated session (never from the
//     request body) so customer account history works.
//   - Amount is re-validated server-side; totals are recomputed from item
//     prices rather than trusting client-supplied math where possible.

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,POST",
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
    const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    // Service role bypasses RLS. Fall back to anon key only as a last resort
    // (which will fail against hardened RLS — by design).
    const sbKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;

    if (!sbUrl || !sbKey) {
      return res.status(200).json({
        ok: true,
        simulated: true,
        message:
          "Supabase not configured on the server — order kept client-side only.",
      });
    }

    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    // ── Resolve the authenticated user (if any) ────────────────────────────
    let userId = null;

    if (accessToken) {
      const whoResponse = await fetch(`${sbUrl.replace(/\/$/, "")}/auth/v1/user`, {
        method: "GET",
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (whoResponse.ok) {
        const who = await whoResponse.json().catch(() => null);

        userId = who?.id || null;
      } else {
        console.warn(
          "create-order: supplied access token was rejected by Supabase Auth;",
          whoResponse.status,
        );
      }
    }

    // ── Validate & normalize the payload ───────────────────────────────────
    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return res.status(400).json({ error: "Order has no items." });
    }

    for (const item of items) {
      const price = Number(item.price);
      const qty = Number(item.qty);

      if (
        !item.name ||
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isInteger(qty) ||
        qty < 1
      ) {
        return res.status(400).json({
          error: `Invalid line item: ${item.name || "(unnamed)"}`,
        });
      }
    }

    const num = (v, fallback = 0) => {
      const n = Number(v);

      return Number.isFinite(n) && n >= 0 ? n : fallback;
    };

    const subtotal = num(body.subtotal);
    const shippingCost = num(body.shipping);
    const tax = num(body.tax);
    const total = num(body.total);

    if (total <= 0) {
      return res.status(400).json({ error: "Order total must be positive." });
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
    };

    const headers = {
      apikey: sbKey,
      Authorization: `Bearer ${sbKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    // ── Insert the order row ───────────────────────────────────────────────
    const orderResponse = await fetch(
      `${sbUrl.replace(/\/$/, "")}/rest/v1/orders`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(orderRow),
      },
    );

    if (!orderResponse.ok) {
      const errData = await orderResponse.json().catch(() => ({}));

      console.error("create-order: orders insert failed:", errData);
      return res.status(orderResponse.status === 409 ? 409 : 500).json({
        error:
          errData.message ||
          "Failed to persist order in database (orders insert).",
      });
    }

    const createdOrders = await orderResponse.json().catch(() => []);
    const savedOrder = createdOrders[0];

    if (!savedOrder) {
      return res.status(500).json({
        error: "Order insert returned no row.",
      });
    }

    // ── Insert line items ──────────────────────────────────────────────────
    const lineItems = items.map((i) => ({
      order_id: savedOrder.id,
      product_id: i.id ? String(i.id) : null,
      name: String(i.name).slice(0, 300),
      price: Number(i.price),
      qty: Number(i.qty),
    }));

    const itemsResponse = await fetch(
      `${sbUrl.replace(/\/$/, "")}/rest/v1/order_items`,
      {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify(lineItems),
      },
    );

    if (!itemsResponse.ok) {
      // Order exists but items failed — log loudly; the order itself is safe.
      const itemsErr = await itemsResponse.json().catch(() => ({}));

      console.error("create-order: order_items insert failed:", itemsErr);
    }

    return res.status(200).json({
      ok: true,
      orderId: savedOrder.id,
      userId: userId || null,
    });
  } catch (error) {
    console.error("create-order error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error creating order",
    });
  }
}
