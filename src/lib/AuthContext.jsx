import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  getClient,
  getCustomerProfile,
  getCurrentUser,
  signInWithEmail,
  signOut,
  signUpWithEmail,
} from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = async (userId) => {
    if (!userId) {
      setProfile(null)
      return null
    }

    const { data } = await getCustomerProfile(userId)
    setProfile(data || null)
    return data || null
  }

  useEffect(() => {
    const sb = getClient()

    if (!sb) {
      setLoading(false)
      return undefined
    }

    let mounted = true

    sb.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      const nextUser = data?.session?.user || null
      setUser(nextUser)
      if (nextUser) await refreshProfile(nextUser.id)
      setLoading(false)
    })

    const { data: listener } = sb.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      const nextUser = session?.user || null
      setUser(nextUser)

      if (nextUser) {
        // Defer the profile query so auth state processing is not blocked.
        setTimeout(() => {
          if (mounted) refreshProfile(nextUser.id)
        }, 0)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => {
      mounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isVerified: !!user?.email_confirmed_at,

    async signIn(email, password) {
      const result = await signInWithEmail(email, password)
      if (!result.error && result.data?.user) {
        setUser(result.data.user)
        await refreshProfile(result.data.user.id)
      }
      return result
    },

    async signUp(email, password, metadata) {
      return signUpWithEmail(email, password, metadata)
    },

    async logout() {
      await signOut()
      setUser(null)
      setProfile(null)
    },

    async reloadProfile() {
      return refreshProfile(user?.id)
    },
  }), [user, profile, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
