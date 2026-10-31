import type {
  Product,
  Category,
  Order,
  CustomerProfile,
  Booking,
  BookingRecord,
  CustomerChatMessage,
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
    .from("customer_profiles")
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
    .from("customer_profiles")
    .upsert({ id: userId, ...payload, updated_at: new Date().toISOString() })
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

// ─── Customer <-> shop chat (NovaOps Messages -> Customer Chat) ────────────
// Website chat lives in the POS `messages` inbox (channel "chat"), so the shop
// sees and answers it from the same place as every other customer message.
export async function sbFetchCustomerChat(
  userId: string,
): Promise<{ data: CustomerChatMessage[]; error: unknown }> {
  const sb = getClient();

  if (!sb || !userId) return { data: [], error: null };

  const { data, error } = await sb.rpc("my_customer_messages");

  return {
    data: ((data as CustomerChatMessage[] | null) || []).map((m) => ({
      ...m,
      customer_user_id: userId,
    })),
    error,
  };
}

export async function sbSendCustomerChatMessage(
  userId: string,
  customerName: string,
  customerEmail: string,
  body: string,
): Promise<{ data: CustomerChatMessage | null; error: unknown }> {
  const sb = getClient();

  if (!sb) return { data: null, error: { message: "Supabase not configured." } };

  const { data, error } = await sb.rpc("send_customer_message", {
    p_body: sanitizeInput(body) as string,
  });

  if (error) return { data: null, error };

  return {
    data: {
      id: Number(data),
      profile_id: "",
      customer_user_id: userId,
      ticket_id: null,
      customer_name: customerName,
      customer_email: customerEmail,
      direction: "inbound",
      body: sanitizeInput(body) as string,
      read: false,
      created_at: new Date().toISOString(),
    },
    error: null,
  };
}

/** A visitor without an account leaves a message for the shop; it lands in the POS inbox. */
export async function sbSendGuestMessage(input: {
  name: string;
  email: string;
  phone: string;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const sb = getClient();

  if (!sb) return { ok: false, error: "Messaging isn't available right now. Please call us." };
  const { error } = await sb.rpc("send_guest_message", {
    p_name: sanitizeInput(input.name),
    p_email: input.email,
    p_phone: input.phone,
    p_body: sanitizeInput(input.body),
  });

  return error ? { ok: false, error: error.message } : { ok: true };
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
  "payment_failed",
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

// Issues a real Stripe refund via /api/refund-payment-intent. Unlike
// sbUpdateOrderStatus, this never writes the order row directly — the
// stripe-webhook function's "charge.refunded" handler is what actually
// flips the status once Stripe confirms.
export async function sbRefundOrder(
  orderId: string,
): Promise<{ ok: boolean; error?: string; alreadyRefunded?: boolean }> {
  const sb = getClient();
  const { data: { session } = { session: null } } = sb?.auth
    ? await sb.auth.getSession()
    : { data: { session: null } };

  if (!session?.access_token) {
    return { ok: false, error: "You must be signed in as an admin to issue a refund." };
  }

  try {
    const response = await fetch("/api/refund-payment-intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ orderId }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { ok: false, error: data?.error || "Unable to issue refund." };
    }

    return { ok: true, alreadyRefunded: Boolean(data?.alreadyRefunded) };
  } catch (error) {
    console.error("sbRefundOrder:", error);

    return { ok: false, error: "Unable to reach the refund service." };
  }
}

// ─── Bookings ──────────────────────────────────────────────────────────────
export interface BookingResult {
  ok: boolean;
  bookingId?: string;
  ticketId?: number;
  price?: number;
}

/**
 * Books through the shared database: one call matches or creates the customer,
 * puts the visit on the POS calendar and opens a draft ticket with the quoted price.
 * Returns null when the RPC is unavailable so the caller can fall back.
 */
async function sbSubmitBookingRpc(booking: Booking): Promise<BookingResult | null> {
  const sb = getClient();

  if (!sb) return null;
  const b = booking as Record<string, unknown>;
  const { data, error } = await sb.rpc("submit_booking", {
    payload: {
      name: b.name || b.customer_name,
      email: b.email || b.customer_email,
      phone: b.phone || b.customer_phone,
      service: b.service,
      service_id: b.service_id || null,
      device_type: b.device_type || b.deviceType,
      device_model: b.device_model || b.deviceModel,
      issue: b.issue,
      date: b.date_iso || b.appt_date || b.date,
      time: b.time || b.appt_time,
      notes: b.notes,
      visit_type: b.visit_type || b.visitType || "in-store",
      visit_location_type: b.visit_location_type || b.visitLocationType || null,
      home_address: b.home_address || b.homeAddress || "",
    },
  });

  if (error) {
    // Validation failures are the customer's to fix; anything else falls back.
    if (error.code === "P0001") throw new Error(error.message);
    console.warn("submit_booking unavailable, falling back:", error);

    return null;
  }
  const r = data as { booking_id?: string; ticket_id?: number; price?: number } | null;

  return { ok: true, bookingId: r?.booking_id, ticketId: r?.ticket_id, price: r?.price };
}

export interface RepairCatalogItem {
  id: string;
  name: string;
  category: string;
  price: number;
  minutes: number | null;
}

export async function sbFetchRepairCatalog(): Promise<RepairCatalogItem[] | null> {
  const sb = getClient();

  if (!sb) return null;
  const { data, error } = await sb
    .from("public_repair_catalog")
    .select("id,name,category,price,minutes")
    .order("name");

  if (error) {
    console.warn("sbFetchRepairCatalog:", error.message);

    return null;
  }

  return (data || []).map((r) => ({ ...r, price: Number(r.price) })) as RepairCatalogItem[];
}

export interface CatalogDevice { brand: string; category: string; name: string }

/** The POS device list (about 1,900 models), used to suggest exact models in the booking form. */
export async function sbFetchDeviceCatalog(): Promise<CatalogDevice[] | null> {
  const sb = getClient();

  if (!sb) return null;
  const { data, error } = await sb.from("public_device_catalog").select("brand,category,name").limit(5000);

  if (error) {
    console.warn("sbFetchDeviceCatalog:", error.message);

    return null;
  }

  return (data || []) as CatalogDevice[];
}

export interface PosInventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  low: number | null;
  cost: number;
  price: number;
}

export async function sbFetchPosInventory(): Promise<PosInventoryItem[] | null> {
  const sb = getClient();

  if (!sb) return null;
  const { data, error } = await sb
    .from("inventory")
    .select("id,name,sku,category,stock,low,cost,price")
    .neq("item_type", "service")
    .order("name");

  if (error) {
    console.error("sbFetchPosInventory:", error);

    return null;
  }

  return (data || []).map((r) => ({
    ...r,
    stock: r.stock ?? 0,
    cost: Number(r.cost) || 0,
    price: Number(r.price) || 0,
  })) as PosInventoryItem[];
}

export async function sbSetInventoryStock(id: number, stock: number): Promise<boolean> {
  const sb = getClient();

  if (!sb) return false;
  const { error } = await sb.from("inventory").update({ stock }).eq("id", id);

  if (error) console.error("sbSetInventoryStock:", error);

  return !error;
}

export interface StockMovement {
  id: number;
  itemName: string;
  delta: number;
  stockAfter: number;
  reason: string;
  ref: string | null;
  createdAt: string;
}

export async function sbFetchStockMovements(limit = 12): Promise<StockMovement[] | null> {
  const sb = getClient();

  if (!sb) return null;
  const { data, error } = await sb
    .from("stock_movements")
    .select("id,item_name,delta,stock_after,reason,ref,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("sbFetchStockMovements:", error.message);

    return null;
  }

  return (data || []).map((r) => ({
    id: r.id,
    itemName: r.item_name,
    delta: r.delta,
    stockAfter: r.stock_after,
    reason: r.reason,
    ref: r.ref,
    createdAt: r.created_at,
  }));
}

export async function sbInsertBooking(booking: Booking): Promise<BookingResult> {
  const sb = getClient();
  const viaRpc = await sbSubmitBookingRpc(booking);

  if (viaRpc) return viaRpc;
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

      return { ok: data.ok === true };
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
      visit_location_type:
        (booking.visit_location_type as string) ||
        (booking.visitLocationType as string) ||
        null,
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

    return { ok: true };
  }

  return { ok: true };
}

export async function sbFetchBookings(): Promise<{
  data: BookingRecord[] | null;
  error: string | null;
}> {
  const sb = getClient();

  if (!sb) return { data: null, error: "Supabase client not configured." };
  const { data, error } = await sb
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("sbFetchBookings:", error);

    return { data: null, error: error.message || "Unknown error." };
  }

  return { data: data as BookingRecord[], error: null };
}

