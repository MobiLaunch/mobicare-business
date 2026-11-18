import type {
  Product,
  Category,
  Order,
  CustomerProfile,
  Booking,
  BookingRecord,
  CustomerChatMessage,
} from "@/types/domain";
import type { RuntimeShopConfig } from "./config";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// ─── Input sanitization (only for raw HTML/email contexts, NOT DB text) ────
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
let _client: SupabaseClient | null = null;
let _clientUrl: string | null = null;
let _clientKey: string | null = null;

export function getSupabaseConfig() {
  const lsUrl =
    typeof localStorage !== "undefined" ? localStorage.getItem("sb_url") : "";
  const lsKey =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("sb_anon_key")
      : "";
  const url = SUPABASE_URL || lsUrl || "";
  const anonKey = SUPABASE_ANON_KEY || lsKey || "";

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

// ─── Admin Authorization Check (staff_users allowlist via RPC) ─────────────
export async function checkIsAdmin(): Promise<boolean> {
  const sb = getClient();

  if (!sb) return false;
  try {
    const { data, error } = await sb.rpc("is_admin");

    if (error) {
      console.warn("is_admin RPC check failed:", error.message);

      return false;
    }

    return data === true;
  } catch (e) {
    console.warn("is_admin RPC exception:", e);

    return false;
  }
}

// ─── Supabase Auth (General / Admin) ───────────────────────────────────────
export async function signInWithEmail(email: string, password: string) {
  const sb = getClient();

  if (!sb)
    return {
      data: null,
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
  const { error } = await sb.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo: `${window.location.origin}/reset-password`,
    },
  );

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

function isMissingTableError(err: { code?: string; message?: string } | null) {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();

  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    err.code === "42703" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
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

  if (!error && data) {
    return { data: data as CustomerProfile, error: null };
  }

  if (error && !isMissingTableError(error)) {
    return { data: null, error };
  }

  // Fallback when customer_profiles table hasn't been migrated yet
  const { data: userRes } = await sb.auth.getUser();
  const meta = userRes?.user?.user_metadata || {};

  return {
    data: {
      id: userId,
      full_name: String(meta.full_name || ""),
      phone: String(meta.phone || ""),
    },
    error: null,
  };
}

export async function updateCustomerProfile(
  userId: string,
  updates: { full_name?: string; phone?: string; email?: string },
) {
  const sb = getClient();

  if (!sb || !userId) {
    return { data: null, error: { message: "Supabase not configured." } };
  }

  const fullName = updates.full_name?.trim() || "";
  const phone = updates.phone?.trim() || "";

  // Always keep auth user_metadata in sync
  await sb.auth
    .updateUser({
      data: { full_name: fullName, phone },
    })
    .catch(() => null);

  const payload: Record<string, unknown> = {
    id: userId,
    full_name: fullName,
    phone,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from("customer_profiles")
    .upsert(payload, { onConflict: "id" })
    .select()
    .maybeSingle();

  if (error && isMissingTableError(error)) {
    return {
      data: { id: userId, full_name: fullName, phone } as CustomerProfile,
      error: null,
    };
  }

  return { data: (data as CustomerProfile | null) ?? null, error };
}

export async function sbFetchCustomerBookings(userId: string) {
  const sb = getClient();

  if (!sb || !userId) return { data: [], error: null };

  const { data, error } = await sb
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { data: (data as BookingRecord[]) || [], error };
}

export async function sbFetchCustomerOrders(
  userId: string,
): Promise<{ data: Order[]; error: unknown }> {
  const sb = getClient();

  if (!sb || !userId) return { data: [], error: null };

  const { data, error } = await sb
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { data: (data || []).map(dbToOrder), error };
}

// ─── Customer <-> Shop Chat (shared public.messages with NovaOps Messages) ─
export async function sbFetchCustomerChat(
  userId: string,
): Promise<{ data: CustomerChatMessage[]; error: unknown }> {
  const sb = getClient();

  if (!sb || !userId) return { data: [], error: null };

  const { data, error } = await sb
    .from("messages")
    .select("*")
    .eq("channel", "chat")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (!error) {
    return { data: (data as CustomerChatMessage[] | null) || [], error: null };
  }

  // Graceful fallback to legacy customer_messages if messages.user_id isn't migrated yet
  if (isMissingTableError(error)) {
    const legacy = await sb
      .from("customer_messages")
      .select("*")
      .eq("customer_user_id", userId)
      .order("created_at", { ascending: true });

    return {
      data: (legacy.data as CustomerChatMessage[] | null) || [],
      error: legacy.error,
    };
  }

  return { data: [], error };
}

export async function sbSendCustomerChatMessage(
  userId: string,
  customerName: string,
  customerEmail: string,
  body: string,
  customerPhone?: string,
): Promise<{ data: CustomerChatMessage | null; error: unknown }> {
  const sb = getClient();

  if (!sb)
    return { data: null, error: { message: "Supabase not configured." } };

  const cleanBody = body.trim();
  const subject = customerPhone?.trim()
    ? `Website Chat · ${customerPhone.trim()}`
    : "Website Chat";

  const { data, error } = await sb
    .from("messages")
    .insert({
      user_id: userId,
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim(),
      channel: "chat",
      direction: "inbound",
      subject,
      body: cleanBody,
      read: false,
    })
    .select()
    .single();

  if (error && isMissingTableError(error)) {
    const legacy = await sb
      .from("customer_messages")
      .insert({
        customer_user_id: userId,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        direction: "inbound",
        body: cleanBody,
      })
      .select()
      .single();

    return {
      data: (legacy.data as CustomerChatMessage | null) ?? null,
      error: legacy.error,
    };
  }

  return { data: (data as CustomerChatMessage | null) ?? null, error };
}

export async function sbMarkCustomerChatRead(
  userId: string,
  messageIds: number[],
): Promise<void> {
  const sb = getClient();

  if (!sb || !userId || messageIds.length === 0) return;

  await sb
    .from("messages")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("direction", "outbound")
    .in("id", messageIds);
}

export function subscribeCustomerChat(
  userId: string,
  onEvent: (msg: CustomerChatMessage, eventType: string) => void,
): () => void {
  const sb = getClient();

  if (!sb || !userId) return () => {};

  const channel = sb
    .channel(`customer-chat-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = (payload.new || payload.old) as CustomerChatMessage | null;
        if (row && (!row.channel || row.channel === "chat")) {
          onEvent(row, payload.eventType);
        }
      },
    )
    .subscribe();

  return () => {
    void sb.removeChannel(channel);
  };
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

// ─── Media Upload (site-media bucket shared with NovaOps) ──────────────────
export async function sbUploadSiteMedia(
  file: File,
): Promise<{ url: string | null; error?: string }> {
  const sb = getClient();

  if (!sb) return { url: null, error: "Supabase is not configured." };
  if (!file.type.startsWith("image/")) {
    return { url: null, error: "Please select a valid image file." };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { url: null, error: "Images must be 8 MB or smaller." };
  }

  try {
    const ext = (file.name.split(".").pop() || "jpg")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const path = `${new Date().getFullYear()}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await sb.storage.from("site-media").upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

    if (error) return { url: null, error: error.message };

    const { data } = sb.storage.from("site-media").getPublicUrl(path);

    return { url: data.publicUrl };
  } catch (e) {
    return {
      url: null,
      error: e instanceof Error ? e.message : "Upload failed.",
    };
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
): Promise<{ data: Product | null; error?: string }> {
  const sb = getClient();

  if (!sb) return { data: null, error: "Supabase is not configured." };
  const { data, error } = await sb
    .from("products")
    .insert(productToDb(product))
    .select()
    .single();

  if (error) {
    console.error("sbInsertProduct:", error);

    return { data: null, error: error.message };
  }

  return { data: dbToProduct(data) };
}

export async function sbUpdateProduct(
  id: string,
  updates: Partial<Product>,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getClient();

  if (!sb) return { ok: false, error: "Supabase is not configured." };
  const { error } = await sb
    .from("products")
    .update(productToDb(updates))
    .eq("id", id);

  if (error) {
    console.error("sbUpdateProduct:", error);

    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function sbDeleteProduct(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getClient();

  if (!sb) return { ok: false, error: "Supabase is not configured." };
  const { error } = await sb.from("products").delete().eq("id", id);

  if (error) {
    console.error("sbDeleteProduct:", error);

    return { ok: false, error: error.message };
  }

  return { ok: true };
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
): Promise<{ data: Category | null; error?: string }> {
  const sb = getClient();

  if (!sb) return { data: null, error: "Supabase is not configured." };
  const { data, error } = await sb
    .from("categories")
    .insert(categoryToDb(cat))
    .select()
    .single();

  if (error) {
    console.error("sbInsertCategory:", error);

    return { data: null, error: error.message };
  }

  return { data: dbToCategory(data) };
}

export async function sbUpdateCategory(
  id: string,
  updates: Partial<Category>,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getClient();

  if (!sb) return { ok: false, error: "Supabase is not configured." };
  const { error } = await sb
    .from("categories")
    .update(categoryToDb(updates))
    .eq("id", id);

  if (error) {
    console.error("sbUpdateCategory:", error);

    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function sbDeleteCategory(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getClient();

  if (!sb) return { ok: false, error: "Supabase is not configured." };
  const { error } = await sb.from("categories").delete().eq("id", id);

  if (error) {
    console.error("sbDeleteCategory:", error);

    return { ok: false, error: error.message };
  }

  return { ok: true };
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
): Promise<{ ok: boolean; error?: string }> {
  const sb = getClient();

  if (!sb) return { ok: false, error: "Supabase is not configured." };

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

    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function sbRefundOrder(
  orderId: string,
): Promise<{ ok: boolean; error?: string; alreadyRefunded?: boolean }> {
  const sb = getClient();
  const { data: { session } = { session: null } } = sb?.auth
    ? await sb.auth.getSession()
    : { data: { session: null } };

  if (!session?.access_token) {
    return {
      ok: false,
      error: "You must be signed in as an admin to issue a refund.",
    };
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
  } catch (err) {
    if (!(err instanceof TypeError)) {
      throw err;
    }
    console.warn(
      "/api/create-booking unreachable, falling back to direct Supabase insert.",
      err,
    );
  }

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
        (booking.appt_date as string) || (booking.date as string) || "",
      appt_time:
        (booking.appt_time as string) || (booking.time as string) || "",
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
      ...(session?.user?.id ? { user_id: session.user.id } : {}),
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
): Promise<{ ok: boolean; error?: string }> {
  const sb = getClient();

  if (!sb) return { ok: false, error: "Supabase is not configured." };

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

    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function sbUpdateBooking(
  id: string | number,
  updates: Partial<BookingRecord>,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getClient();

  if (!sb) return { ok: false, error: "Supabase is not configured." };
  const { error } = await sb.from("bookings").update(updates).eq("id", id);

  if (error) {
    console.error("sbUpdateBooking:", error);

    return { ok: false, error: error.message };
  }

  return { ok: true };
}

// ─── Master Catalog Sync (services, device_brands, device_models) ──────────
export interface LivePosService {
  id: number | string;
  name: string;
  category?: string;
  description?: string;
  price?: number;
  estimated_minutes?: number;
  duration?: number;
  active?: boolean;
}

export interface LiveDeviceBrand {
  id: number | string;
  name: string;
  icon_url?: string | null;
}

export interface LiveDeviceModel {
  id: number | string;
  brand: string;
  category: string;
  name: string;
}

export async function sbFetchLiveCatalog(): Promise<{
  services: LivePosService[];
  brands: LiveDeviceBrand[];
  models: LiveDeviceModel[];
}> {
  const sb = getClient();

  if (!sb) return { services: [], brands: [], models: [] };

  try {
    const [svcRes, brandRes, modelRes] = await Promise.all([
      sb
        .from("services")
        .select("*")
        .eq("active", true)
        .order("name", { ascending: true }),
      sb.from("device_brands").select("*").order("name", { ascending: true }),
      sb
        .from("device_models")
        .select("*")
        .order("brand", { ascending: true })
        .order("name", { ascending: true }),
    ]);

    return {
      services: (svcRes.error ? [] : (svcRes.data as LivePosService[])) || [],
      brands: (brandRes.error ? [] : (brandRes.data as LiveDeviceBrand[])) || [],
      models: (modelRes.error ? [] : (modelRes.data as LiveDeviceModel[])) || [],
    };
  } catch {
    return { services: [], brands: [], models: [] };
  }
}

// ─── Public Guest Repair Ticket & Order Status Lookups ─────────────────────
export async function sbLookupTicketStatus(
  ticketIdInput: string,
  phoneLast4: string,
): Promise<{ data: Record<string, unknown> | null; error?: string }> {
  const sb = getClient();

  if (!sb) return { data: null, error: "Database connection is not configured." };

  const cleanedTicket = ticketIdInput
    .trim()
    .replace(/^(tkt-|mc-|#)+/i, "")
    .trim();
  const cleanedPhone = phoneLast4.replace(/\D/g, "").slice(-4);

  if (!cleanedTicket) {
    return { data: null, error: "Please enter your repair ticket number." };
  }
  if (cleanedPhone.length !== 4) {
    return {
      data: null,
      error: "Please enter the last 4 digits of your phone number.",
    };
  }

  try {
    const { data, error } = await sb.rpc("lookup_ticket_status", {
      p_ticket_id: cleanedTicket,
      p_phone_last4: cleanedPhone,
    });

    if (error) return { data: null, error: error.message };
    const record = Array.isArray(data) ? data[0] : data;

    if (!record || (typeof record === "object" && Object.keys(record).length === 0)) {
      return {
        data: null,
        error:
          "No matching repair ticket found. Double-check your ticket number and the last 4 digits of your phone number.",
      };
    }

    return { data: record as Record<string, unknown> };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Unable to look up ticket status.",
    };
  }
}

export async function sbLookupOrderStatus(
  orderIdInput: string,
  verifyInput: string,
): Promise<{ data: Record<string, unknown> | null; error?: string }> {
  const sb = getClient();

  if (!sb) return { data: null, error: "Database connection is not configured." };

  const cleanedOrder = orderIdInput.trim().replace(/^#/, "").trim();
  const cleanedVerify = verifyInput.trim();

  if (!cleanedOrder) {
    return { data: null, error: "Please enter your Order ID." };
  }
  if (!cleanedVerify) {
    return {
      data: null,
      error: "Please enter your checkout email address or ZIP code to verify.",
    };
  }

  try {
    const { data, error } = await sb.rpc("lookup_order_status", {
      p_order_id: cleanedOrder,
      p_verify: cleanedVerify,
    });

    if (error) return { data: null, error: error.message };
    const record = Array.isArray(data) ? data[0] : data;

    if (!record || (typeof record === "object" && Object.keys(record).length === 0)) {
      return {
        data: null,
        error:
          "No matching order found. Please check your Order ID and email/ZIP.",
      };
    }

    return { data: record as Record<string, unknown> };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Unable to look up order status.",
    };
  }
}

// ─── Site settings ('mobicare-config' & 'shop-config') ─────────────────────
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

export async function sbFetchShopConfig(): Promise<Partial<RuntimeShopConfig> | null> {
  const sb = getClient();

  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("site_settings")
      .select("content")
      .eq("id", "shop-config")
      .maybeSingle();

    if (error) {
      console.warn("sbFetchShopConfig:", error.message);

      return null;
    }

    return (data?.content as Partial<RuntimeShopConfig>) || null;
  } catch (e) {
    console.warn("sbFetchShopConfig:", e instanceof Error ? e.message : e);

    return null;
  }
}

export async function sbUpsertShopConfig(
  patch: Partial<RuntimeShopConfig>,
): Promise<boolean> {
  const sb = getClient();

  if (!sb) return false;
  try {
    const existing = (await sbFetchShopConfig()) || {};
    const merged = {
      storefrontUrl: "https://www.shopmobicare.com",
      stripePublishableKey: "",
      reviewUrl: "",
      loyalty: {
        enabled: false,
        pointsPerDollar: 1,
        redeemPoints: 100,
        redeemValue: 5,
      },
      ...existing,
      ...patch,
      emailjs: {
        serviceId: "",
        bookingTemplate: "",
        orderTemplate: "",
        publicKey: "",
        ...(existing.emailjs || {}),
        ...(patch.emailjs || {}),
      },
    };
    const { error } = await sb.from("site_settings").upsert({
      id: "shop-config",
      content: merged,
      updated_at: new Date().toISOString(),
    });

    return !error;
  } catch {
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

function dbToProduct(row: Record<string, any>): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: parseFloat(row.price),
    comparePrice:
      row.compare_price != null ? parseFloat(row.compare_price) : null,
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
  if (c.parentId !== undefined) out.parent_id = c.parentId;

  return out;
}

function dbToCategory(row: Record<string, any>): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    icon: row.icon || "Star",
    sortOrder: row.sort_order || 0,
    parentId: row.parent_id ?? null,
  };
}

export function dbToOrder(row: Record<string, any>): Order {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    shippingMethod: row.shipping_method || undefined,
    trackingNumber: row.tracking_number || undefined,
    trackingUrl: row.tracking_url || undefined,
    customer: {
      name: row.customer_name || "",
      email: row.customer_email || "",
      phone: row.customer_phone || "",
      address: row.shipping_address || "",
      city: row.shipping_city || "",
      state: row.shipping_state || "",
      zip: row.shipping_zip || "",
    },
    items: (row.order_items || []).map((i: Record<string, any>) => ({
      id: i.product_id || String(i.id || ""),
      name: i.name,
      price: parseFloat(i.price),
      qty: i.qty,
      category: "",
      comparePrice: null,
      stock: 0,
      sku: "",
      description: "",
      images: [],
      tags: [],
      featured: false,
      active: true,
      weight: 0,
      shippingDays: { min: 3, max: 5 },
    })),
    subtotal: parseFloat(row.subtotal || 0),
    shipping: parseFloat(row.shipping_cost || 0),
    tax: parseFloat(row.tax || 0),
    total: parseFloat(row.total || 0),
  };
}
