import type {
  Product,
  Category,
  Order,
  CustomerProfile,
  Booking,
  BookingRecord,
} from "@/types/domain";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// ─── Input sanitization (XSS prevention) ──────────────────────────────────
// NOTE: React already escapes interpolated text, so this is only needed for
// values that end up in non-React contexts (e.g. the EmailJS email body).
export function sanitizeInput(str: unknown): unknown {
  if (typeof str !== "string") return str;

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// ─── Supabase client ───────────────────────────────────────────────────────
// Priority: .env vars → localStorage (set via Settings page) → empty
// The Settings page lets admins configure credentials post-deployment without
// redeployment, by storing them in localStorage. Env vars take precedence.

let _client: SupabaseClient | null = null;
let _clientUrl: string | null = null;
let _clientKey: string | null = null;

export function getSupabaseConfig() {
  // Env vars win; fall back to localStorage for settings-page-configured creds
  const url = SUPABASE_URL || localStorage.getItem("sb_url") || "";
  const anonKey =
    SUPABASE_ANON_KEY || localStorage.getItem("sb_anon_key") || "";

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();

  return !!(
    url &&
    anonKey &&
    url.startsWith("https://") &&
    anonKey.length > 20
  );
}

export function getClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const { url, anonKey } = getSupabaseConfig();

  // Re-create only when credentials actually change
  if (_client && _clientUrl === url && _clientKey === anonKey) return _client;

  _client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  _clientUrl = url;
  _clientKey = anonKey;

  return _client;
}

export function resetClient() {
  _client = null;
  _clientUrl = null;
  _clientKey = null;
}

// ─── Supabase Auth (General / Admin) ───────────────────────────────────────
export async function signInWithEmail(email: string, password: string) {
  const sb = getClient();

  if (!sb)
    return {
      error: {
        message:
          "Supabase not configured — enter credentials in Settings first.",
      },
    };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  return { data, error };
}

export async function signOut() {
  const sb = getClient();

  if (!sb) return;
  await sb.auth.signOut();
}

export async function getSession() {
  const sb = getClient();

  if (!sb) return null;
  const { data } = await sb.auth.getSession();

  return data?.session ?? null;
}

export async function getUser() {
  const sb = getClient();

  if (!sb) return null;
  const { data } = await sb.auth.getUser();

  return data?.user ?? null;
}

export async function updatePassword(newPassword: string) {
  const sb = getClient();

  if (!sb) return { error: { message: "Supabase not configured" } };
  const { error } = await sb.auth.updateUser({ password: newPassword });

  return { error };
}

