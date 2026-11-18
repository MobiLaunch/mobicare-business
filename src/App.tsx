import { Suspense, lazy, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Spinner, ToastProvider } from "@heroui/react";

import { useProductStore, useCartStore } from "@/lib/store";
import {
  useSiteStore,
  applyAppearance,
  getEffectiveColorScheme,
  postDesignStudioMessage,
} from "@/lib/siteStore";
import { setRuntimeShopConfig } from "@/lib/config";
import {
  sbFetchSiteSettings,
  sbFetchShopConfig,
  isSupabaseConfigured,
} from "@/lib/supabase";
import PublicLayout from "@/layouts/PublicLayout";
import RequireAdmin from "@/components/RequireAdmin";
import CheckoutDrawer from "@/components/CheckoutDrawer";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import ProductDetail from "@/pages/ProductDetail";
import OrderSuccess from "@/pages/OrderSuccess";
import Repairs from "@/pages/Repairs";
import Protection from "@/pages/Protection";
import About from "@/pages/About";
import CustomPage from "@/pages/CustomPage";
import PolicyPage from "@/pages/PolicyPage";
import RepairStatus from "@/pages/RepairStatus";
import AdminLogin from "@/admin/AdminLogin";
import AdminLayout from "@/admin/AdminLayout";
import AdminProducts from "@/admin/Products";
const AdminCategories = lazy(() => import("@/admin/Categories"));
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
  const viewerColorScheme = useSiteStore((s) => s.viewerColorScheme);
  const isPreview = useSiteStore((s) => s.isPreview);

  useEffect(() => {
    if (appearance) {
      applyAppearance({
        ...appearance,
        colorScheme: getEffectiveColorScheme({
          appearance,
          viewerColorScheme,
          isPreview,
        }),
      });
    }
  }, [appearance, viewerColorScheme, isPreview]);

  // Listen for live NovaOps DesignStudio postMessage preview drafts
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.source === "novaops-design") {
        useSiteStore.getState().applyDesignStudioPreview(e.data);
      }
    };
    window.addEventListener("message", onMessage);

    // Announce readiness to parent NovaOps DesignStudio iframe
    postDesignStudioMessage({ ready: true });

    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!storeInitPromise) {
      storeInitPromise = init().catch((error) =>
        console.error("Product store initialization failed:", error),
      );
    }
    if (!siteContentInitPromise) {
      siteContentInitPromise = (async () => {
        if (isSupabaseConfigured()) {
          const [dbContent, shopCfg] = await Promise.all([
            sbFetchSiteSettings(),
            sbFetchShopConfig(),
          ]);

          if (shopCfg) {
            setRuntimeShopConfig(shopCfg);
          }

          if (dbContent && !useSiteStore.getState().isPreview) {
            useSiteStore.getState().hydrateFromDb(dbContent);
          } else {
            const cur = useSiteStore.getState();
            if (cur.appearance) {
              applyAppearance({
                ...cur.appearance,
                colorScheme: getEffectiveColorScheme(cur),
              });
            }
          }
          // Re-announce readiness after DB load so DesignStudio's draft wins over saved DB state
          postDesignStudioMessage({ ready: true });
        } else {
          const current = useSiteStore.getState();
          if (current.appearance) {
            applyAppearance({
              ...current.appearance,
              colorScheme: getEffectiveColorScheme(current),
            });
          }
        }
      })().catch((error) =>
        console.error("Site content initialization failed:", error),
      );
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
      <CheckoutDrawer />
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner size="lg" />
          </div>
        }
      >
        <Routes>
          <Route
            element={
              <PublicLayout>
                <Home />
              </PublicLayout>
            }
            path="/"
          />
          <Route
            element={
              <PublicLayout>
                <Shop />
              </PublicLayout>
            }
            path="/shop"
          />
          <Route
            element={
              <PublicLayout>
                <ProductDetail />
              </PublicLayout>
            }
            path="/product/:id"
          />
          <Route
            element={
              <PublicLayout>
                <CartRedirect />
              </PublicLayout>
            }
            path="/cart"
          />
          <Route
            element={
              <PublicLayout>
                <OrderSuccess />
              </PublicLayout>
            }
            path="/order-success"
          />
          <Route
            element={
              <PublicLayout>
                <Repairs />
              </PublicLayout>
            }
            path="/repairs"
          />
          <Route
            element={
              <PublicLayout>
                <Protection />
              </PublicLayout>
            }
            path="/protection"
          />
          <Route element={<Navigate replace to="/protection" />} path="/insurance" />
          <Route
            element={
              <PublicLayout>
                <About />
              </PublicLayout>
            }
            path="/about"
          />
          <Route
            element={
              <PublicLayout>
                <CustomPage />
              </PublicLayout>
            }
            path="/p/:slug"
          />
          <Route
            element={
              <PublicLayout>
                <PolicyPage />
              </PublicLayout>
            }
            path="/privacy"
          />
          <Route
            element={
              <PublicLayout>
                <PolicyPage />
              </PublicLayout>
            }
            path="/terms"
          />
          <Route
            element={
              <PublicLayout>
                <PolicyPage />
              </PublicLayout>
            }
            path="/shipping"
          />
          <Route
            element={
              <PublicLayout>
                <PolicyPage />
              </PublicLayout>
            }
            path="/returns"
          />
          <Route
            element={
              <PublicLayout>
                <PolicyPage />
              </PublicLayout>
            }
            path="/refunds"
          />
          <Route
            element={
              <PublicLayout>
                <PolicyPage />
              </PublicLayout>
            }
            path="/warranty"
          />
          <Route
            element={
              <PublicLayout>
                <RepairStatus />
              </PublicLayout>
            }
            path="/repair-status"
          />
          <Route
            element={
              <PublicLayout>
                <RepairStatus />
              </PublicLayout>
            }
            path="/track"
          />
          <Route
            element={
              <PublicLayout>
                <Login />
              </PublicLayout>
            }
            path="/login"
          />
          <Route element={<Navigate replace to="/login" />} path="/signin" />
          <Route element={<Navigate replace to="/login" />} path="/sign-in" />
          <Route
            element={
              <PublicLayout>
                <Signup />
              </PublicLayout>
            }
            path="/signup"
          />
          <Route
            element={
              <PublicLayout>
                <ForgotPassword />
              </PublicLayout>
            }
            path="/forgot-password"
          />
          <Route
            element={
              <PublicLayout>
                <ResetPassword />
              </PublicLayout>
            }
            path="/reset-password"
          />
          <Route
            element={
              <PublicLayout>
                <Account />
              </PublicLayout>
            }
            path="/account"
          />
          <Route path="/admin">
            <Route index element={<Navigate replace to="login" />} />
            <Route element={<AdminLogin />} path="login" />
            <Route
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
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
      </Suspense>
    </>
  );
}
