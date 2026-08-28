import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ToastProvider } from "@heroui/react";

import { useProductStore, useCartStore } from "@/lib/store";
import { useSiteStore, applyAppearance } from "@/lib/siteStore";
import { sbFetchSiteSettings, isSupabaseConfigured } from "@/lib/supabase";
import PublicLayout from "@/layouts/PublicLayout";
import RequireAdmin from "@/components/RequireAdmin";
import CartDrawer from "@/components/CartDrawer";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import ProductDetail from "@/pages/ProductDetail";
import OrderSuccess from "@/pages/OrderSuccess";
import Repairs from "@/pages/Repairs";
import Protection from "@/pages/Protection";
import About from "@/pages/About";
import AdminLogin from "@/admin/AdminLogin";
import AdminLayout from "@/admin/AdminLayout";
import AdminProducts from "@/admin/Products";
import AdminCategories from "@/admin/Categories";
import AdminOrders from "@/admin/Orders";
import AdminBookings from "@/admin/Bookings";
import AdminDashboard from "@/admin/Dashboard";
import AdminSettings from "@/admin/Settings";
import SiteContent from "@/admin/SiteContent";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Account from "@/pages/Account";

let storeInitPromise: Promise<void> | null = null;
let siteContentInitPromise: Promise<void> | null = null;

function StoreInit() {
  const init = useProductStore((s) => s.init);
  const appearance = useSiteStore((s) => s.appearance);

  useEffect(() => {
    if (appearance) applyAppearance(appearance);
  }, [appearance]);

  useEffect(() => {
    if (!storeInitPromise) {
      storeInitPromise = init().catch((error) => {
        console.error("Product store initialization failed:", error);
      });
    }

    if (!siteContentInitPromise) {
      siteContentInitPromise = (async () => {
        const LEGACY_ACCENT_HEXES = ["#13522b", "#0a3318", "#13522B", "#0A3318"];

        function sanitizeAppearance(app: Record<string, unknown>) {
          const out = { ...app };
          if (LEGACY_ACCENT_HEXES.includes(String(out.accentColor ?? ""))) out.accentColor = "";
          if (LEGACY_ACCENT_HEXES.includes(String(out.accentColorDeep ?? ""))) out.accentColorDeep = "";
          return out;
        }

        if (isSupabaseConfigured()) {
          const dbContent = await sbFetchSiteSettings();
          const defaults = useSiteStore.getState();

          if (dbContent) {
            const rawAppearance = (dbContent.appearance ?? {}) as Record<string, unknown>;
            const sanitizedAppearance = sanitizeAppearance({
              ...(defaults.appearance as unknown as Record<string, unknown>),
              ...rawAppearance,
            }) as unknown as typeof defaults.appearance;
            const mergedContent = {
              ...defaults,
              ...dbContent,
              appearance: sanitizedAppearance,
              deviceTypes: dbContent.deviceTypes || defaults.deviceTypes || [],
              seo: dbContent.seo || defaults.seo,
              social: dbContent.social || defaults.social,
              footer: dbContent.footer || defaults.footer,
              ctaStrip: dbContent.ctaStrip || defaults.ctaStrip,
            };

            useSiteStore.setState(mergedContent as Partial<ReturnType<typeof useSiteStore.getState>>);
            if (mergedContent.appearance) applyAppearance(mergedContent.appearance);
          } else {
            const current = useSiteStore.getState();
            if (current.appearance) applyAppearance(current.appearance);
          }
        } else {
          const current = useSiteStore.getState();
          if (current.appearance) applyAppearance(current.appearance);
        }
      })().catch((error) => {
        console.error("Site content initialization failed:", error);
      });
    }
  }, [init]);

  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

function CartRedirect() {
  const navigate = useNavigate();
  const setCartDrawerOpen = useCartStore((s) => s.setCartDrawerOpen);

  useEffect(() => {
    setCartDrawerOpen(true);
    navigate("/", { replace: true });
  }, [navigate, setCartDrawerOpen]);

  return null;
}

export default function App() {
  return (
    <>
      <StoreInit />
      <ScrollToTop />
      <ToastProvider />
      <CartDrawer />
      <Routes>
        <Route element={<PublicLayout><Home /></PublicLayout>} path="/" />
        <Route element={<PublicLayout><Shop /></PublicLayout>} path="/shop" />
        <Route element={<PublicLayout><ProductDetail /></PublicLayout>} path="/product/:id" />
        <Route element={<PublicLayout><CartRedirect /></PublicLayout>} path="/cart" />
        <Route element={<PublicLayout><OrderSuccess /></PublicLayout>} path="/order-success" />
        <Route element={<PublicLayout><Repairs /></PublicLayout>} path="/repairs" />
        <Route element={<PublicLayout><Protection /></PublicLayout>} path="/protection" />
        <Route element={<Navigate replace to="/protection" />} path="/insurance" />
        <Route element={<PublicLayout><About /></PublicLayout>} path="/about" />
        <Route element={<PublicLayout><Login /></PublicLayout>} path="/login" />
        <Route element={<Navigate replace to="/login" />} path="/signin" />
        <Route element={<Navigate replace to="/login" />} path="/sign-in" />
        <Route element={<PublicLayout><Signup /></PublicLayout>} path="/signup" />
        <Route element={<PublicLayout><ForgotPassword /></PublicLayout>} path="/forgot-password" />
        <Route element={<PublicLayout><ResetPassword /></PublicLayout>} path="/reset-password" />
        <Route element={<PublicLayout><Account /></PublicLayout>} path="/account" />
        <Route path="/admin">
          <Route index element={<Navigate replace to="login" />} />
          <Route element={<AdminLogin />} path="login" />
          <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
            <Route element={<AdminDashboard />} path="dashboard" />
            <Route element={<AdminProducts />} path="products" />
            <Route element={<AdminCategories />} path="categories" />
            <Route element={<AdminOrders />} path="orders" />
            <Route element={<AdminBookings />} path="bookings" />
            <Route element={<AdminSettings />} path="settings" />
            <Route element={<SiteContent />} path="content" />
            <Route index element={<Navigate replace to="dashboard" />} />
          </Route>
        </Route>
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </>
  );
}
