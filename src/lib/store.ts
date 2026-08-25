import type {
  Product,
  Category,
  Order,
  CartItem,
  ToastType,
} from "@/types/domain";
import type { User } from "@supabase/supabase-js";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { toast } from "@heroui/react";

import {
  isSupabaseConfigured,
  sbFetchProducts,
  sbInsertProduct,
  sbUpdateProduct,
  sbDeleteProduct,
  sbFetchCategories,
  sbInsertCategory,
  sbUpdateCategory,
  sbDeleteCategory,
  sbFetchOrders,
  sbInsertOrder,
  sbUpdateOrderStatus,
  signInWithEmail,
  signOut as sbSignOut,
  getSession,
  updatePassword as sbUpdatePassword,
  sendPasswordReset as sbSendPasswordReset,
} from "./supabase";

// ─── Seed data (used locally when Supabase not connected) ──────────────────
// NOTE: These are DEMO/SEED products meant as starting placeholders —
// replace with real inventory via the admin Products page before launch.
// The image URLs below point to specific Unsplash photo IDs that have not
// been individually verified to load correctly or show accurate content
// for each product (the same class of bug that broke the homepage repair
// photos — see Home.jsx REPAIR_VISUALS comment). Swap these for verified,
// self-hosted, or confirmed-working product photos before going live.
export const SEED_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "MagSafe Wireless Charger 15W",
    category: "chargers",
    price: 34.99,
    comparePrice: 49.99,
    stock: 24,
    sku: "CHG-MAG-15W",
    images: [
      "https://images.unsplash.com/photo-1609592179791-5b2f37d4c6e1?w=600&q=80",
    ],
    description:
      "Ultra-fast 15W MagSafe compatible wireless charger with LED indicator. Works with iPhone 12 and later.",
    tags: ["wireless", "magsafe", "iphone"],
    featured: true,
    active: true,
    weight: 0.2,
    shippingDays: { min: 3, max: 5 },
  },
  {
    id: "p2",
    name: "GaN 65W USB-C Wall Charger",
    category: "chargers",
    price: 29.99,
    comparePrice: null,
    stock: 18,
    sku: "CHG-GAN-65W",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    ],
    description:
      "Compact GaN technology. Charge laptop, phone, and tablet simultaneously with 3 ports.",
    tags: ["usb-c", "gan", "fast-charge"],
    featured: true,
    active: true,
    weight: 0.15,
    shippingDays: { min: 3, max: 5 },
  },
  {
    id: "p3",
    name: "Tempered Glass Screen Protector — iPhone 15 Pro",
    category: "screen-protectors",
    price: 14.99,
    comparePrice: 24.99,
    stock: 50,
    sku: "SP-IP15P-TG",
    images: [
      "https://images.unsplash.com/photo-1512499617640-c2f999099c66?w=600&q=80",
    ],
    description:
      "9H hardness, anti-fingerprint coating. Perfect fit with case-friendly edges. Pack of 2.",
    tags: ["iphone", "glass", "9h"],
    featured: false,
    active: true,
    weight: 0.05,
    shippingDays: { min: 2, max: 4 },
  },
  {
    id: "p4",
    name: "Privacy Screen Protector — Samsung Galaxy S24",
    category: "screen-protectors",
    price: 18.99,
    comparePrice: null,
    stock: 32,
    sku: "SP-SGS24-PV",
    images: [
      "https://images.unsplash.com/photo-1621330396173-e41b1cafd17f?w=600&q=80",
    ],
    description:
      "180° privacy filter with anti-blue light. Compatible with in-screen fingerprint sensor.",
    tags: ["samsung", "privacy", "galaxy"],
    featured: false,
    active: true,
    weight: 0.05,
    shippingDays: { min: 2, max: 4 },
  },
  {
    id: "p5",
    name: "Military-Grade Phone Case — iPhone 15",
    category: "cases",
    price: 22.99,
    comparePrice: 39.99,
    stock: 15,
    sku: "CS-IP15-MIL",
    images: [
      "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&q=80",
    ],
    description:
      "12ft drop protection, wireless charging compatible, raised bezels. MIL-STD-810G certified.",
    tags: ["iphone", "rugged", "military"],
    featured: true,
    active: true,
    weight: 0.1,
    shippingDays: { min: 3, max: 6 },
  },
  {
    id: "p6",
    name: "Clear MagSafe Case — iPhone 15 Pro Max",
    category: "cases",
    price: 19.99,
    comparePrice: null,
    stock: 28,
    sku: "CS-IP15PM-CLR",
    images: [
      "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=600&q=80",
    ],
    description:
      "Ultra-clear polycarbonate with MagSafe ring. Anti-yellowing technology. Slim profile.",
    tags: ["iphone", "clear", "magsafe"],
    featured: false,
    active: true,
    weight: 0.08,
    shippingDays: { min: 3, max: 5 },
  },
  {
    id: "p7",
    name: "USB-C Braided Cable 6ft",
    category: "cables",
    price: 12.99,
    comparePrice: null,
    stock: 60,
    sku: "CBL-USBC-6FT",
    images: [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
    ],
    description:
      "240W PD fast charging, 40Gbps data transfer. Tangle-resistant braided nylon.",
    tags: ["usb-c", "cable", "240w"],
    featured: false,
    active: true,
    weight: 0.12,
    shippingDays: { min: 2, max: 4 },
  },
  {
    id: "p8",
    name: "MFi Lightning to USB-C Cable 3-Pack",
    category: "cables",
    price: 24.99,
    comparePrice: 34.99,
    stock: 40,
    sku: "CBL-LTG-3PK",
    images: [
      "https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?w=600&q=80",
    ],
    description:
      "Apple MFi certified. 3ft, 6ft, 10ft lengths included. Braided nylon construction.",
    tags: ["lightning", "mfi", "apple", "pack"],
    featured: true,
    active: true,
    weight: 0.18,
    shippingDays: { min: 3, max: 5 },
  },
  {
    id: "p9",
    name: "Wireless Earbuds Pro ANC",
    category: "audio",
    price: 79.99,
    comparePrice: 119.99,
    stock: 12,
    sku: "AUD-WEB-ANC",
    images: [
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80",
    ],
    description:
      "Hybrid active noise cancellation, 32hr battery life, multipoint Bluetooth 5.3.",
    tags: ["wireless", "anc", "earbuds"],
    featured: true,
    active: true,
    weight: 0.25,
    shippingDays: { min: 4, max: 7 },
  },
  {
    id: "p10",
    name: "20,000mAh Power Bank",
    category: "power",
    price: 44.99,
    comparePrice: 59.99,
    stock: 20,
    sku: "PWR-PB-20K",
    images: [
      "https://images.unsplash.com/photo-1609592179791-5b2f37d4c6e1?w=600&q=80",
    ],
    description:
      "65W PD output, charges laptop. 3 USB-C + 2 USB-A ports. LCD display.",
    tags: ["power-bank", "portable", "20000"],
    featured: false,
    active: true,
    weight: 0.45,
    shippingDays: { min: 4, max: 7 },
  },
  {
    id: "p11",
    name: "Phone Stand + Wireless Charger Combo",
    category: "accessories",
    price: 38.99,
    comparePrice: 54.99,
    stock: 16,
    sku: "ACC-STND-WC",
    images: [
      "https://images.unsplash.com/photo-1563203369-26f2e4a5ccf7?w=600&q=80",
    ],
    description:
      "Adjustable desk stand with built-in 15W wireless charging pad. Aluminum + fabric build.",
    tags: ["stand", "wireless", "desk"],
    featured: false,
    active: true,
    weight: 0.35,
    shippingDays: { min: 3, max: 6 },
  },
  {
    id: "p12",
    name: "Screen Cleaning Kit",
    category: "accessories",
    price: 9.99,
    comparePrice: null,
    stock: 100,
    sku: "ACC-CLN-KIT",
    images: [
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80",
    ],
    description:
      "Microfiber cloth + spray solution. Safe for all screens. 2oz travel-size bottle.",
    tags: ["cleaning", "microfiber", "spray"],
    featured: false,
    active: true,
    weight: 0.08,
    shippingDays: { min: 2, max: 4 },
  },
];

