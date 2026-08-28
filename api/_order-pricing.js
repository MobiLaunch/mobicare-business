const MONEY_EPSILON = 0.005;

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

export async function fetchProductsForOrder(items) {
  const { url, key } = getSupabaseServerConfig();
  const ids = [...new Set(items.map((item) => String(item?.id || "").trim()).filter(Boolean))];

  if (!ids.length || ids.length !== items.length) {
    throw new Error("Every order item must reference a product.");
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
    const id = String(item.id);
    const product = byId.get(id);

    if (!product || product.active === false) {
      throw new Error(`Product ${id} is unavailable.`);
    }

    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error(`Invalid quantity for product ${id}.`);
    }

    if (Number.isFinite(Number(product.stock)) && qty > Number(product.stock)) {
      throw new Error(`Insufficient stock for ${product.name || id}.`);
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

export function calculateSubtotal(items) {
  return money(items.reduce((sum, item) => sum + item.price * item.qty, 0));
}

export function assertClose(actual, expected, label) {
  if (Math.abs(money(actual) - money(expected)) > MONEY_EPSILON) {
    throw new Error(`${label} does not match the server-calculated amount.`);
  }
}
