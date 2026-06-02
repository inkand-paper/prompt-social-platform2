// src/lib/socket.js
// Native WebSocket implementation for Django Channels — §9 fallback
// Connect on login, disconnect on logout.

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

let socket = null
let listeners = new Set()

export function connectSocket(accessToken) {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket
  }

  const url = `${WS_BASE_URL}/ws/notifications/?token=${accessToken}`
  socket = new WebSocket(url)

  socket.onopen = () => {
    console.log('[WS] connected to notifications')
  }

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      listeners.forEach(cb => cb(data))
    } catch (err) {
      console.error('[WS] failed to parse message', err)
    }
  }

  socket.onclose = (e) => {
    console.log('[WS] disconnected:', e.reason)
    // Optional: implement manual exponential backoff reconnection here if needed
  }

  socket.onerror = (err) => {
    console.warn('[WS] error:', err)
  }

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.close()
    socket = null
  }
}

export function subscribeToNotifications(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function getSocket() {
  return socket
}