export const SEED_CATEGORIES: Category[] = [
  {
    id: "chargers",
    name: "Chargers",
    icon: "Zap",
    description: "Fast charging solutions",
    sortOrder: 0,
  },
  {
    id: "cases",
    name: "Cases",
    icon: "Shield",
    description: "Protection for every style",
    sortOrder: 1,
  },
  {
    id: "screen-protectors",
    name: "Screen Protectors",
    icon: "Layers",
    description: "Guard your display",
    sortOrder: 2,
  },
  {
    id: "cables",
    name: "Cables",
    icon: "Cable",
    description: "Connect everything",
    sortOrder: 3,
  },
  {
    id: "audio",
    name: "Audio",
    icon: "Headphones",
    description: "Sound without wires",
    sortOrder: 4,
  },
  {
    id: "power",
    name: "Power Banks",
    icon: "Battery",
    description: "Power on the go",
    sortOrder: 5,
  },
  {
    id: "accessories",
    name: "Accessories",
    icon: "Star",
    description: "Desk & lifestyle gear",
    sortOrder: 6,
  },
];

// ─── Cart (always local) ───────────────────────────────────────────────────
interface CartState {
  items: CartItem[];
  cartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
  addItem: (product: Product, qty?: number) => boolean;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number, maxStock?: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      cartDrawerOpen: false,
      setCartDrawerOpen: (open) => set({ cartDrawerOpen: open }),
      addItem: (product, qty = 1) => {
        if (!product || product.stock < 1 || qty < 1) return false;
        const { items } = get();
        const existing = items.find((i) => i.id === product.id);
        const currentQty = existing?.qty || 0;
        const nextQty = Math.min(currentQty + qty, product.stock);

        if (nextQty <= currentQty) return false;
        if (existing) {
          set({
            items: items.map((i) =>
              i.id === product.id ? { ...i, ...product, qty: nextQty } : i,
            ),
          });
        } else {
          set({ items: [...items, { ...product, qty: nextQty }] });
        }

        return true;
      },
      removeItem: (id) =>
        set({ items: get().items.filter((i) => i.id !== id) }),
      updateQty: (id, qty, maxStock) => {
        if (qty <= 0) {
          get().removeItem(id);

          return;
        }
        const capped = maxStock != null ? Math.min(qty, maxStock) : qty;

        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, qty: capped } : i,
          ),
        });
      },
      clearCart: () => set({ items: [] }),
    }),
    {
      name: "mobicare-cart",
      partialize: (s) => ({ items: s.items }),
    },
  ),
);

