import { randomBytes } from "node:crypto";

const MONEY_EPSILON = 0.005;

export const FREE_STANDARD_SHIPPING_THRESHOLD = 50;

export const SHIPPING_RATES = Object.freeze({
  pickup: 0,
  standard: 5.99,
  express: 14.99,
  freeStandardThreshold: FREE_STANDARD_SHIPPING_THRESHOLD,
});

export function applyCors(
  req,
  res,
  {
    methods = "POST,OPTIONS",
    headers = "Authorization, Content-Type, Idempotency-Key",
  } = {},
) {
  const origin = String(req?.headers?.origin || "").trim();
  const rawAllowed = [
    process.env.ALLOWED_ORIGINS,
    process.env.CORS_ALLOWED_ORIGINS,
    process.env.FRONTEND_URL,
    process.env.SITE_URL,
  ]
    .filter(Boolean)
    .join(",");

  const allowedOrigins = rawAllowed
    .split(",")
    .map((entry) => entry.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const normalizedOrigin = origin.replace(/\/$/, "");
  if (origin && allowedOrigins.includes(normalizedOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  } else {
    // Never combine Access-Control-Allow-Credentials: true with '*'
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", headers);
}

export function money(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw new Error("Invalid monetary value.");
  }

  return Math.round((number + Number.EPSILON) * 100) / 100;
}

export function generateOrderId() {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

export function getSupabaseServerConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server credentials are not configured.");
  }

  return { url: url.replace(/\/$/, ""), key };
}

export async function resolveBearerUserId(req, sbConfig, { strict = false } = {}) {
  const authHeader = String(req?.headers?.authorization || "");
  const accessToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!accessToken) {
    return { userId: null, invalidToken: false };
  }

  try {
    const whoResponse = await fetch(`${sbConfig.url}/auth/v1/user`, {
      headers: {
        apikey: sbConfig.key,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!whoResponse.ok) {
      return { userId: null, invalidToken: strict };
    }

    const who = await whoResponse.json().catch(() => null);
    return { userId: who?.id || null, invalidToken: false };
  } catch {
    return { userId: null, invalidToken: strict };
  }
}

export function normalizeShippingMethod(method) {
  const normalized = String(method || "standard").trim().toLowerCase();
  if (normalized === "pickup" || normalized === "standard" || normalized === "express") {
    return normalized;
  }
  throw new Error("Invalid shipping method.");
}

export function getShippingCost(method, subtotal) {
  const normalized = normalizeShippingMethod(method);
  const safeSubtotal = money(subtotal);

  switch (normalized) {
    case "pickup":
      return SHIPPING_RATES.pickup;
    case "express":
      return SHIPPING_RATES.express;
    case "standard":
      return safeSubtotal >= FREE_STANDARD_SHIPPING_THRESHOLD
        ? 0
        : SHIPPING_RATES.standard;
    default:
      throw new Error("Invalid shipping method.");
  }
}

export function getTaxRate() {
  const configured = process.env.MOBICARE_TAX_RATE ?? process.env.TAX_RATE;
  if (configured == null || configured === "") return 0;

  const rate = Number(configured);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new Error("MOBICARE_TAX_RATE must be a decimal between 0 and 1.");
  }

  return rate;
}

export function calculateTax(taxableAmount) {
  return money(money(taxableAmount) * getTaxRate());
}

export function calculateSubtotal(items) {
  return money(items.reduce((sum, item) => sum + item.price * item.qty, 0));
}

export function assertClose(actual, expected, label) {
  if (Math.abs(money(actual) - money(expected)) > MONEY_EPSILON) {
    throw new Error(`${label} does not match the server-calculated amount.`);
  }
}

export function serializeCompactCartItems(items) {
  const compact = [];
  for (const item of items) {
    const entry = {
      id: String(item.product_id ?? item.id ?? "").trim(),
      q: Number(item.qty ?? item.q ?? 1),
    };
    const candidate = JSON.stringify([...compact, entry]);
    if (candidate.length > 490) break;
    compact.push(entry);
  }
  return JSON.stringify(compact);
}

export async function fetchProductsForOrder(
  items,
  { enforceStock = true, allowInactive = false } = {},
) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Order has no items.");
  }

  // Merge any duplicate product lines cleanly while preserving order
  const qtyById = new Map();
  const nameHintById = new Map();

  for (const raw of items) {
    const id = String(raw?.id ?? raw?.product_id ?? "").trim();
    if (!id) {
      throw new Error("Every order item must reference a product.");
    }

    const qty = Number(raw?.qty ?? raw?.q);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error(`Invalid quantity for product ${id}.`);
    }

    qtyById.set(id, (qtyById.get(id) || 0) + qty);
    if (raw?.name && !nameHintById.has(id)) {
      nameHintById.set(id, String(raw.name));
    }
  }

  const ids = [...qtyById.keys()];
  const { url, key } = getSupabaseServerConfig();
  const query = encodeURIComponent(`(${ids.map((id) => `"${id.replace(/"/g, "")}"`).join(",")})`);

  const response = await fetch(
    `${url}/rest/v1/products?select=id,name,price,stock,active&id=in.${query}`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Unable to verify product pricing.");
  }

  const products = await response.json();
  const byId = new Map((products || []).map((product) => [String(product.id), product]));

  return ids.map((id) => {
    const product = byId.get(id);
    const qty = qtyById.get(id);

    if (!product || (!allowInactive && product.active === false)) {
      throw new Error(`Product ${id} is unavailable.`);
    }

    const availableStock = Number(product.stock);
    if (enforceStock && Number.isFinite(availableStock) && qty > availableStock) {
      throw new Error(`Insufficient stock for ${product.name || id}.`);
    }

    return {
      product_id: id,
      name: String(product.name || nameHintById.get(id) || id).slice(0, 300),
      price: money(product.price),
      qty,
    };
  });
}