export async function sendPasswordReset(email: string) {
  const sb = getClient();

  if (!sb) return { error: { message: "Supabase not configured" } };
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/admin/reset-password`,
  });

  return { error };
}

// ─── Customer Auth & Account Management ────────────────────────────────────
export async function signUpWithEmail(
  email: string,
  password: string,
  metadata: { full_name?: string; phone?: string } = {},
) {
  const sb = getClient();

  if (!sb)
    return { data: null, error: { message: "Supabase not configured." } };

  const { data, error } = await sb.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: metadata.full_name || "",
        phone: metadata.phone || "",
      },
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });

  return { data, error };
}

export async function getCurrentUser() {
  const sb = getClient();

  if (!sb) return null;

  const { data, error } = await sb.auth.getUser();

  if (error) return null;

  return data?.user ?? null;
}

export async function getCustomerProfile(
  userId: string,
): Promise<{ data: CustomerProfile | null; error: unknown }> {
  const sb = getClient();

  if (!sb || !userId) return { data: null, error: null };

  const { data, error } = await sb
    .from("profiles")
    .select("id, full_name, phone, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  return { data: data as CustomerProfile | null, error };
}

export async function updateCustomerProfile(
  userId: string,
  updates: { full_name?: string; phone?: string },
) {
  const sb = getClient();

  if (!sb || !userId) {
    return { data: null, error: { message: "Supabase not configured." } };
  }

  const payload = {
    full_name: updates.full_name?.trim() || "",
    phone: updates.phone?.trim() || "",
  };

  const { data, error } = await sb
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select()
    .single();

  return { data, error };
}

export async function sbFetchCustomerBookings(userId: string) {
  const sb = getClient();

  if (!sb || !userId) return { data: [], error: null };

  const { data, error } = await sb
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}

export async function sbFetchCustomerOrders(userId: string) {
  const sb = getClient();

  if (!sb || !userId) return { data: [], error: null };

  const { data, error } = await sb
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}

export async function sendCustomerPasswordReset(email: string) {
  const sb = getClient();

  if (!sb) return { error: { message: "Supabase not configured." } };

  const { error } = await sb.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo: `${window.location.origin}/reset-password`,
    },
  );

  return { error };
}

export async function updateCustomerPassword(newPassword: string) {
  const sb = getClient();

  if (!sb) return { error: { message: "Supabase not configured." } };

  const { error } = await sb.auth.updateUser({
    password: newPassword,
  });

  return { error };
}

// ─── Connection test ───────────────────────────────────────────────────────
export async function testConnection(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const sb = getClient();

  if (!sb) return { ok: false, error: "Not configured" };
  try {
    const { error } = await sb.from("categories").select("id").limit(1);

    if (error) return { ok: false, error: error.message };

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Products ──────────────────────────────────────────────────────────────
export async function sbFetchProducts(): Promise<Product[] | null> {
  const sb = getClient();

  if (!sb) return null;
  const { data, error } = await sb
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("sbFetchProducts:", error);

    return null;
  }

  return data.map(dbToProduct);
}

export async function sbInsertProduct(
  product: Partial<Product>,
): Promise<Product | null> {
  const sb = getClient();

  if (!sb) return null;
  const { data, error } = await sb
    .from("products")
    .insert(productToDb(product))
    .select()
    .single();

  if (error) {
    console.error("sbInsertProduct:", error);

    return null;
  }

  return dbToProduct(data);
}

export async function sbUpdateProduct(
  id: string,
  updates: Partial<Product>,
): Promise<boolean | null> {
  const sb = getClient();

  if (!sb) return null;
  const { error } = await sb
    .from("products")
    .update(productToDb(updates))
    .eq("id", id);

  if (error) {
    console.error("sbUpdateProduct:", error);

    return null;
  }

  return true;
}

export async function sbDeleteProduct(id: string): Promise<boolean | null> {
  const sb = getClient();

  if (!sb) return null;
  const { error } = await sb.from("products").delete().eq("id", id);

  if (error) {
    console.error("sbDeleteProduct:", error);

    return null;
  }

  return true;
}

// ─── Categories ────────────────────────────────────────────────────────────
export async function sbFetchCategories(): Promise<Category[] | null> {
  const sb = getClient();

  if (!sb) return null;
  const { data, error } = await sb
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("sbFetchCategories:", error);

    return null;
  }

  return data.map(dbToCategory);
}

export async function sbInsertCategory(
  cat: Partial<Category>,
): Promise<Category | null> {
  const sb = getClient();

  if (!sb) return null;
  const { data, error } = await sb
    .from("categories")
    .insert(categoryToDb(cat))
    .select()
    .single();

  if (error) {
    console.error("sbInsertCategory:", error);

    return null;
  }

  return dbToCategory(data);
}

export async function sbUpdateCategory(
  id: string,
  updates: Partial<Category>,
): Promise<boolean | null> {
  const sb = getClient();

  if (!sb) return null;
  const { error } = await sb
    .from("categories")
    .update(categoryToDb(updates))
    .eq("id", id);

  if (error) {
    console.error("sbUpdateCategory:", error);

    return null;
  }

  return true;
}

export async function sbDeleteCategory(id: string): Promise<boolean | null> {
  const sb = getClient();

  if (!sb) return null;
  const { error } = await sb.from("categories").delete().eq("id", id);

  if (error) {
    console.error("sbDeleteCategory:", error);

    return null;
  }

  return true;
}

// ─── Orders ────────────────────────────────────────────────────────────────
export async function sbFetchOrders(): Promise<Order[] | null> {
  const sb = getClient();

  if (!sb) return null;
  const { data, error } = await sb
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("sbFetchOrders:", error);

    return null;
  }

  return data.map(dbToOrder);
}

const VALID_ORDER_STATUSES = [
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export async function sbInsertOrder(order: Order): Promise<Order | null> {
  const sb = getClient();

  if (!sb) return null;

  const rawStatus = (order.status || "").toLowerCase().trim();
  const safeStatus = VALID_ORDER_STATUSES.includes(rawStatus)
    ? rawStatus
    : "paid";

  // Stamp the signed-in user's id so RLS ("Customers can view own orders")
  // and the Account page's user_id lookup can find this order. Without this,
  // every order gets a NULL user_id and is invisible to customer accounts.
  let userId: string | null = null;

  try {
    const { data } = await sb.auth.getSession();

    userId = data?.session?.user?.id ?? null;
  } catch {
    userId = null;
  }

  const { data: orderRow, error: orderErr } = await sb
    .from("orders")
    .insert({
      id: order.id,
      ...(userId ? { user_id: userId } : {}),
      customer_name: order.customer?.name || "",
      customer_email: order.customer?.email || "",
      customer_phone: order.customer?.phone || "",
      shipping_address: order.customer?.address || "",
      shipping_city: order.customer?.city || "",
      shipping_state: order.customer?.state || "",
      shipping_zip: order.customer?.zip || "",
      subtotal: order.subtotal,
      shipping_cost: order.shipping,
      tax: order.tax,
      total: order.total,
      status: safeStatus,
    })
    .select()
    .single();

  if (orderErr) {
    console.error("sbInsertOrder:", orderErr);

    return null;
  }

  if (order.items?.length) {
    const lineItems = order.items.map((i) => ({
      order_id: orderRow.id,
      product_id: i.id,
      name: i.name,
      price: i.price,
      qty: i.qty,
    }));
    const { error: itemsErr } = await sb.from("order_items").insert(lineItems);

    if (itemsErr) console.error("sbInsertOrder items:", itemsErr);
  }

  return dbToOrder({
    ...orderRow,
    order_items: order.items?.map((i) => ({ ...i, product_id: i.id })) || [],
  });
}

export async function sbUpdateOrderStatus(
  id: string,
  status: string,
): Promise<boolean | null> {
  const sb = getClient();

  if (!sb) return null;

  const rawStatus = (status || "").toLowerCase().trim();
  const safeStatus = VALID_ORDER_STATUSES.includes(rawStatus)
    ? rawStatus
    : "paid";

  const { error } = await sb
    .from("orders")
    .update({ status: safeStatus })
    .eq("id", id);

  if (error) {
    console.error("sbUpdateOrderStatus:", error);

    return null;
  }

  return true;
}

// ─── Bookings ──────────────────────────────────────────────────────────────
export async function sbInsertBooking(booking: Booking): Promise<boolean> {
  const sb = getClient();
  const { data: { session } = { session: null } } = sb?.auth
    ? await sb.auth.getSession()
    : { data: { session: null } };

  try {
    const response = await fetch("/api/create-booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify(booking),
    });

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to submit booking.");
      }

      return data.ok === true;
    }

    // Non-JSON response (e.g. SPA rewrite returned index.html) → fall through
    // to the direct-Supabase fallback below.
  } catch (err) {
    // Network/HTTP failures from the API route are real errors — surface them
    // instead of silently pretending nothing happened. Only fall through when
    // the endpoint is genuinely unreachable (TypeError from fetch itself).
    if (!(err instanceof TypeError)) {
      throw err;
    }
    console.warn(
      "/api/create-booking unreachable, falling back to direct Supabase insert.",
      err,
    );
  }

  // Fallback: If /api/create-booking serverless function is missing or returns HTML (SPA rewrite),
  // insert directly via client if Supabase is configured
  if (sb) {
    const payload = {
      customer_name:
        (booking.name as string) || (booking.customer_name as string) || "",
      customer_email:
        (booking.email as string) || (booking.customer_email as string) || "",
      customer_phone:
        (booking.phone as string) || (booking.customer_phone as string) || "",
      service: (booking.service as string) || "",
      device_type:
        (booking.deviceType as string) || (booking.device_type as string) || "",
      device_model:
        (booking.deviceModel as string) ||
        (booking.device_model as string) ||
        "",
      issue: (booking.issue as string) || "",
      appt_date:
        (booking.date as string) || (booking.appt_date as string) || "",
      appt_time:
        (booking.time as string) || (booking.appt_time as string) || "",
      notes: (booking.notes as string) || "",
      visit_type:
        (booking.visit_type as string) ||
        (booking.visitType as string) ||
        "in-store",
      home_address:
        (booking.home_address as string) ||
        (booking.homeAddress as string) ||
        "",
      status: "pending",
    };

    const { error } = await sb.from("bookings").insert(payload);

    if (error) {
      console.error("Direct Supabase booking fallback error:", error);
      throw new Error(error.message || "Unable to submit booking.");
    }

    return true;
  }

  return true;
}

export async function sbFetchBookings(): Promise<BookingRecord[] | null> {
  const sb = getClient();

  if (!sb) return null;
  const { data, error } = await sb
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("sbFetchBookings:", error);

    return null;
  }

  return data as BookingRecord[];
}

const VALID_BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no-show",
];

export async function sbUpdateBookingStatus(
  id: string,
  status: string,
): Promise<boolean | null> {
  const sb = getClient();

  if (!sb) return null;

  const rawStatus = (status || "").toLowerCase().trim();
  const safeStatus = VALID_BOOKING_STATUSES.includes(rawStatus)
    ? rawStatus
    : "pending";

  const { error } = await sb
    .from("bookings")
    .update({ status: safeStatus })
    .eq("id", id);

  if (error) {
    console.error("sbUpdateBookingStatus:", error);

    return null;
  }

  return true;
}

export async function sbUpdateBooking(
  id: string,
  updates: Partial<BookingRecord>,
): Promise<boolean | null> {
  const sb = getClient();

  if (!sb) return null;
  const { error } = await sb.from("bookings").update(updates).eq("id", id);

  if (error) {
    console.error("sbUpdateBooking:", error);

    return null;
  }

  return true;
}

// ─── Site settings ─────────────────────────────────────────────────────────
export async function sbFetchSiteSettings(): Promise<Record<
  string,
  unknown
> | null> {
  const sb = getClient();

  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("site_settings")
      .select("content")
      .eq("id", "mobicare-config")
      .maybeSingle();

    if (error) {
      console.warn("sbFetchSiteSettings:", error.message);

      return null;
    }

    return (data?.content as Record<string, unknown>) || null;
  } catch (e) {
    console.warn("sbFetchSiteSettings:", e instanceof Error ? e.message : e);

    return null;
  }
}

export async function sbUpsertSiteSettings(
  content: Record<string, unknown>,
): Promise<boolean> {
  const sb = getClient();

  if (!sb) return false;
  try {
    const { error } = await sb.from("site_settings").upsert({
      id: "mobicare-config",
      content,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("sbUpsertSiteSettings:", error.message);

      return false;
    }

    return true;
  } catch (e) {
    console.error("sbUpsertSiteSettings:", e instanceof Error ? e.message : e);

    return false;
  }
}

// ─── Seed ──────────────────────────────────────────────────────────────────
export async function sbSeedInitialData(
  products: Product[],
  categories: Category[],
): Promise<{ ok: boolean; error?: string }> {
  const sb = getClient();

  if (!sb) return { ok: false, error: "Not configured" };
  try {
    const { error: catErr } = await sb
      .from("categories")
      .upsert(categories.map(categoryToDb), {
        onConflict: "id",
        ignoreDuplicates: true,
      });

    if (catErr) return { ok: false, error: `Categories: ${catErr.message}` };
    const { error: prodErr } = await sb
      .from("products")
      .upsert(products.map(productToDb), {
        onConflict: "id",
        ignoreDuplicates: true,
      });

    if (prodErr) return { ok: false, error: `Products: ${prodErr.message}` };

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Shape converters ──────────────────────────────────────────────────────
// Raw DB rows are treated as `any` at this boundary on purpose — see the
// note at the top of this file.
function productToDb(p: Partial<Product>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  if (p.id !== undefined) out.id = p.id;
  if (p.name !== undefined) out.name = p.name;
  if (p.category !== undefined) out.category = p.category;
  if (p.price !== undefined) out.price = p.price;
  if (p.comparePrice !== undefined) out.compare_price = p.comparePrice;
  if (p.stock !== undefined) out.stock = p.stock;
  if (p.sku !== undefined) out.sku = p.sku;
  if (p.description !== undefined) out.description = p.description;
  if (p.images !== undefined) out.images = p.images;
  if (p.tags !== undefined) out.tags = p.tags;
  if (p.featured !== undefined) out.featured = p.featured;
  if (p.active !== undefined) out.active = p.active;
  if (p.weight !== undefined) out.weight = p.weight;
  if (p.shippingDays !== undefined) out.shipping_days = p.shippingDays;

  return out;
}

function dbToProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: parseFloat(row.price),
    comparePrice: row.compare_price ? parseFloat(row.compare_price) : null,
    stock: row.stock,
    sku: row.sku,
    description: row.description,
    images: row.images || [],
    tags: row.tags || [],
    featured: row.featured,
    active: row.active,
    weight: row.weight,
    shippingDays: row.shipping_days || { min: 3, max: 7 },
    createdAt: row.created_at,
  };
}

function categoryToDb(c: Partial<Category>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  if (c.id !== undefined) out.id = c.id;
  if (c.name !== undefined) out.name = c.name;
  if (c.description !== undefined) out.description = c.description;
  if (c.icon !== undefined) out.icon = c.icon;
  if (c.sortOrder !== undefined) out.sort_order = c.sortOrder;

  return out;
}

function dbToCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    icon: row.icon || "Star",
    sortOrder: row.sort_order || 0,
  };
}

function dbToOrder(row: any): Order {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    customer: {
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
      address: row.shipping_address,
      city: row.shipping_city,
      state: row.shipping_state,
      zip: row.shipping_zip,
    },

    items: (row.order_items || []).map((i: any) => ({
      id: i.product_id,
      name: i.name,
      price: parseFloat(i.price),
      qty: i.qty,
    })),
    subtotal: parseFloat(row.subtotal || 0),
    shipping: parseFloat(row.shipping_cost || 0),
    tax: parseFloat(row.tax || 0),
    total: parseFloat(row.total || 0),
  };
}
