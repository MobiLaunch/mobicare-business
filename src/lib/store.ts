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

import { SEED_PRODUCTS } from "@/data/seed-products";
import { SEED_CATEGORIES } from "@/data/seed-categories";
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
  sbUpdateBookingStatus,
  sbRefundOrder,
  signInWithEmail,
  signOut as sbSignOut,
  getSession,
  checkIsAdmin,
  updatePassword as sbUpdatePassword,
  sendPasswordReset as sbSendPasswordReset,
} from "./supabase";

export { SEED_PRODUCTS, SEED_CATEGORIES };

// ─── Cart (always local, synced against live catalog on load) ──────────────
interface CartState {
  items: CartItem[];
  cartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
  addItem: (product: Product, qty?: number) => boolean;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number, maxStock?: number) => void;
  syncWithCatalog: (products: Product[]) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      cartDrawerOpen: false,
      setCartDrawerOpen: (open) => set({ cartDrawerOpen: open }),
      addItem: (product, qty = 1) => {
        if (!product || !product.active || product.stock < 1 || qty < 1)
          return false;
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
      syncWithCatalog: (products) => {
        const current = get().items;
        if (!current.length || !products.length) return;

        let changed = false;
        const synced: CartItem[] = [];

        for (const item of current) {
          const live = products.find((p) => p.id === item.id);
          if (!live || !live.active || live.stock < 1) {
            changed = true;
            continue;
          }
          const nextQty = Math.min(item.qty, live.stock);
          if (
            nextQty !== item.qty ||
            live.price !== item.price ||
            live.name !== item.name ||
            live.stock !== item.stock
          ) {
            changed = true;
          }
          synced.push({ ...item, ...live, qty: nextQty });
        }

        if (changed) set({ items: synced });
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
let productStoreInitPromise: Promise<void> | null = null;
const initialHasSupabase = isSupabaseConfigured();

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
  addCategory: (data: Partial<Category>) => Promise<Category>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addOrder: (
    order: Partial<Order>,
    alreadyPersisted?: boolean,
  ) => Promise<Order>;
  updateOrderStatus: (id: string, status: string) => Promise<void>;
  updateBookingStatus: (
    id: string | number,
    status: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  refundOrder: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: initialHasSupabase ? [] : SEED_PRODUCTS,
      categories: initialHasSupabase ? [] : SEED_CATEGORIES,
      orders: [],

      loading: initialHasSupabase,
      loadError: null,
      usingSupabase: initialHasSupabase,

      init: async () => {
        if (!productStoreInitPromise) {
          productStoreInitPromise = (async () => {
            if (!isSupabaseConfigured()) {
              set({
                usingSupabase: false,
                loading: false,
                products: get().products.length
                  ? get().products
                  : SEED_PRODUCTS,
                categories: get().categories.length
                  ? get().categories
                  : SEED_CATEGORIES,
              });

              return;
            }

            set({ loading: true, loadError: null, usingSupabase: true });

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
                products,
                categories: categories ?? [],
                orders: orders ?? [],
                usingSupabase: true,
                loading: false,
              });
              useCartStore.getState().syncWithCatalog(products);
            } catch (e) {
              set({
                loadError: e instanceof Error ? e.message : String(e),
                loading: false,
                usingSupabase: false,
              });
            }
          })();
        }

        try {
          await productStoreInitPromise;
        } finally {
          productStoreInitPromise = null;
        }
      },

      refresh: async () => {
        if (!isSupabaseConfigured()) return;
        const [products, categories, orders] = await Promise.all([
          sbFetchProducts(),
          sbFetchCategories(),
          sbFetchOrders(),
        ]);

        if (products) {
          set({ products, usingSupabase: true });
          useCartStore.getState().syncWithCatalog(products);
        }
        if (categories) set({ categories });
        if (orders) set({ orders });
      },

      getProduct: (id) => get().products.find((p) => p.id === id),
      getByCategory: (c) =>
        get().products.filter((p) => p.category === c && p.active),
      getFeatured: () => get().products.filter((p) => p.featured && p.active),

      // ── products CRUD (real error checking + rollback) ──
      addProduct: async (data) => {
        const product: Product = {
          id: data.id || uuidv4(),
          name: data.name || "",
          category: data.category || "",
          price: data.price ?? 0,
          comparePrice: data.comparePrice ?? null,
          stock: data.stock ?? 0,
          sku: data.sku || "",
          description: data.description || "",
          images: data.images || [],
          tags: data.tags || [],
          featured: data.featured ?? false,
          active: data.active ?? true,
          weight: data.weight ?? 0.2,
          shippingDays: data.shippingDays || { min: 3, max: 7 },
        };

        if (isSupabaseConfigured()) {
          const { data: saved, error } = await sbInsertProduct(product);
          if (error || !saved) {
            throw new Error(error || "Failed to save product to database.");
          }
          set({ products: [saved, ...get().products] });
          return saved;
        }

        set({ products: [product, ...get().products] });
        return product;
      },

      updateProduct: async (id, data) => {
        const prev = get().products;
        set({
          products: prev.map((p) => (p.id === id ? { ...p, ...data } : p)),
        });

        if (isSupabaseConfigured()) {
          const res = await sbUpdateProduct(id, data);
          if (!res.ok) {
            set({ products: prev });
            throw new Error(res.error || "Failed to update product.");
          }
        }
      },

      deleteProduct: async (id) => {
        const prev = get().products;
        set({ products: prev.filter((p) => p.id !== id) });

        if (isSupabaseConfigured()) {
          const res = await sbDeleteProduct(id);
          if (!res.ok) {
            set({ products: prev });
            throw new Error(res.error || "Failed to delete product.");
          }
        }
      },

      // ── categories CRUD (real error checking + rollback) ──
      addCategory: async (data) => {
        const cat: Category = {
          id:
            data.id ||
            (data.name ?? "")
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, ""),
          name: data.name || "",
          description: data.description || "",
          icon: data.icon || "Shapes",
          sortOrder: data.sortOrder ?? get().categories.length,
          parentId: data.parentId ?? null,
        };

        if (isSupabaseConfigured()) {
          const { data: saved, error } = await sbInsertCategory(cat);
          if (error || !saved) {
            throw new Error(error || "Failed to create category.");
          }
          set({ categories: [...get().categories, saved] });
          return saved;
        }

        set({ categories: [...get().categories, cat] });
        return cat;
      },

      updateCategory: async (id, data) => {
        const prev = get().categories;
        set({
          categories: prev.map((c) => (c.id === id ? { ...c, ...data } : c)),
        });

        if (isSupabaseConfigured()) {
          const res = await sbUpdateCategory(id, data);
          if (!res.ok) {
            set({ categories: prev });
            throw new Error(res.error || "Failed to update category.");
          }
        }
      },

      deleteCategory: async (id) => {
        const prev = get().categories;
        set({
          categories: prev
            .filter((c) => c.id !== id)
            .map((c) => (c.parentId === id ? { ...c, parentId: null } : c)),
        });

        if (isSupabaseConfigured()) {
          const res = await sbDeleteCategory(id);
          if (!res.ok) {
            set({ categories: prev });
            throw new Error(res.error || "Failed to delete category.");
          }
        }
      },

      // ── orders ──
      addOrder: async (order, alreadyPersisted = false) => {
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
        if (!alreadyPersisted && isSupabaseConfigured()) {
          const saved = await sbInsertOrder(o);

          if (saved)
            set({
              orders: get().orders.map((x) => (x.id === o.id ? saved : x)),
            });
        }

        return o;
      },

      updateOrderStatus: async (id, status) => {
        const prev = get().orders;
        set({
          orders: prev.map((o) => (o.id === id ? { ...o, status } : o)),
        });

        if (isSupabaseConfigured()) {
          const res = await sbUpdateOrderStatus(id, status);
          if (!res.ok) {
            set({ orders: prev });
            throw new Error(res.error || "Failed to update order status.");
          }
        }
      },

      updateBookingStatus: async (id, status) => {
        if (!isSupabaseConfigured()) return { ok: true };
        return sbUpdateBookingStatus(id, status);
      },

      refundOrder: async (id) => {
        const result = await sbRefundOrder(id);
        if (result.ok) await get().refresh();

        return result;
      },
    }),
    {
      name: "mobicare-store",
      partialize: (s) =>
        s.usingSupabase || isSupabaseConfigured()
          ? {}
          : {
              products: s.products,
              categories: s.categories,
            },
      merge: (persistedState, currentState) => {
        if (isSupabaseConfigured()) {
          return {
            ...currentState,
            products: [],
            categories: [],
            loading: true,
            usingSupabase: true,
          };
        }
        return {
          ...currentState,
          ...(persistedState as Partial<ProductState>),
        };
      },
      version: 4,
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== "object")
          return persistedState;
        const safeState = { ...(persistedState as Record<string, unknown>) };

        delete safeState.orders;
        if (version < 4 || isSupabaseConfigured()) {
          delete safeState.products;
          delete safeState.categories;
        }

        return safeState;
      },
    },
  ),
);