const VALID_BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no-show",
];

export async function sbUpdateBookingStatus(
  id: string | number,
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
  id: string | number,
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
  if (p.inventoryId !== undefined) out.inventory_id = p.inventoryId;

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
    inventoryId: row.inventory_id ?? null,
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
  // !== undefined (not a truthy check) — parentId: null is a real value
  // meaning "clear this subcategory back to top-level", not "unset".
  if (c.parentId !== undefined) out.parent_id = c.parentId;

  return out;
}

function dbToCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    icon: row.icon || "Star",
    sortOrder: row.sort_order || 0,
    parentId: row.parent_id ?? null,
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


export interface RepairStatus {
  ticket: number;
  device: string;
  status: string;
  stage: "received" | "in_progress" | "waiting_parts" | "ready" | "done";
  updated_at: string;
}

/** Public repair lookup: a ticket number plus the last 4 digits of the phone on file. Only the stage comes back. */
export async function sbLookupRepairStatus(ticket: number, phone: string): Promise<{ ok: true; repair: RepairStatus } | { ok: false; reason: "invalid" | "not_found" | "locked" | "busy" | "error" }> {
  const sb = getClient();

  if (!sb) return { ok: false, reason: "error" };
  const { data, error } = await sb.rpc("lookup_repair_status", { p_ticket: ticket, p_phone: phone });

  if (error || !data) return { ok: false, reason: "error" };
  if (!data.ok) return { ok: false, reason: data.reason ?? "not_found" };

  return { ok: true, repair: data as RepairStatus };
}
