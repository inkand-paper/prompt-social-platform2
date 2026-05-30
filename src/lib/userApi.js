// src/lib/userApi.js
// User profile, social graph, notifications, bookmarks, search.
// MOCK_MODE mirrors feedApi.js — flip to false when backend is live.

import api from './api'

const MOCK_MODE = true
const MOCK_DELAY = 350

// ── Mock data ─────────────────────────────────────────────────
const MOCK_USERS = {
  sarareeves: {
    id: 'u1', username: 'sarareeves', display_name: 'Sara Reeves',
    bio: 'Prompt engineer and growth marketer. Sharing what works.',
    avatar_url: null, avatar_color: '#3282B8',
    location: 'San Francisco, CA', website_url: 'https://sara.io',
    reputation_score: 4820, prompt_count: 142,
    follower_count: 1204, following_count: 89, is_verified: true,
  },
  marcuskim: {
    id: 'u2', username: 'marcuskim', display_name: 'Marcus Kim',
    bio: 'Senior engineer. I write prompts that make AI actually useful for developers.',
    avatar_url: null, avatar_color: '#2a6d9e',
    location: 'Seoul / Remote', website_url: null,
    reputation_score: 3910, prompt_count: 118,
    follower_count: 876, following_count: 412, is_verified: false,
  },
  lenapark: {
    id: 'u3', username: 'lenapark', display_name: 'Lena Park',
    bio: 'Product designer obsessed with AI-generated interfaces.',
    avatar_url: null, avatar_color: '#3d8fc2',
    location: 'Berlin', website_url: null,
    reputation_score: 2150, prompt_count: 97,
    follower_count: 543, following_count: 210, is_verified: false,
  },
}

const MOCK_NOTIFICATIONS = [
  { id: 'n1', type: 'new_rating',   message: 'Sara Reeves rated your prompt "Viral Launch Email" ⚡ 5.0', is_read: false, created_at: new Date(Date.now() - 60000 * 5).toISOString() },
  { id: 'n2', type: 'new_follower', message: 'Marcus Kim started following you', is_read: false, created_at: new Date(Date.now() - 60000 * 30).toISOString() },
  { id: 'n3', type: 'new_comment',  message: 'Lena Park commented on "SQL Query Optimizer"', is_read: true, created_at: new Date(Date.now() - 60000 * 120).toISOString() },
  { id: 'n4', type: 'prompt_featured', message: 'Your prompt "React Architecture Advisor" was featured!', is_read: true, created_at: new Date(Date.now() - 60000 * 360).toISOString() },
  { id: 'n5', type: 'new_rating',   message: 'Aiko Ota rated your prompt "SEO Content Map" ⚡ 4.5', is_read: true, created_at: new Date(Date.now() - 60000 * 1440).toISOString() },
]

// ── GET /users/{username}/ ────────────────────────────────────
export async function fetchUserProfile(username) {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY))
    const user = MOCK_USERS[username.toLowerCase()]
    if (!user) throw new Error('User not found')
    return user
  }
  const { data } = await api.get(`/users/${username}/`)
  return data
}

// ── GET /users/{username}/prompts/ ────────────────────────────
export async function fetchUserPrompts(username, page = 1) {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY))
    const { TEXT_PROMPTS, IMAGE_PROMPTS } = await import('../data/prompts')
    const all = [...TEXT_PROMPTS, ...IMAGE_PROMPTS].slice(0, 8)
    return { results: all, total: all.length, next: null }
  }
  const { data } = await api.get(`/users/${username}/prompts/`, { params: { page } })
  return data
}

// ── POST/DELETE /users/{username}/follow/ ─────────────────────
export async function followUser(username) {
  if (MOCK_MODE) { await new Promise((r) => setTimeout(r, 300)); return { following: true } }
  const { data } = await api.post(`/users/${username}/follow/`)
  return data
}
export async function unfollowUser(username) {
  if (MOCK_MODE) { await new Promise((r) => setTimeout(r, 300)); return { following: false } }
  await api.delete(`/users/${username}/follow/`)
  return { following: false }
}

// ── GET /notifications/ ───────────────────────────────────────
export async function fetchNotifications() {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY))
    return MOCK_NOTIFICATIONS
  }
  const { data } = await api.get('/notifications/')
  return data.results ?? data
}

// ── POST /notifications/mark-read/ ───────────────────────────
export async function markNotificationsRead(ids = null) {
  if (MOCK_MODE) { await new Promise((r) => setTimeout(r, 200)); return }
  await api.post('/notifications/mark-read/', ids ? { ids } : { all: true })
}

// ── GET /bookmarks/ ───────────────────────────────────────────
export async function fetchBookmarks(page = 1) {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY))
    const { TEXT_PROMPTS, IMAGE_PROMPTS } = await import('../data/prompts')
    const all = [...TEXT_PROMPTS.slice(0, 3), ...IMAGE_PROMPTS.slice(0, 2)]
    return { results: all, total: all.length, next: null }
  }
  const { data } = await api.get('/bookmarks/', { params: { page } })
  return data
}

// ── POST /bookmarks/ ─────────────────────────────────────────
export async function addBookmark(promptId) {
  if (MOCK_MODE) { await new Promise((r) => setTimeout(r, 200)); return }
  await api.post('/bookmarks/', { prompt_id: promptId })
}

// ── DELETE /bookmarks/{promptId}/ ────────────────────────────
export async function removeBookmark(promptId) {
  if (MOCK_MODE) { await new Promise((r) => setTimeout(r, 200)); return }
  await api.delete(`/bookmarks/${promptId}/`)
}

