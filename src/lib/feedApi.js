import api from './api'

// ── Toggle this when backend is live ─────────────────────────
const MOCK_MODE = false
const MOCK_DELAY = 400  // simulated network latency in ms

// ── Normalise a DB prompt to match the shape our components expect ──
export function normalizePrompt(raw) {
  const initials = (raw.author?.display_name || '?')
    .split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('')
  return {
    id:          raw.id,
    slug:        raw.slug,
    cat:         raw.categories?.[0]?.name || raw.prompt_type || 'General',
    title:       raw.title,
    preview:     raw.body,
    description: raw.description || '',
    type:        raw.prompt_type || 'text',
    tags:        (raw.tags || []).map((t) => `#${t.slug}`),
    author:      raw.author?.display_name || 'Unknown',
    username:    raw.author?.username || '',
    initials,
    avatarUrl:   raw.author?.avatar_url || null,
    avatarColor: raw.author?.avatar_color || '#3282B8',
    rating:      parseFloat(raw.average_rating) || 0,
    ratingCount: raw.rating_count || 0,
    copyCount:   raw.copy_count || 0,
    viewCount:   raw.view_count || 0,
    img:         raw.cover_image_url || null,
    ar:          raw.aspect_ratio || 'ar-4-3',
    isFeatured:  raw.is_featured || false,
    createdAt:   raw.created_at,
  }
}

// ── GET /prompts/explore/ ─────────────────────────────────────
export async function fetchExploreFeed({ page = 1, type = 'all', sort = 'new', category = '' }) {
  const { data } = await api.get('/prompts/explore/', { params: { page, type, sort, category } })
  return {
    ...data,
    results: (data.results || []).map(normalizePrompt),
  }
}

// ── GET /prompts/trending/ ────────────────────────────────────
export async function fetchTrendingFeed({ page = 1, period = '7d' }) {
  const { data } = await api.get('/prompts/trending/', { params: { page, period } })
  return { 
    ...data, 
    results: (data.results || []).map(normalizePrompt) 
  }
}

// ── GET /prompts/tags/trending/ ───────────────────────────────
export async function fetchTrendingTags() {
  const { data } = await api.get('/prompts/tags/trending/')
  return data
}

// ── GET /prompts/users/top/ ───────────────────────────────────
export async function fetchTopPrompters() {
  const { data } = await api.get('/prompts/users/top/')
  return data
}

// ── GET /prompts/categories/ ──────────────────────────────────
export async function fetchCategories() {
  const { data } = await api.get('/prompts/categories/')
  return data
}

// ── POST /prompts/{uuid}/copy/ ────────────────────────────────
export async function logCopyEvent(promptId) {
  if (!promptId) return 
  try {
    await api.post(`/prompts/${promptId}/copy/`)
  } catch (_) {
    // ignore
  }
}
