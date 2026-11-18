import { randomBytes } from "node:crypto";

const MONEY_EPSILON = 0.005;

export function applyCors(
  req,
  res,
  methods = "POST,OPTIONS",
  allowHeaders = "Authorization, Content-Type, Idempotency-Key",
) {
  const configured = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const requestOrigin = req.headers?.origin || "";

  if (configured.length > 0) {
    if (requestOrigin && configured.includes(requestOrigin)) {
      res.setHeader("Access-Control-Allow-Origin", requestOrigin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
    } else {
      res.setHeader("Access-Control-Allow-Origin", configured[0]);
      res.setHeader("Vary", "Origin");
    }
  } else {
    // Never combine Access-Control-Allow-Credentials: true with wildcard "*".
    // Authentication uses Authorization: Bearer headers rather than cookies.
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", allowHeaders);
}

export function generateOrderId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `ORD-${ts}-${rand}`;
}

export function money(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw new Error("Invalid monetary value.");
  }

  return Math.round((number + Number.EPSILON) * 100) / 100;
}

export function getSupabaseServerConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) throw new Error("Supabase server credentials are not configured.");

  return { url: url.replace(/\/$/, ""), key };
}

export async function resolveUserIdFromAuth(req) {
  const authHeader = req.headers?.authorization || "";
  const accessToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!accessToken) return { userId: null, hasToken: false, valid: true };

  let config;
  try {
    config = getSupabaseServerConfig();
  } catch {
    return { userId: null, hasToken: true, valid: false };
  }

  try {
    const whoResponse = await fetch(`${config.url}/auth/v1/user`, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!whoResponse.ok) {
      return { userId: null, hasToken: true, valid: false };
    }
    const who = await whoResponse.json().catch(() => null);
    return { userId: who?.id || null, hasToken: true, valid: Boolean(who?.id) };
  } catch {
    return { userId: null, hasToken: true, valid: false };
  }
}

export async function fetchProductsForOrder(items, options = {}) {
  const { enforceStock = true } = options;
  const { url, key } = getSupabaseServerConfig();
  const ids = [...new Set(items.map((item) => String(item?.id || "").trim()).filter(Boolean))];

  if (!ids.length || ids.length !== items.length) {
    throw new Error("Every order item must reference a unique product.");
  }

  const query = encodeURIComponent(`(${ids.join(",")})`);
  const response = await fetch(
    `${url}/rest/v1/products?select=id,name,price,stock,active&id=in.${query}`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    },
  );

  if (!response.ok) throw new Error("Unable to verify product pricing.");

  const products = await response.json();
  const byId = new Map((products || []).map((product) => [String(product.id), product]));

  return items.map((item) => {
    const id = String(item.id).trim();
    const product = byId.get(id);

    if (!product || (enforceStock && product.active === false)) {
      const err = new Error(`Product ${product?.name || id} is currently unavailable.`);
      err.code = "UNAVAILABLE";
      throw err;
    }

    const qty = Number(item.qty ?? item.q);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error(`Invalid quantity for product ${id}.`);
    }

    if (enforceStock && Number.isFinite(Number(product.stock)) && qty > Number(product.stock)) {
      const available = Math.max(0, Number(product.stock));
      const err = new Error(
        available === 0
          ? `${product.name || id} is now out of stock.`
          : `Only ${available} left in stock for ${product.name || id}.`,
      );
      err.code = "OUT_OF_STOCK";
      throw err;
    }

    const price = money(product.price);

    return {
      product_id: id,
      name: String(product.name || item.name || id).slice(0, 300),
      price,
      qty,
    };
  });
}

export function getShippingCost(method, subtotal) {
  switch (String(method || "standard")) {
    case "pickup":
      return 0;
    case "express":
      return 12.99;
    case "standard":
      return subtotal >= 35 ? 0 : 5.99;
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