// ─── Product / order store ─────────────────────────────────────────────────
// When Supabase is configured:
//   - reads come from Supabase
//   - writes go to Supabase AND update local state immediately (optimistic)
// When not configured:
//   - everything lives in localStorage via Zustand persist
//   - identical API surface so the rest of the app never knows the difference

let productStoreInitPromise: Promise<void> | null = null;

interface ProductState {
  products: Product[];
  categories: Category[];
  orders: Order[];
  loading: boolean;
  loadError: string | null;
  usingSupabase: boolean;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  getProduct: (id: string) => Product | undefined;
  getByCategory: (c: string) => Product[];
  getFeatured: () => Product[];
  addProduct: (data: Partial<Product>) => Promise<Product>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (data: Partial<Category>) => Promise<void>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addOrder: (order: Partial<Order>) => Promise<Order>;
  updateOrderStatus: (id: string, status: string) => Promise<void>;
}

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: SEED_PRODUCTS,
      categories: SEED_CATEGORIES,
      orders: [],

      // ── loading state ──
      loading: false,
      loadError: null,
      usingSupabase: false,

      // ── bootstrap: called once on app mount ──
      init: async () => {
        if (productStoreInitPromise) {
          return productStoreInitPromise;
        }

        productStoreInitPromise = (async () => {
          if (!isSupabaseConfigured()) {
            set({ usingSupabase: false });

            return;
          }

          set({ loading: true, loadError: null });

          try {
            const [products, categories, orders] = await Promise.all([
              sbFetchProducts(),
              sbFetchCategories(),
              sbFetchOrders(),
            ]);

            if (products === null) {
              throw new Error(
                "Could not reach Supabase — check URL / anon key.",
              );
            }

            set({
              products: products ?? get().products,
              categories: categories ?? get().categories,
              orders: orders ?? get().orders,
              usingSupabase: true,
              loading: false,
            });
          } catch (e) {
            set({
              loadError: e instanceof Error ? e.message : String(e),
              loading: false,
              usingSupabase: false,
            });
          }
        })();

        try {
          await productStoreInitPromise;
        } finally {
          productStoreInitPromise = null;
        }
      },

      // ── refresh from Supabase ──
      refresh: async () => {
        if (!isSupabaseConfigured()) return;
        const [products, categories, orders] = await Promise.all([
          sbFetchProducts(),
          sbFetchCategories(),
          sbFetchOrders(),
        ]);

        if (products) set({ products, usingSupabase: true });
        if (categories) set({ categories });
        if (orders) set({ orders });
      },

      // ── selectors ──
      getProduct: (id) => get().products.find((p) => p.id === id),
      getByCategory: (c) =>
        get().products.filter((p) => p.category === c && p.active),
      getFeatured: () => get().products.filter((p) => p.featured && p.active),

      // ── products CRUD ──
      addProduct: async (data) => {
        const product = { ...data, id: uuidv4(), active: true } as Product;

        // optimistic
        set({ products: [product, ...get().products] });
        if (isSupabaseConfigured()) {
          const saved = await sbInsertProduct(product);

          if (saved) {
            set({
              products: get().products.map((p) =>
                p.id === product.id ? saved : p,
              ),
            });

            return saved;
          }
        }

        return product;
      },

      updateProduct: async (id, data) => {
        // optimistic
        set({
          products: get().products.map((p) =>
            p.id === id ? { ...p, ...data } : p,
          ),
        });
        if (isSupabaseConfigured()) {
          await sbUpdateProduct(id, data);
        }
      },

      deleteProduct: async (id) => {
        set({ products: get().products.filter((p) => p.id !== id) });
        if (isSupabaseConfigured()) {
          await sbDeleteProduct(id);
        }
      },

      // ── categories CRUD ──
      addCategory: async (data) => {
        const cat = {
          ...data,
          id: data.id || (data.name ?? "").toLowerCase().replace(/\s+/g, "-"),
        } as Category;

        set({ categories: [...get().categories, cat] });
        if (isSupabaseConfigured()) {
          const saved = await sbInsertCategory(cat);

          if (saved)
            set({
              categories: get().categories.map((c) =>
                c.id === cat.id ? saved : c,
              ),
            });
        }
      },

      updateCategory: async (id, data) => {
        set({
          categories: get().categories.map((c) =>
            c.id === id ? { ...c, ...data } : c,
          ),
        });
        if (isSupabaseConfigured()) {
          await sbUpdateCategory(id, data);
        }
      },

      deleteCategory: async (id) => {
        set({ categories: get().categories.filter((c) => c.id !== id) });
        if (isSupabaseConfigured()) {
          await sbDeleteCategory(id);
        }
      },

      // ── orders ──
      addOrder: async (order) => {
        const rawStatus = (order.status || "").toLowerCase().trim();
        const validStatuses = [
          "paid",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
          "refunded",
        ];
        const status = validStatuses.includes(rawStatus) ? rawStatus : "paid";

        const o = {
          ...order,
          id: order.id || uuidv4(),
          createdAt: order.createdAt || new Date().toISOString(),
          status,
        } as Order;

        set({ orders: [o, ...get().orders] });
        if (isSupabaseConfigured()) {
          const saved = await sbInsertOrder(o);

          if (saved)
            set({
              orders: get().orders.map((x) => (x.id === o.id ? saved : x)),
            });
        }

        return o;
      },

      updateOrderStatus: async (id, status) => {
        set({
          orders: get().orders.map((o) => (o.id === id ? { ...o, status } : o)),
        });
        if (isSupabaseConfigured()) {
          await sbUpdateOrderStatus(id, status);
        }
      },
    }),
    {
      name: "mobicare-store",
      // Don't persist transient flags
      partialize: (s) => ({
        products: s.products,
        categories: s.categories,
      }),
      version: 2,
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== "object")
          return persistedState;
        const safeState = { ...(persistedState as Record<string, unknown>) };

        delete safeState.orders;

        return safeState;
      },
    },
  ),
);

