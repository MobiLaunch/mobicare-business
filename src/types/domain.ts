// Shared domain types for the business-logic layer ported from the original
// Mobicare app (src/lib/*.js). Kept intentionally pragmatic: fields match
// what the app's own code actually reads/writes, not a full DB schema model.

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
  parentId: string | null;
}

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
  shippingMethod?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

export interface Booking {
  id?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface BookingRecord {
  id: string | number;
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
  user_id?: string | null;
}

export interface CustomerChatMessage {
  id: number;
  profile_id?: string;
  user_id?: string | null;
  customer_user_id?: string | null;
  customer_id?: number | null;
  ticket_id?: number | null;
  customer_name: string;
  customer_email: string;
  channel?: string;
  subject?: string;
  direction: "inbound" | "outbound";
  body: string;
  read: boolean;
  delivered?: boolean;
  created_at: string;
}

export interface CustomerProfile {
  id: string;
  full_name: string;
  phone: string;
  created_at?: string;
  updated_at?: string;
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
  radiusControl?: string;
  radiusSurface?: string;
  texture?: string;
  motion?: string;
  spinner?: string;
}
