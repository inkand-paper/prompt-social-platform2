// src/lib/feedApi.js
// All feed/prompt API calls in one place.
// Falls back to mock data when the backend is not available (MOCK_MODE = true).
// Set MOCK_MODE = false once the Django backend is live.

import api from './api'
import { TEXT_PROMPTS, IMAGE_PROMPTS } from '../data/prompts'

// ── Toggle this when backend is live ─────────────────────────
const MOCK_MODE = true
const MOCK_DELAY = 400  // simulated network latency in ms

// ── Normalise a DB prompt to match the shape our components expect ──
// DB shape → component shape mapping:
//   id           → id
//   title        → title
//   body         → preview   (the actual prompt text)
//   prompt_type  → type      ('text' | 'image' etc.)
//   author.*     → author, initials, avatarUrl, avatarColor
//   average_rating → rating
//   cover_image_url → img
//   tags[].name  → tags (array of '#tag' strings)
//   prompt_categories[0].name → cat
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

// ── Build a mock page response ────────────────────────────────
function mockPage(items, page, pageSize = 10) {
  const start = (page - 1) * pageSize
  const slice = items.slice(start, start + pageSize)
  return {
    results: slice,
    page,
    pageSize,
    total: items.length,
    next: start + pageSize < items.length ? page + 1 : null,
  }
}

// ── GET /feed/explore/ ────────────────────────────────────────
// Returns { results: [...], page, next }
export async function fetchExploreFeed({ page = 1, type = 'all', sort = 'new' }) {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY))
    let items
    if (type === 'text' || type === 'texts') {
      items = TEXT_PROMPTS
    } else if (type === 'image' || type === 'images') {
      items = IMAGE_PROMPTS
    } else {
      // 'all' — interleave text and image prompts
      items = [...TEXT_PROMPTS, ...IMAGE_PROMPTS]
    }
    if (sort === 'rating') {
      items = [...items].sort((a, b) => b.rating - a.rating)
    }
    return mockPage(items, page, 20) // all mock items on page 1
  }

  const { data } = await api.get('/feed/explore/', { params: { page, type, sort } })
  return {
    ...data,
    results: data.results.map(normalizePrompt),
  }
}

// ── GET /feed/trending/ ───────────────────────────────────────
export async function fetchTrendingFeed({ page = 1, period = '7d' }) {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY))
    const items = [...TEXT_PROMPTS, ...IMAGE_PROMPTS].sort((a, b) => b.rating - a.rating)
    return mockPage(items, page)
  }
  const { data } = await api.get('/feed/trending/', { params: { page, period } })
  return { ...data, results: data.results.map(normalizePrompt) }
}

// ── GET /tags/trending/ ───────────────────────────────────────
export async function fetchTrendingTags() {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 200))
    return [
      { id: 1, slug: 'marketing',    name: '#marketing',    usage_count: 1421 },
      { id: 2, slug: 'coding',       name: '#coding',       usage_count: 1388 },
      { id: 3, slug: 'chatgpt',      name: '#chatgpt',      usage_count: 1102 },
      { id: 4, slug: 'startup',      name: '#startup',      usage_count: 899  },
      { id: 5, slug: 'seo',          name: '#seo',          usage_count: 743  },
      { id: 6, slug: 'writing',      name: '#writing',      usage_count: 688  },
      { id: 7, slug: 'react',        name: '#react',        usage_count: 572  },
      { id: 8, slug: 'design',       name: '#design',       usage_count: 490  },
    ]
  }
  const { data } = await api.get('/tags/trending/')
  return data
}

// ── GET /users/top/ ───────────────────────────────────────────
export async function fetchTopPrompters() {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 200))
    return [
      { id: 'u1', username: 'sarareeves', display_name: 'Sara Reeves',  avatar_color: '#3282B8', prompt_count: 142 },
      { id: 'u2', username: 'marcuskim',  display_name: 'Marcus Kim',   avatar_color: '#2a6d9e', prompt_count: 118 },
      { id: 'u3', username: 'lenapark',   display_name: 'Lena Park',    avatar_color: '#3d8fc2', prompt_count: 97  },
      { id: 'u4', username: 'aikoota',    display_name: 'Aiko Ota',     avatar_color: '#4899cc', prompt_count: 84  },
    ]
  }
  const { data } = await api.get('/users/top/')
  return data
}

// ── GET /categories/ ─────────────────────────────────────────
export async function fetchCategories() {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 200))
    return [
      { id: 1, slug: 'coding',    name: 'Coding',    emoji: '💻', prompt_count: 1400 },
      { id: 2, slug: 'marketing', name: 'Marketing', emoji: '📣', prompt_count: 1100 },
      { id: 3, slug: 'writing',   name: 'Writing',   emoji: '✍️',  prompt_count: 890  },
      { id: 4, slug: 'ui-design', name: 'UI Design', emoji: '🎨', prompt_count: 640  },
      { id: 5, slug: 'startup',   name: 'Startup',   emoji: '🚀', prompt_count: 510  },
    ]
  }
  const { data } = await api.get('/categories/')
  return data
}

// ── POST /prompts/{id}/copy/ ──────────────────────────────────
// Fire-and-forget — logs the copy event, increments copy_count on the backend.
export async function logCopyEvent(promptId) {
  if (MOCK_MODE || !promptId) return  // no-op in mock mode
  try {
    await api.post(`/prompts/${promptId}/copy/`)
  } catch (_) {
    // ignore silently — logging failure should never block UX
  }
}
