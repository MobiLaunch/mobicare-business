import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useProductStore, useCartStore } from './lib/store'
import { useSiteStore, applyAppearance } from './lib/siteStore'
import { sbFetchSiteSettings, isSupabaseConfigured, sbUpsertSiteSettings } from './lib/supabase'
import { AuthProvider } from './lib/AuthContext'

import Header from './components/Header'
import Footer from './components/Footer'
import BottomNav from './components/BottomNav'
import Toast from './components/Toast'
import RequireAdmin from './components/RequireAdmin'

import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import OrderSuccess from './pages/OrderSuccess'
import Repairs from './pages/Repairs'
import About from './pages/About'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Account from './pages/Account'

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
    <div className="public-layout-wrapper">
      <Header />
      {children}
      <Footer />
      <BottomNav />
    </div>
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
          if (dbContent.appearance) applyAppearance(dbContent.appearance)
        } else {
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
          if (current.appearance) applyAppearance(current.appearance)
        }
      } else {
        const current = useSiteStore.getState()
        if (current.appearance) applyAppearance(current.appearance)
      }
    }
    syncSiteContent()
  }, [])
  return null
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

function CartRedirect() {
  const navigate = useNavigate()
  const setCartDrawerOpen = useCartStore(s => s.setCartDrawerOpen)
  useEffect(() => {
    setCartDrawerOpen(true)
    navigate('/', { replace: true })
  }, [])
  return null
}

function RepairsRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate('/', { replace: true })
    setTimeout(() => {
      const el = document.getElementById('repairs')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 150)
  }, [])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreInit />
        <ScrollToTop />
        <Toast />
        <Routes>
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/shop" element={<PublicLayout><Shop /></PublicLayout>} />
          <Route path="/product/:id" element={<PublicLayout><ProductDetail /></PublicLayout>} />
          <Route path="/cart" element={<PublicLayout><CartRedirect /></PublicLayout>} />
          <Route path="/order-success" element={<PublicLayout><OrderSuccess /></PublicLayout>} />
          <Route path="/repairs" element={<PublicLayout><Repairs /></PublicLayout>} />
          <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
          <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
          <Route path="/signin" element={<Navigate to="/login" replace />} />
          <Route path="/sign-in" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
          <Route path="/signup" element={<PublicLayout><Signup /></PublicLayout>} />
          <Route path="/forgot-password" element={<PublicLayout><ForgotPassword /></PublicLayout>} />
          <Route path="/reset-password" element={<PublicLayout><ResetPassword /></PublicLayout>} />
          <Route path="/account" element={<PublicLayout><Account /></PublicLayout>} />

          <Route path="/admin">
            <Route index element={<Navigate to="login" replace />} />
            <Route path="login" element={<AdminLogin />} />
            <Route element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="categories" element={<Categories />} />
              <Route path="orders" element={<Orders />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="settings" element={<Settings />} />
              <Route path="content" element={<SiteContent />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

