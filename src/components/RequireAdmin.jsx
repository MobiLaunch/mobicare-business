import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAdminStore } from '../lib/store'

export default function RequireAdmin({ children }) {
  const isAuthenticated = useAdminStore(s => s.isAuthenticated)
  const restoreSession  = useAdminStore(s => s.restoreSession)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // On first load, try to restore a Supabase session before deciding to redirect
    const check = async () => {
      await restoreSession?.()
      setChecking(false)
    }
    check()
  }, [])

  // While checking session, show nothing (avoids flash-redirect)
  if (checking) return null

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  return children
}
