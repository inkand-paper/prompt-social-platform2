// src/context/AuthContext.jsx
// Provides user, login(), logout(), refreshToken(), and updateUser() to the whole app.

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api, { _setAccessToken, _setRefreshToken, _getRefreshToken, _clearTokens } from '../lib/api'
import { connectSocket, disconnectSocket } from '../lib/socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function restoreSession() {
      try {
        const { data } = await api.get('/auth/me/')
        setUser(data)
      } catch (err) {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    restoreSession()
  }, [])

  const updateUser = useCallback((patch) => {
    setUser(prev => prev ? { ...prev, ...patch } : null)
  }, [])

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post('/auth/login/', { email, password })
      
      _setAccessToken(data.access)
      _setRefreshToken(data.refresh) // Store refresh token
      
      const userRes = await api.get('/auth/me/')
      setUser(userRes.data)
      
      connectSocket(data.access)
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.detail || 'Login failed. Please try again.'
      return { success: false, error: message }
    }
  }, [])

  const register = useCallback(async (username, email, password) => {
    try {
      await api.post('/auth/register/', { username, email, password })
      return { success: true, message: 'Account created! Please check your email to verify.' }
    } catch (err) {
      const message = err.response?.data?.username?.[0] || 
                      err.response?.data?.email?.[0] || 
                      'Registration failed.'
      return { success: false, error: message }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      const refresh = _getRefreshToken() 
      if (refresh) {
        await api.post('/auth/logout/', { refresh })
      }
    } catch (err) {
      console.warn('Backend logout failed', err)
    } finally {
      _clearTokens()
      disconnectSocket()
      setUser(null)
    }
  }, [])

  const refreshToken = useCallback(async () => {
    try {
      const refresh = _getRefreshToken()
      if (!refresh) throw new Error('No refresh token')
      const { data } = await api.post('/auth/refresh/', { refresh })
      _setAccessToken(data.access)
      if (data.refresh) _setRefreshToken(data.refresh)
      return data.access
    } catch (_) {
      logout()
      return null
    }
  }, [logout])

  const value = { 
    user, 
    loading, 
    login, 
    logout, 
    register, 
    refreshToken, 
    updateUser,
    isAuthenticated: !!user 
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
