import {
  applyCors,
  getSupabaseServerConfig,
  money,
  restoreOrderStock,
} from "./_order-pricing.js";

async function fetchOrderForRefund(sbConfig, orderId) {
  const { url, key } = sbConfig;
  let response = await fetch(
    `${url}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,status,total,refunded_amount,payment_intent_id&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );

  // Graceful fallback if refunded_amount column hasn't been migrated yet
  if (!response.ok) {
    response = await fetch(
      `${url}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,status,total,payment_intent_id&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
  }

  if (!response.ok) return { error: true, order: null };
  const orders = await response.json().catch(() => []);
  return { error: false, order: orders[0] || null };
}

async function fetchOrderItems(sbConfig, orderId) {
  const { url, key } = sbConfig;
  const response = await fetch(
    `${url}/rest/v1/order_items?order_id=eq.${encodeURIComponent(orderId)}&select=product_id,qty`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!response.ok) return [];
  return (await response.json().catch(() => [])) || [];
}

async function patchOrderWithFallback(sbConfig, queryFilter, patch, returnRows = false) {
  const { url, key } = sbConfig;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: returnRows ? "return=representation" : "return=minimal",
  };

  let res = await fetch(`${url}/rest/v1/orders?${queryFilter}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(patch),
  });

  if (!res.ok && "refunded_amount" in patch) {
    const { refunded_amount: _ignored, ...fallbackPatch } = patch;
    if (Object.keys(fallbackPatch).length > 0) {
      res = await fetch(`${url}/rest/v1/orders?${queryFilter}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(fallbackPatch),
      });
    }
  }

  if (!res.ok) return [];
  return returnRows ? (await res.json().catch(() => [])) || [] : [];
}

// Vercel Serverless Function: /api/refund-payment-intent
// Issues a full or partial Stripe refund for a paid order (Admin-only),
// updates orders.status / orders.refunded_amount immediately, and restores
// product stock atomically on transition to full "refunded".
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

  const secretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY;
  if (!secretKey) {
    return res.status(503).json({ error: "Payments are temporarily unavailable." });
  }

  let sbConfig;
  try {
    sbConfig = getSupabaseServerConfig();
  } catch (err) {
    console.error("Supabase server credentials are not configured:", err.message);
    return res.status(503).json({ error: "Refunds are temporarily unavailable." });
  }

  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    sbConfig.key;

  try {
    const authHeader = String(req.headers.authorization || "");
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";

    if (!accessToken) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const adminCheck = await fetch(`${sbConfig.url}/rest/v1/rpc/is_admin`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    const isAdmin = adminCheck.ok
      ? await adminCheck.json().catch(() => false)
      : false;
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required." });
    }

    const orderId = String(req.body?.orderId || "").trim();
    if (!orderId) {
      return res.status(400).json({ error: "An order id is required." });
    }

    const { error: lookupErr, order } = await fetchOrderForRefund(sbConfig, orderId);
    if (lookupErr) {
      return res.status(502).json({ error: "Unable to look up order." });
    }
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    const orderTotalCents = Math.round(Number(order.total || 0) * 100);
    const alreadyRefundedCents = Math.round(Number(order.refunded_amount || 0) * 100);
    const remainingCents = Math.max(0, orderTotalCents - alreadyRefundedCents);

    if (order.status === "refunded" || remainingCents <= 0) {
      return res.status(200).json({
        ok: true,
        alreadyRefunded: true,
        status: "refunded",
        refundedAmount: money(orderTotalCents / 100),
      });
    }

    const rawAmountCents = req.body?.amountCents ?? req.body?.amount_cents;
    let refundCents = remainingCents;

    if (rawAmountCents != null && rawAmountCents !== "") {
      const parsed = Number(rawAmountCents);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return res.status(400).json({
          error: "amountCents must be a positive integer in cents.",
        });
      }
      if (parsed > remainingCents) {
        return res.status(400).json({
          error: `Refund amount exceeds remaining refundable balance ($${(remainingCents / 100).toFixed(2)}).`,
        });
      }
      refundCents = parsed;
    }

    const paymentIntentId = String(order.payment_intent_id || "").trim();
    if (!/^pi_[A-Za-z0-9_]+$/.test(paymentIntentId)) {
      return res.status(409).json({ error: "This order has no payment to refund." });
    }

    const totalRefundedAfterCents = alreadyRefundedCents + refundCents;
    const isFullRefund = totalRefundedAfterCents >= orderTotalCents;

    const params = new URLSearchParams({ payment_intent: paymentIntentId });
    if (!isFullRefund || alreadyRefundedCents > 0 || rawAmountCents != null) {
      params.set("amount", String(refundCents));
    }

    const callerIdemp = String(req.headers["idempotency-key"] || "").trim();
    const idempotencyKey =
      callerIdemp || `refund_${orderId}_${alreadyRefundedCents}_${refundCents}`;

    const stripeResponse = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": idempotencyKey.slice(0, 255),
      },
      body: params.toString(),
    });
    const stripeData = await stripeResponse.json().catch(() => null);

    if (!stripeResponse.ok) {
      console.error(
        "Stripe refund error:",
        stripeData?.error?.type || stripeResponse.status,
      );
      return res.status(502).json({
        error: stripeData?.error?.message || "Unable to issue refund.",
      });
    }

    const newRefundedAmount = money(totalRefundedAfterCents / 100);

    if (isFullRefund) {
      // Atomic status!=refunded filter guarantees stock is restored ONLY ONCE
      // even if stripe-webhook's charge.refunded arrives concurrently.
      const transitioned = await patchOrderWithFallback(
        sbConfig,
        `id=eq.${encodeURIComponent(order.id)}&status=neq.refunded`,
        { status: "refunded", refunded_amount: newRefundedAmount },
        true,
      );

      if (transitioned.length > 0) {
        const items = await fetchOrderItems(sbConfig, order.id);
        await restoreOrderStock(sbConfig, items);
      }
    } else {
      await patchOrderWithFallback(
        sbConfig,
        `id=eq.${encodeURIComponent(order.id)}`,
        {
          status: order.status,
          refunded_amount: newRefundedAmount,
        },
        false,
      );
    }

    return res.status(200).json({
      ok: true,
      refundId: stripeData.id,
      status: stripeData.status,
      orderStatus: isFullRefund ? "refunded" : order.status,
      isFullRefund,
      refundedAmount: newRefundedAmount,
    });
  } catch (error) {
    console.error("Refund error:", error);
    return res.status(500).json({ error: "Unable to issue refund." });
  }
}
