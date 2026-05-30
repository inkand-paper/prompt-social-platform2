import api from './api'

const MOCK_MODE = false
const MOCK_DELAY = 350

// ── GET /auth/profiles/{username}/ ────────────────────────────
export async function fetchUserProfile(username) {
  const { data } = await api.get(`/auth/profiles/${username}/`)
  return data
}

// ── GET /auth/profiles/{username}/prompts/ ────────────────────
export async function fetchUserPrompts(username, page = 1) {
  const { data } = await api.get(`/auth/profiles/${username}/prompts/`, { params: { page } })
  return data
}

// ── POST/DELETE /auth/profiles/{username}/follow/ ──────────────
export async function followUser(username) {
  const { data } = await api.post(`/auth/profiles/${username}/follow/`)
  return data
}
export async function unfollowUser(username) {
  await api.delete(`/auth/profiles/${username}/follow/`)
  return { following: false }
}

// ── GET /prompts/notifications/ ───────────────────────────────
export async function fetchNotifications() {
  const { data } = await api.get('/prompts/notifications/')
  return data.results ?? data
}

// ── POST /prompts/notifications/mark-read/ ───────────────────
export async function markNotificationsRead(ids = null) {
  await api.post('/prompts/notifications/mark-read/', ids ? { ids } : { all: true })
}

// ── GET /prompts/bookmarks/ ───────────────────────────────────
export async function fetchBookmarks(page = 1) {
  const { data } = await api.get('/prompts/bookmarks/', { params: { page } })
  return data
}

// ── POST /prompts/bookmarks/ ─────────────────────────────────
export async function addBookmark(promptId) {
  await api.post('/prompts/bookmarks/', { prompt_id: promptId })
}

// ── DELETE /prompts/bookmarks/{promptId}/ ────────────────────
export async function removeBookmark(promptId) {
  await api.delete(`/prompts/bookmarks/${promptId}/`)
}

// ── GET /prompts/search/ ─────────────────────────────────────
export async function searchPrompts(q, { type = 'all', sort = 'relevance', page = 1 } = {}) {
  const { data } = await api.get('/prompts/search/', { params: { q, type, sort, page } })
  return data
}

// ── GET /auth/me/ ─────────────────────────────────────────────
export async function fetchMe() {
  const { data } = await api.get('/auth/me/')
  return data
}

// ── PATCH /auth/me/ ───────────────────────────────────────────
export async function updateProfile(payload) {
  const { data } = await api.patch('/auth/me/', payload)
  return data
}

// ── POST /auth/me/avatar/ ─────────────────────────────────────
export async function uploadAvatar(file) {
  const form = new FormData()
  form.append('avatar', file)
  const { data } = await api.post('/auth/me/avatar/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// ── GET /prompts/{slug}/ ──────────────────────────────────────
export async function fetchPrompt(slug) {
  const { data } = await api.get(`/prompts/${slug}/`)
  // frontend normalization handled in feedApi? No, fetchPrompt returns raw.
  // Actually, I should use normalizePrompt if I want consistency.
  // But for now let's just return.
  return data
}

// ── GET /prompts/{id}/comments/ ──────────────────────────────
export async function fetchComments(promptId) {
  const { data } = await api.get(`/prompts/${promptId}/comments/`)
  return data.results ?? data
}

export async function postComment(promptId, body) {
  const { data } = await api.post(`/prompts/${promptId}/comments/`, { body })
  return data
}

// ── GET /prompts/collections/ ─────────────────────────────────
export async function fetchCollections() {
  const { data } = await api.get('/prompts/collections/')
  return data.results ?? data
}
export async function createCollection(payload) {
  const { data } = await api.post('/prompts/collections/', payload)
  return data
}

// ── GET /auth/profiles/{username}/prompts/ (for 'me') ──────────
export async function fetchMyPrompts(page = 1) {
  const { data } = await api.get('/auth/me/prompts/', { params: { page } })
  return data
}

// ── DELETE /prompts/{id}/ ─────────────────────────────────────
export async function deletePrompt(promptId) {
  await api.delete(`/prompts/${promptId}/`)
}