async function decrementSingleProduct(sbConfig, productId, qty) {
  const { url, key } = sbConfig;
  const rpcResponse = await fetch(`${url}/rest/v1/rpc/decrement_product_stock`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_product_id: productId, p_qty: qty }),
  });

  if (rpcResponse.ok) {
    const result = await rpcResponse.json().catch(() => false);
    return result === true;
  }

  // Fallback if UNIFIED_SUITE_MIGRATION.sql has not been applied yet
  const errBody = await rpcResponse.json().catch(() => ({}));
  const isMissingRpc =
    rpcResponse.status === 404 ||
    errBody?.code === "PGRST202" ||
    String(errBody?.message || "").includes("decrement_product_stock");

  if (!isMissingRpc) {
    throw new Error(`Stock update failed (${rpcResponse.status}).`);
  }

  const readRes = await fetch(
    `${url}/rest/v1/products?id=eq.${encodeURIComponent(productId)}&select=id,stock&limit=1`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    },
  );
  if (!readRes.ok) return false;
  const rows = await readRes.json().catch(() => []);
  const currentStock = Number(rows[0]?.stock);
  if (!Number.isFinite(currentStock) || currentStock < qty) return false;

  const patchRes = await fetch(
    `${url}/rest/v1/products?id=eq.${encodeURIComponent(productId)}&stock=gte.${qty}`,
    {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ stock: currentStock - qty }),
    },
  );
  if (!patchRes.ok) return false;
  const updated = await patchRes.json().catch(() => []);
  return Array.isArray(updated) && updated.length > 0;
}

export async function restoreSingleProduct(sbConfig, productId, qty) {
  if (!productId || !Number.isInteger(qty) || qty <= 0) return;

  const { url, key } = sbConfig;
  const rpcResponse = await fetch(`${url}/rest/v1/rpc/restore_product_stock`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_product_id: productId, p_qty: qty }),
  });

  if (rpcResponse.ok) return;

  const errBody = await rpcResponse.json().catch(() => ({}));
  const isMissingRpc =
    rpcResponse.status === 404 ||
    errBody?.code === "PGRST202" ||
    String(errBody?.message || "").includes("restore_product_stock");

  if (!isMissingRpc) {
    console.error("restore_product_stock RPC failed:", errBody);
    return;
  }

  const readRes = await fetch(
    `${url}/rest/v1/products?id=eq.${encodeURIComponent(productId)}&select=id,stock&limit=1`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    },
  );
  if (!readRes.ok) return;
  const rows = await readRes.json().catch(() => []);
  const currentStock = Number(rows[0]?.stock ?? 0);

  await fetch(`${url}/rest/v1/products?id=eq.${encodeURIComponent(productId)}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ stock: Math.max(0, currentStock) + qty }),
  });
}

export async function decrementOrderStock(sbConfig, lineItems) {
  const decremented = [];

  for (const item of lineItems) {
    const productId = String(item.product_id || "").trim();
    const qty = Number(item.qty);

    if (!productId || !Number.isInteger(qty) || qty <= 0) continue;

    const ok = await decrementSingleProduct(sbConfig, productId, qty);
    if (!ok) {
      // Roll back items already decremented in this batch
      for (const prev of decremented) {
        await restoreSingleProduct(sbConfig, prev.product_id, prev.qty);
      }
      return { ok: false, failedItem: item };
    }

    decremented.push({ product_id: productId, qty });
  }

  return { ok: true };
}

export async function restoreOrderStock(sbConfig, lineItems) {
  for (const item of lineItems || []) {
    const productId = String(item?.product_id || "").trim();
    const qty = Number(item?.qty);
    if (!productId || !Number.isInteger(qty) || qty <= 0) continue;
    await restoreSingleProduct(sbConfig, productId, qty);
  }
}