// ─── Admin auth ────────────────────────────────────────────────────────────

export const isLocalAuthAvailable =
  import.meta.env.DEV && Boolean(import.meta.env.VITE_LOCAL_ADMIN_PW);

interface AdminUser {
  email: string;
}

interface LoginResult {
  ok: boolean;
  locked?: boolean;
  secsLeft?: number;
  error?: string;
  attemptsLeft?: number;
  localMode?: boolean;
}

interface AdminState {
  isAuthenticated: boolean;
  user: User | AdminUser | null;
  loginAttempts: number;
  lockedUntil: number | null;
  authMode: "supabase" | "local" | "unavailable";
  restoreSession: () => Promise<void>;
  login: (
    emailOrPassword: string,
    passwordArg?: string,
  ) => Promise<LoginResult>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<{ error?: unknown }>;
  sendReset: (email: string) => Promise<{ error?: unknown }>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  loginAttempts: 0,
  lockedUntil: null,
  authMode: "supabase",

  // ── Session restore on app load ──
  restoreSession: async () => {
    if (!isSupabaseConfigured()) {
      set({
        authMode: isLocalAuthAvailable ? "local" : "unavailable",
        isAuthenticated: false,
        user: null,
      });

      return;
    }

    set({ authMode: "supabase" });

    try {
      const session = await getSession();

      set({
        isAuthenticated: !!session,
        user: session?.user ?? null,
      });
    } catch (error) {
      console.error("Admin session restore failed:", error);
      set({
        isAuthenticated: false,
        user: null,
      });
    }
  },

