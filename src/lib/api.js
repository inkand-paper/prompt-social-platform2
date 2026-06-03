// src/lib/api.js
// Central Axios instance. All components use this — never call fetch() directly.
// Automatically attaches the access token from memory and refreshes on 401.

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send HttpOnly refresh-token cookie automatically (if using cookies)
})

// ── Request interceptor: attach access token ──────────────────
api.interceptors.request.use((config) => {
  const token = _getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: refresh on 401 ─────────────────────
let _isRefreshing = false
let _queue = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      if (_isRefreshing) {
        return new Promise((resolve, reject) => {
          _queue.push({ resolve, reject })
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`
            return api(original)
          })
          .catch(Promise.reject)
      }

      original._retry = true
      _isRefreshing = true

      try {
        const refresh = _getRefreshToken()
        // If we don't have a refresh token in memory, we can't refresh
        if (!refresh) throw new Error('No refresh token')

        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh }, { withCredentials: true })
        const newToken = data.access
        const newRefresh = data.refresh // SimpleJWT rotates tokens
        
        _setAccessToken(newToken)
        if (newRefresh) _setRefreshToken(newRefresh)

        _queue.forEach(({ resolve }) => resolve(newToken))
        _queue = []
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (refreshError) {
        _queue.forEach(({ reject }) => reject(refreshError))
        _queue = []
        _clearTokens()
        return Promise.reject(refreshError)
      } finally {
        _isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ── Token storage ─────────────────────────────────────────────
// Access token: memory only (short-lived, XSS-safe)
// Refresh token: localStorage (survives page reload, keeps session alive)
const REFRESH_KEY = 'pa_refresh'

let _accessToken = null

export function _setAccessToken(token)  { _accessToken = token }
export function _getAccessToken()       { return _accessToken }
export function _setRefreshToken(token) {
  if (token) localStorage.setItem(REFRESH_KEY, token)
  else localStorage.removeItem(REFRESH_KEY)
}
export function _getRefreshToken()      { return localStorage.getItem(REFRESH_KEY) }
export function _clearTokens() {
  _accessToken = null
  localStorage.removeItem(REFRESH_KEY)
}

export default api
