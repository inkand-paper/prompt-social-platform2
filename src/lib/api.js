// src/lib/api.js
// Central Axios instance. All components use this — never call fetch() directly.
// Automatically attaches the access token from memory and refreshes on 401.

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send HttpOnly refresh-token cookie automatically
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
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, {}, { withCredentials: true })
        const newToken = data.access
        _setAccessToken(newToken)
        _queue.forEach(({ resolve }) => resolve(newToken))
        _queue = []
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (refreshError) {
        _queue.forEach(({ reject }) => reject(refreshError))
        _queue = []
        _clearAccessToken()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        _isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ── In-memory token storage (NOT localStorage) ────────────────
let _accessToken = null

export function _setAccessToken(token) { _accessToken = token }
export function _getAccessToken()      { return _accessToken }
export function _clearAccessToken()    { _accessToken = null }

export default api