  // ── Login ──
  login: async (emailOrPassword, passwordArg) => {
    const { loginAttempts, lockedUntil } = get();

    // Lockout check
    if (lockedUntil && Date.now() < lockedUntil) {
      const secsLeft = Math.ceil((lockedUntil - Date.now()) / 1000);

      return { ok: false, locked: true, secsLeft };
    }

    // ── Supabase Auth path ──
    if (isSupabaseConfigured()) {
      // emailOrPassword = email, passwordArg = password
      const email =
        typeof emailOrPassword === "string" && emailOrPassword.includes("@")
          ? emailOrPassword
          : null;
      const password =
        passwordArg ||
        (typeof emailOrPassword === "string" && !email
          ? emailOrPassword
          : null);

      if (!email || !password) {
        return { ok: false, error: "Enter your email and password." };
      }

      const { data, error } = await signInWithEmail(email, password);

      if (error) {
        const attempts = loginAttempts + 1;

        if (attempts >= 5) {
          set({ loginAttempts: 0, lockedUntil: Date.now() + 30_000 });

          return { ok: false, locked: true, secsLeft: 30 };
        }
        set({ loginAttempts: attempts });

        return {
          ok: false,
          locked: false,
          attemptsLeft: 5 - attempts,
          error: error.message,
        };
      }
      set({
        isAuthenticated: true,
        user: data?.user ?? null,
        loginAttempts: 0,
        lockedUntil: null,
      });

      return { ok: true };
    }

    // ── Development-only local fallback ──
    if (!isLocalAuthAvailable) {
      return {
        ok: false,
        error: "Admin authentication is unavailable. Configure Supabase Auth.",
      };
    }

    const password = passwordArg || emailOrPassword;
    const localPassword = import.meta.env.VITE_LOCAL_ADMIN_PW as string;

    if (password === localPassword) {
      set({
        isAuthenticated: true,
        user: { email: "local-admin" },
        loginAttempts: 0,
        lockedUntil: null,
      });

      return { ok: true, localMode: true };
    }

    const attempts = loginAttempts + 1;

    if (attempts >= 5) {
      set({ loginAttempts: 0, lockedUntil: Date.now() + 30_000 });

      return { ok: false, locked: true, secsLeft: 30 };
    }
    set({ loginAttempts: attempts });

    return { ok: false, locked: false, attemptsLeft: 5 - attempts };
  },

  // ── Logout ──
  logout: async () => {
    if (isSupabaseConfigured()) await sbSignOut();
    useProductStore.setState({ orders: [] });
    set({ isAuthenticated: false, user: null });
  },

  // ── Change password (Supabase Auth only) ──
  changePassword: async (newPassword) => {
    if (!isSupabaseConfigured()) {
      return {
        error: "Password changes require Supabase Auth to be configured.",
      };
    }
    const { error } = await sbUpdatePassword(newPassword);

    return { error };
  },

  // ── Send password reset email ──
  sendReset: async (email) => {
    if (!isSupabaseConfigured()) {
      return {
        error: "Password reset requires Supabase Auth to be configured.",
      };
    }
    const { error } = await sbSendPasswordReset(email);

    return { error };
  },
}));

// ─── Toasts ────────────────────────────────────────────────────────────────
// `add`/`remove` keep the exact same signature every call site already uses
// (`useToastStore(s => s.add)` → `addToast(message, type)`), but now delegate
// to HeroUI v3's real toast queue instead of a hand-rolled array + setTimeout.
// Rendering/positioning/auto-dismiss timing is now HeroUI's, via <ToastProvider />
// in components/Toast.tsx — this store no longer holds any toast state itself.
interface ToastStoreState {
  add: (message: string, type?: ToastType) => string;
  remove: (id: string) => void;
}

// HeroUI's real toast variant union is 'default' | 'accent' | 'success' |
// 'warning' | 'danger' — there's no 'info', so the app's 'info' type (the
// default when none is passed) maps to HeroUI's 'default' variant.
function toToastVariant(
  type: ToastType,
): "default" | "success" | "warning" | "danger" {
  if (type === "error") return "danger";
  if (type === "info") return "default";

  return type;
}

export const useToastStore = create<ToastStoreState>(() => ({
  add: (message, type = "info") =>
    toast(message, { variant: toToastVariant(type) }),
  remove: (id) => toast.close(id),
}));
