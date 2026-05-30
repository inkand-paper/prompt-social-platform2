// src/context/AuthContext.jsx
// Provides user, login(), logout(), refreshToken() to the whole app.
// Currently uses mock auth — swap the API calls for real ones once Django backend is live.

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api, { _setAccessToken, _clearAccessToken } from '../lib/api'
import { connectSocket, disconnectSocket } from '../lib/socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // ── On mount: check if user has an existing session ──────────
  useEffect(() => {
    async function restoreSession() {
      try {
        // Try to get current user. Interceptor will handle refresh if access token is missing but cookie exists.
        const { data } = await api.get('/auth/me/')
        setUser(data)
      } catch (err) {
        // Not logged in or session expired
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    restoreSession()
  }, [])

  // ── login(email, password) ───────────────────────────────────
  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post('/auth/login/', { email, password })
      
      // DRF SimpleJWT returns { access, refresh }. Refresh is in HttpOnly cookie if configured, 
      // but here we get it in body too (or we just use access).
      _setAccessToken(data.access)
      
      // Fetch full user profile after login
      const userRes = await api.get('/auth/me/')
      setUser(userRes.data)
      
      connectSocket(data.access)
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.detail || 'Login failed. Please try again.'
      return { success: false, error: message }
    }
  }, [])

  // ── register(username, email, password) ─────────────────────
  const register = useCallback(async (username, email, password) => {
    try {
      const { data } = await api.post('/auth/register/', { username, email, password })
      return { success: true, message: 'Account created! You can now log in.' }
    } catch (err) {
      const message = err.response?.data?.username?.[0] || 
                      err.response?.data?.email?.[0] || 
                      'Registration failed.'
      return { success: false, error: message }
    }
  }, [])

  // ── logout() ─────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      // In a real setup, we might want to blacklist the token on backend
      // await api.post('/auth/logout/')
    } catch (_) {
      // ignore
    } finally {
      _clearAccessToken()
      disconnectSocket()
      setUser(null)
    }
  }, [])

  // ── refreshToken() ───────────────────────────────────────────
  const refreshToken = useCallback(async () => {
    try {
      const { data } = await api.post('/auth/refresh/')
      _setAccessToken(data.access)
      return data.access
    } catch (_) {
      logout()
      return null
    }
  }, [logout])

  const value = { user, loading, login, logout, register, refreshToken, isAuthenticated: !!user }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
