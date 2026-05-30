// src/context/AuthContext.jsx
// Provides user, login(), logout(), refreshToken() to the whole app.
// Currently uses mock auth — swap the API calls for real ones once Django backend is live.

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api, { _setAccessToken, _clearAccessToken } from '../lib/api'
import { connectSocket, disconnectSocket } from '../lib/socket'

const AuthContext = createContext(null)

// ── Mock user for development (remove when backend is live) ───
const MOCK_USER = {
  id: 'mock-user-001',
  username: 'alexjohnson',
  display_name: 'Alex Johnson',
  email: 'alex@example.com',
  avatar_url: null,
  avatar_color: '#3282B8',
  reputation_score: 2840,
  prompt_count: 47,
  follower_count: 312,
  following_count: 89,
  is_verified: false,
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true) // true while checking existing session

  // ── On mount: check if user has an existing session ──────────
  useEffect(() => {
    const storedUser = sessionStorage.getItem('pa_mock_user')
    if (storedUser) {
      const parsed = JSON.parse(storedUser)
      setUser(parsed)
      // In production: would also call /auth/refresh/ here to get a new access token
    }
    setLoading(false)
  }, [])

  // ── login(email, password) ───────────────────────────────────
  const login = useCallback(async (email, password) => {
    try {
      // PRODUCTION: uncomment below and remove mock block
      // const { data } = await api.post('/auth/login/', { email, password })
      // _setAccessToken(data.access_token)
      // setUser(data.user)
      // connectSocket(data.access_token)

      // MOCK: simulate a successful login
      await new Promise((r) => setTimeout(r, 600)) // fake network delay
      if (email && password.length >= 6) {
        sessionStorage.setItem('pa_mock_user', JSON.stringify(MOCK_USER))
        setUser(MOCK_USER)
        return { success: true }
      } else {
        return { success: false, error: 'Invalid credentials' }
      }
    } catch (err) {
      const message = err.response?.data?.detail || 'Login failed. Please try again.'
      return { success: false, error: message }
    }
  }, [])

  // ── register(username, email, password) ─────────────────────
  const register = useCallback(async (username, email, password) => {
    try {
      // PRODUCTION: uncomment below
      // const { data } = await api.post('/auth/register/', { username, email, password })
      // return { success: true, message: data.message }

      // MOCK
      await new Promise((r) => setTimeout(r, 800))
      return { success: true, message: 'Account created! Please check your email to verify.' }
    } catch (err) {
      const message = err.response?.data?.detail || 'Registration failed.'
      return { success: false, error: message }
    }
  }, [])

  // ── logout() ─────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      // PRODUCTION: await api.post('/auth/logout/')
      sessionStorage.removeItem('pa_mock_user')
    } catch (_) {
      // ignore errors — clear state regardless
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
      _setAccessToken(data.access_token)
      return data.access_token
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