// ─── Admin auth (staff_users is_admin RPC + persisted brute-force lockout) ─
export const isLocalAuthAvailable =
  import.meta.env.DEV && Boolean(import.meta.env.VITE_LOCAL_ADMIN_PW);

const LOCKOUT_STORAGE_KEY = "mobicare-admin-lockout";

function loadLockoutState(): {
  loginAttempts: number;
  lockedUntil: number | null;
} {
  try {
    if (typeof localStorage === "undefined")
      return { loginAttempts: 0, lockedUntil: null };
    const raw = localStorage.getItem(LOCKOUT_STORAGE_KEY);
    if (!raw) return { loginAttempts: 0, lockedUntil: null };
    const parsed = JSON.parse(raw) as {
      loginAttempts?: number;
      lockedUntil?: number | null;
    };
    const now = Date.now();
    const lockedUntil =
      typeof parsed.lockedUntil === "number" && parsed.lockedUntil > now
        ? parsed.lockedUntil
        : null;
    const loginAttempts =
      typeof parsed.loginAttempts === "number" && parsed.loginAttempts > 0
        ? parsed.loginAttempts
        : 0;
    return { loginAttempts, lockedUntil };
  } catch {
    return { loginAttempts: 0, lockedUntil: null };
  }
}

function saveLockoutState(loginAttempts: number, lockedUntil: number | null) {
  try {
    if (typeof localStorage === "undefined") return;
    if (loginAttempts === 0 && !lockedUntil) {
      localStorage.removeItem(LOCKOUT_STORAGE_KEY);
    } else {
      localStorage.setItem(
        LOCKOUT_STORAGE_KEY,
        JSON.stringify({ loginAttempts, lockedUntil }),
      );
    }
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

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

const initialLockout = loadLockoutState();

export const useAdminStore = create<AdminState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  loginAttempts: initialLockout.loginAttempts,
  lockedUntil: initialLockout.lockedUntil,
  authMode: "supabase",

  restoreSession: async () => {
    const hydrated = loadLockoutState();
    if (
      hydrated.loginAttempts !== get().loginAttempts ||
      hydrated.lockedUntil !== get().lockedUntil
    ) {
      set(hydrated);
    }

    if (!isSupabaseConfigured()) {
      set((state) => ({
        authMode: isLocalAuthAvailable ? "local" : "unavailable",
        isAuthenticated: isLocalAuthAvailable ? state.isAuthenticated : false,
        user: isLocalAuthAvailable ? state.user : null,
      }));

      return;
    }

    set({ authMode: "supabase" });

    try {
      const session = await getSession();
      if (!session) {
        set({ isAuthenticated: false, user: null });
        return;
      }

      // CRITICAL: Verify staff_users allowlist via is_admin() RPC.
      // Never sign a regular customer out of AuthContext here — just keep
      // useAdminStore.isAuthenticated = false so customers cannot access /admin/*.
      const isAdmin = await checkIsAdmin();
      if (!isAdmin) {
        set({ isAuthenticated: false, user: null });
        return;
      }

      set({
        isAuthenticated: true,
        user: session.user,
      });
    } catch (error) {
      console.error("Admin session restore failed:", error);
      set({
        isAuthenticated: false,
        user: null,
      });
    }
  },

  login: async (emailOrPassword, passwordArg) => {
    const persisted = loadLockoutState();
    const loginAttempts = persisted.loginAttempts;
    const lockedUntil = persisted.lockedUntil;

    if (lockedUntil && Date.now() < lockedUntil) {
      const secsLeft = Math.ceil((lockedUntil - Date.now()) / 1000);
      set({ loginAttempts, lockedUntil });
      return { ok: false, locked: true, secsLeft };
    }

    const recordFailure = (errorMsg?: string): LoginResult => {
      const attempts = loginAttempts + 1;
      if (attempts >= 5) {
        const until = Date.now() + 30_000;
        saveLockoutState(0, until);
        set({ loginAttempts: 0, lockedUntil: until });
        return { ok: false, locked: true, secsLeft: 30, error: errorMsg };
      }
      saveLockoutState(attempts, null);
      set({ loginAttempts: attempts, lockedUntil: null });
      return {
        ok: false,
        locked: false,
        attemptsLeft: 5 - attempts,
        error: errorMsg,
      };
    };

    if (isSupabaseConfigured()) {
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
        return recordFailure(error.message);
      }

      const isAdmin = await checkIsAdmin();
      if (!isAdmin) {
        await sbSignOut();
        set({ isAuthenticated: false, user: null });
        return recordFailure("Administrator privileges required.");
      }

      saveLockoutState(0, null);
      set({
        isAuthenticated: true,
        user: data?.user ?? null,
        loginAttempts: 0,
        lockedUntil: null,
      });

      return { ok: true };
    }

    if (!isLocalAuthAvailable) {
      return {
        ok: false,
        error: "Admin authentication is unavailable. Configure Supabase Auth.",
      };
    }

    const password = passwordArg || emailOrPassword;
    const localPassword = import.meta.env.VITE_LOCAL_ADMIN_PW as string;

    if (password === localPassword) {
      saveLockoutState(0, null);
      set({
        isAuthenticated: true,
        user: { email: "local-admin" },
        loginAttempts: 0,
        lockedUntil: null,
      });

      return { ok: true, localMode: true };
    }

    return recordFailure("Incorrect credentials.");
  },

  logout: async () => {
    if (isSupabaseConfigured()) await sbSignOut();
    useProductStore.setState({ orders: [] });
    set({ isAuthenticated: false, user: null });
  },

  changePassword: async (newPassword) => {
    if (!isSupabaseConfigured()) {
      return {
        error: "Password changes require Supabase Auth to be configured.",
      };
    }
    const { error } = await sbUpdatePassword(newPassword);

    return { error };
  },

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
interface ToastStoreState {
  add: (message: string, type?: ToastType) => string;
  remove: (id: string) => void;
}

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
