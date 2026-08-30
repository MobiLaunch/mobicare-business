// Shared domain types for the business-logic layer ported from the original
// Mobicare app (src/lib/*.js). Kept intentionally pragmatic: fields match
// what the app's own code actually reads/writes, not a full DB schema model.
// Raw Supabase row shapes are typed as Record<string, any> at the boundary
// (see supabase.ts's dbToX/xToDb converters) rather than hand-modeling every
// table — the goal is type-safety for app code that *consumes* this layer,
// not a generated-types-level guarantee about the database itself.

export interface ShippingDays {
  min: number;
  max: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  sku: string;
  description: string;
  images: string[];
  tags: string[];
  featured: boolean;
  active: boolean;
  weight: number;
  shippingDays: ShippingDays;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
}

// A cart item is a full Product snapshot at add-time, plus a quantity — see
// useCartStore's addItem() in lib/store.ts, which spreads the whole product.
// (Caught via tsc while porting CartDrawer: this type was originally defined
// too narrowly, missing `images`/`stock`/etc. that the UI actually reads.)
export interface CartItem extends Product {
  qty: number;
}

export interface OrderCustomer {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface Order {
  id: string;
  status: string;
  createdAt: string;
  customer: OrderCustomer;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface Booking {
  id?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

// The real shape of a booking row as read back from Supabase by the admin
// Bookings page — snake_case DB columns, distinct from the loose `Booking`
// type above (which models BookingWizard's camelCase submission payload;
// the server-side /api/create-booking endpoint maps one to the other).
// Caught while porting Bookings.tsx: the original `Booking` type's index
// signature would have let every field silently type as `unknown` here.
export interface BookingRecord {
  id: string;
  status: string;
  created_at?: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  service: string;
  device_type: string;
  device_model: string;
  appt_date: string;
  appt_time: string;
  issue?: string;
  notes?: string;
  visit_type?: string;
  visit_location_type?: string;
  home_address?: string;
}

export interface CustomerProfile {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export type ToastType = "success" | "error" | "info" | "warning";

export type ColorScheme = "light" | "dark";

export interface SiteAppearance {
  colorScheme: ColorScheme;
  accentColor: string;
  accentColorDeep: string;
  bgBase: string;
  bgSurface: string;
  bgElevated: string;
  fontFamily: string;
  fontUrl?: string;
}
