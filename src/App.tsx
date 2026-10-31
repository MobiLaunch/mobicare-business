import { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import ToastBridge from "@/components/ToastBridge";

import { useProductStore, useCartStore } from "@/lib/store";
import { useSiteStore, applyAppearance, getEffectiveColorScheme } from "@/lib/siteStore";
import { installPreviewBridge } from "@/lib/previewBridge";
import { installTextOverrides } from "@/lib/textOverrides";
import { sbFetchSiteSettings, isSupabaseConfigured } from "@/lib/supabase";
import PublicLayout from "@/layouts/PublicLayout";
const CheckoutDrawer = lazy(() => import("@/components/CheckoutDrawer"));
import RequireAdmin from "@/components/RequireAdmin";
const Login = lazy(() => import("@/pages/Login"));
const RepairStatus = lazy(() => import("@/pages/RepairStatus"));
const CustomPage = lazy(() => import("@/pages/CustomPage"));
import Home from "@/pages/Home";
const Shop = lazy(() => import("@/pages/Shop"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const OrderSuccess = lazy(() => import("@/pages/OrderSuccess"));
const Repairs = lazy(() => import("@/pages/Repairs"));
const Protection = lazy(() => import("@/pages/Protection"));
const About = lazy(() => import("@/pages/About"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Returns = lazy(() => import("@/pages/Returns"));
const Shipping = lazy(() => import("@/pages/Shipping"));
const Refunds = lazy(() => import("@/pages/Refunds"));
const AdminLogin = lazy(() => import("@/admin/AdminLogin"));
const AdminLayout = lazy(() => import("@/admin/AdminLayout"));
const AdminProducts = lazy(() => import("@/admin/Products"));
// Lazy-loaded: pulls in lucide-react's full ~1,767-icon dictionary for its
// icon picker (~120KB gzipped), which would otherwise ship to every visitor
// in the main bundle even though only admins ever load this page.
const AdminCategories = lazy(() => import("@/admin/Categories"));
const AdminOrders = lazy(() => import("@/admin/Orders"));
const AdminBookings = lazy(() => import("@/admin/Bookings"));
const AdminDashboard = lazy(() => import("@/admin/Dashboard"));
const AdminSettings = lazy(() => import("@/admin/Settings"));
const SiteContent = lazy(() => import("@/admin/SiteContent"));
const Signup = lazy(() => import("@/pages/Signup"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Account = lazy(() => import("@/pages/Account"));

let storeInitPromise: Promise<void> | null = null;
let siteContentInitPromise: Promise<void> | null = null;

function StoreInit() {
  const init = useProductStore((s) => s.init);
  const appearance = useSiteStore((s) => s.appearance);
  const viewerColorScheme = useSiteStore((s) => s.viewerColorScheme);

  useEffect(() => { installPreviewBridge(); installTextOverrides(); }, []);
  useEffect(() => {
    if (appearance) applyAppearance({ ...appearance, colorScheme: viewerColorScheme ?? appearance.colorScheme });
  }, [appearance, viewerColorScheme]);
  useEffect(() => {
    if (!storeInitPromise) storeInitPromise = init().catch((error) => console.error("Product store initialization failed:", error));
    if (!siteContentInitPromise) {
      siteContentInitPromise = (async () => {
        const legacy = ["#13522b", "#0a3318", "#13522B", "#0A3318"];
        const sanitize = (app: Record<string, unknown>) => {
          const out = { ...app };
          if (legacy.includes(String(out.accentColor ?? ""))) out.accentColor = "";
          if (legacy.includes(String(out.accentColorDeep ?? ""))) out.accentColorDeep = "";
          return out;
        };
        if (isSupabaseConfigured()) {
          const dbContent = await sbFetchSiteSettings();
          const defaults = useSiteStore.getState();
          if (dbContent) {
            const appearance = sanitize({ ...(defaults.appearance as unknown as Record<string, unknown>), ...(dbContent.appearance ?? {}) }) as unknown as typeof defaults.appearance;
            const merged = { ...defaults, ...dbContent, appearance, deviceManufacturers: dbContent.deviceManufacturers || defaults.deviceManufacturers || [], houseCallPricing: dbContent.houseCallPricing || defaults.houseCallPricing, repairServices: dbContent.repairServices || defaults.repairServices, seo: dbContent.seo || defaults.seo, social: dbContent.social || defaults.social, footer: dbContent.footer || defaults.footer, ctaStrip: dbContent.ctaStrip || defaults.ctaStrip };
            useSiteStore.setState(merged as Partial<ReturnType<typeof useSiteStore.getState>>);
            applyAppearance({ ...merged.appearance, colorScheme: getEffectiveColorScheme(merged) });
          } else if (defaults.appearance) applyAppearance({ ...defaults.appearance, colorScheme: getEffectiveColorScheme(defaults) });
        } else {
          const current = useSiteStore.getState();
          if (current.appearance) applyAppearance({ ...current.appearance, colorScheme: getEffectiveColorScheme(current) });
        }
      })().catch((error) => console.error("Site content initialization failed:", error));
    }
  }, [init]);
  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [pathname]);
  return null;
}

function CartRedirect() {
  const navigate = useNavigate();
  const setCartDrawerOpen = useCartStore((s) => s.setCartDrawerOpen);
  useEffect(() => { setCartDrawerOpen(true); navigate("/", { replace: true }); }, [navigate, setCartDrawerOpen]);
  return null;
}

// Mounts the (Stripe-heavy) checkout drawer only once the cart has been opened.
function CheckoutMount() {
  const open = useCartStore((s) => s.cartDrawerOpen);
  const [armed, setArmed] = useState(false);

  useEffect(() => { if (open) setArmed(true); }, [open]);

  return armed ? <Suspense fallback={null}><CheckoutDrawer /></Suspense> : null;
}

// After first paint, warm the chunks a visitor is most likely to navigate to so
// route changes feel instant instead of waiting on the network.
function usePrefetchRoutes() {
  useEffect(() => {
    const loaders = [
      () => import("@/pages/Shop"),
      () => import("@/components/BookingWizard"),
      () => import("@/pages/Repairs"),
      () => import("@/pages/ProductDetail"),
      () => import("@/pages/Protection"),
      () => import("@/components/CheckoutDrawer"),
    ];
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    let timer = 0;
    let i = 0;

    // One chunk per idle slot, spaced out, so parsing a chunk never lands
    // in the middle of a scroll or an animation.
    const next = () => {
      if (i >= loaders.length) return;
      const load = loaders[i++];
      const go = () => { void load().catch(() => undefined); timer = window.setTimeout(next, 700); };

      if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 3000 });
      else go();
    };

    timer = window.setTimeout(next, 4000);

    return () => window.clearTimeout(timer);
  }, []);
}

export default function App() {
  usePrefetchRoutes();

  return <>
    <ToastBridge><StoreInit /><ScrollToTop /><CheckoutMount /></ToastBridge>
    <Suspense fallback={<div aria-label="Loading" className="mc-spinner" role="status" />}>
    <Routes>
      <Route element={<PublicLayout />}>
        <Route element={<Home />} path="/" />
        <Route element={<Shop />} path="/shop" />
        <Route element={<ProductDetail />} path="/product/:id" />
        <Route element={<CartRedirect />} path="/cart" />
        <Route element={<OrderSuccess />} path="/order-success" />
        <Route element={<Repairs />} path="/repairs" />
        <Route element={<RepairStatus />} path="/repair-status" />
        <Route element={<CustomPage />} path="/p/:slug" />
        <Route element={<Protection />} path="/protection" />
        <Route element={<About />} path="/about" />
        <Route element={<Privacy />} path="/privacy" />
        <Route element={<Returns />} path="/returns" />
        <Route element={<Returns />} path="/exchanges" />
        <Route element={<Shipping />} path="/shipping" />
        <Route element={<Refunds />} path="/refunds" />
        <Route element={<Login />} path="/login" />
        <Route element={<Signup />} path="/signup" />
        <Route element={<ForgotPassword />} path="/forgot-password" />
        <Route element={<ResetPassword />} path="/reset-password" />
        <Route element={<Account />} path="/account" />
      </Route>
      <Route element={<Navigate replace to="/protection" />} path="/insurance" />
      <Route element={<Navigate replace to="/login" />} path="/signin" />
      <Route element={<Navigate replace to="/login" />} path="/sign-in" />
      <Route path="/admin"><Route index element={<Navigate replace to="login" />} /><Route element={<AdminLogin />} path="login" /><Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}><Route element={<AdminDashboard />} path="dashboard" /><Route element={<AdminProducts />} path="products" /><Route element={<AdminCategories />} path="categories" /><Route element={<AdminOrders />} path="orders" /><Route element={<AdminBookings />} path="bookings" /><Route element={<AdminSettings />} path="settings" /><Route element={<SiteContent />} path="content" /><Route index element={<Navigate replace to="dashboard" />} /></Route></Route>
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
    </Suspense>
  </>;
}