// ── GET /search/ ─────────────────────────────────────────────
export async function searchPrompts(q, { type = 'all', sort = 'relevance', page = 1 } = {}) {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 400))
    if (!q) return { results: [], total: 0, next: null }
    const { TEXT_PROMPTS, IMAGE_PROMPTS } = await import('../data/prompts')
    const all = [...TEXT_PROMPTS, ...IMAGE_PROMPTS]
    const lower = q.toLowerCase()
    const results = all.filter(
      (p) =>
        p.title.toLowerCase().includes(lower) ||
        p.preview.toLowerCase().includes(lower) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(lower)),
    )
    return { results, total: results.length, next: null }
  }
  const { data } = await api.get('/search/', { params: { q, type, sort, page } })
  return data
}

// ── GET /users/me/ ────────────────────────────────────────────
export async function fetchMe() {
  const { data } = await api.get('/users/me/')
  return data
}

// ── PATCH /users/me/ ─────────────────────────────────────────
export async function updateProfile(payload) {
  if (MOCK_MODE) { await new Promise((r) => setTimeout(r, 600)); return payload }
  const { data } = await api.patch('/users/me/', payload)
  return data
}

// ── POST /users/me/avatar/ ────────────────────────────────────
export async function uploadAvatar(file) {
  if (MOCK_MODE) { await new Promise((r) => setTimeout(r, 800)); return { avatar_url: null } }
  const form = new FormData()
  form.append('avatar', file)
  const { data } = await api.post('/users/me/avatar/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// ── GET /prompts/{slug}/ ──────────────────────────────────────
export async function fetchPrompt(slug) {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY))
    const { TEXT_PROMPTS, IMAGE_PROMPTS } = await import('../data/prompts')
    const all = [...TEXT_PROMPTS, ...IMAGE_PROMPTS]
    const found = all.find((p) => p.id === slug || p.slug === slug) || all[0]
    return { ...found, slug: found.slug || found.id, body: found.preview, views: 1204, forks: 23 }
  }
  const { data } = await api.get(`/prompts/${slug}/`)
  return data
}

// ── GET /prompts/{id}/comments/ ──────────────────────────────
const MOCK_COMMENTS = [
  { id: 'c1', author: { username: 'sarareeves', display_name: 'Sara Reeves', avatar_color: '#3282B8' }, body: 'This is incredibly useful! Used it for our Q3 launch and got a 32% open rate. Thanks!', like_count: 14, created_at: new Date(Date.now() - 60000 * 120).toISOString() },
  { id: 'c2', author: { username: 'marcuskim', display_name: 'Marcus Kim', avatar_color: '#2a6d9e' }, body: 'I tweaked the tone directive and it works even better for B2B SaaS. Highly recommend.', like_count: 8, created_at: new Date(Date.now() - 60000 * 240).toISOString() },
  { id: 'c3', author: { username: 'lenapark', display_name: 'Lena Park', avatar_color: '#3d8fc2' }, body: 'Would love a version for product update emails too!', like_count: 3, created_at: new Date(Date.now() - 60000 * 360).toISOString() },
]

export async function fetchComments(promptId) {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 300))
    return MOCK_COMMENTS
  }
  const { data } = await api.get(`/prompts/${promptId}/comments/`)
  return data.results ?? data
}

export async function postComment(promptId, body) {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 400))
    return { id: `c${Date.now()}`, author: { username: 'alexjohnson', display_name: 'Alex Johnson', avatar_color: '#3282B8' }, body, like_count: 0, created_at: new Date().toISOString() }
  }
  const { data } = await api.post(`/prompts/${promptId}/comments/`, { body })
  return data
}

// ── GET /collections/ ─────────────────────────────────────────
const MOCK_COLLECTIONS = [
  { id: 'col1', name: 'Marketing Arsenal', description: 'My go-to marketing prompts', prompt_count: 12, visibility: 'public', updated_at: new Date().toISOString() },
  { id: 'col2', name: 'Dev Toolkit', description: 'Code-related prompts for daily dev work', prompt_count: 8, visibility: 'private', updated_at: new Date().toISOString() },
]
export async function fetchCollections() {
  if (MOCK_MODE) { await new Promise((r) => setTimeout(r, MOCK_DELAY)); return MOCK_COLLECTIONS }
  const { data } = await api.get('/collections/')
  return data.results ?? data
}
export async function createCollection(payload) {
  if (MOCK_MODE) { await new Promise((r) => setTimeout(r, 400)); return { id: `col${Date.now()}`, ...payload, prompt_count: 0 } }
  const { data } = await api.post('/collections/', payload)
  return data
}

// ── GET /users/me/prompts/ ────────────────────────────────────
export async function fetchMyPrompts(page = 1) {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY))
    const { TEXT_PROMPTS, IMAGE_PROMPTS } = await import('../data/prompts')
    const all = [...TEXT_PROMPTS, ...IMAGE_PROMPTS].map((p, i) => ({
      ...p, visibility: i % 3 === 2 ? 'private' : 'public',
    }))
    return { results: all, total: all.length, next: null }
  }
  const { data } = await api.get('/users/me/prompts/', { params: { page } })
  return data
}

// ── DELETE /prompts/{id}/ ─────────────────────────────────────
export async function deletePrompt(promptId) {
  if (MOCK_MODE) { await new Promise((r) => setTimeout(r, 300)); return }
  await api.delete(`/prompts/${promptId}/`)
}
