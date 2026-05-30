// src/lib/socket.js
// Socket.io connection lifecycle — exactly as specified in §9 of IMPLEMENTATION.md.
// Connect on login, disconnect on logout. Unauthenticated connections are refused.

import { io } from 'socket.io-client'

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8000'

let socket = null

export function connectSocket(accessToken) {
  if (socket?.connected) return socket

  socket = io(WS_URL, {
    auth: { token: accessToken },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  })

  socket.on('connect', () => {
    console.log('[WS] connected:', socket.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('[WS] disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    console.warn('[WS] connection error:', err.message)
  })

  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}

export function getSocket() {
  return socket
}
