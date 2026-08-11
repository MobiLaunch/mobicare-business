import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useProductStore } from './lib/store'
import { useSiteStore, applyAppearance } from './lib/siteStore'
import { sbFetchSiteSettings, isSupabaseConfigured, sbUpsertSiteSettings } from './lib/supabase'

// Layout
import Header from './components/Header'
import Footer from './components/Footer'
import BottomNav from './components/BottomNav'
import Toast from './components/Toast'
import RequireAdmin from './components/RequireAdmin'

// Public pages
import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import OrderSuccess from './pages/OrderSuccess'
import Repairs from './pages/Repairs'
import About from './pages/About'

// Admin
import AdminLogin from './admin/AdminLogin'
import AdminLayout from './admin/AdminLayout'
import Dashboard from './admin/Dashboard'
import Products from './admin/Products'
import Categories from './admin/Categories'
import Orders from './admin/Orders'
import Bookings from './admin/Bookings'
import Settings from './admin/Settings'
import SiteContent from './admin/SiteContent'

function PublicLayout({ children }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
      <BottomNav />
    </>
  )
}

function StoreInit() {
  const init = useProductStore(s => s.init)
  useEffect(() => {
    init()

    const syncSiteContent = async () => {
      if (isSupabaseConfigured()) {
        const dbContent = await sbFetchSiteSettings()
        if (dbContent) {
          if (!dbContent.deviceTypes) {
            const defaults = useSiteStore.getState()
            dbContent.deviceTypes = defaults.deviceTypes || []
          }
          const defaults = useSiteStore.getState()
          for (const key of ['seo', 'social', 'footer', 'ctaStrip']) {
            if (!dbContent[key]) dbContent[key] = defaults[key]
          }
          useSiteStore.setState(dbContent)
          if (dbContent.appearance) {
            applyAppearance(dbContent.appearance)
          }
        } else {
          // If no content in DB, seed current local content
          const current = useSiteStore.getState()
          const cleanState = {
            brand: current.brand,
            hero: current.hero,
            trustItems: current.trustItems,
            repairBanner: current.repairBanner,
            repairServices: current.repairServices,
            about: current.about,
            business: current.business,
            appearance: current.appearance,
            seo: current.seo,
            social: current.social,
            footer: current.footer,
            ctaStrip: current.ctaStrip,
            deviceTypes: current.deviceTypes || [],
          }
          await sbUpsertSiteSettings(cleanState)
          if (current.appearance) {
            applyAppearance(current.appearance)
          }
        }
      } else {
        // Fallback: apply local state appearance
        const current = useSiteStore.getState()
        if (current.appearance) {
          applyAppearance(current.appearance)
        }
      }
    }
    syncSiteContent()
  }, [])
  return null
}

// Scroll to top on every route change
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <StoreInit />
      <ScrollToTop />
      <Toast />
      <Routes>
        {/* Public */}
        <Route path="/"              element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/shop"          element={<PublicLayout><Shop /></PublicLayout>} />
        <Route path="/product/:id"   element={<PublicLayout><ProductDetail /></PublicLayout>} />
        <Route path="/cart"          element={<PublicLayout><Cart /></PublicLayout>} />
        <Route path="/order-success" element={<PublicLayout><OrderSuccess /></PublicLayout>} />
        <Route path="/repairs"       element={<PublicLayout><Repairs /></PublicLayout>} />
        <Route path="/about"         element={<PublicLayout><About /></PublicLayout>} />

        {/* Admin */}
        <Route path="/admin">
          <Route index        element={<Navigate to="login" replace />} />
          <Route path="login" element={<AdminLogin />} />
          <Route element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }>
            <Route path="dashboard"  element={<Dashboard />} />
            <Route path="products"   element={<Products />} />
            <Route path="categories" element={<Categories />} />
            <Route path="orders"     element={<Orders />} />
            <Route path="bookings"   element={<Bookings />} />
            <Route path="settings"   element={<Settings />} />
            <Route path="content"    element={<SiteContent />} />
            <Route index             element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
