// hooks/useRating.js
// Manages rating state for one prompt.
// hoverRating = what user is previewing (null when not hovering)
// rating = the committed/saved value
// Calls POST /api/v1/prompts/{id}/rate/ on click (optimistic update).

import { useState } from 'react'
import api from '../lib/api'

export function useRating(initialRating, promptId) {
  const [rating, setRating] = useState(initialRating)
  const [hoverRating, setHoverRating] = useState(null)

  // Show hover preview while hovering, else show saved rating
  const displayRating = hoverRating !== null ? hoverRating : rating

  function handleMouseEnter(pos) {
    setHoverRating(pos)
  }

  function handleMouseLeave() {
    setHoverRating(null)
  }

  async function handleClick(pos) {
    // Optimistic update — apply immediately even before API responds
    setRating(pos)
    setHoverRating(null)

    if (!promptId) return // no-op for mock data without an id

    try {
      await api.post(`/prompts/${promptId}/rate/`, { value: pos })
    } catch (err) {
      // Roll back on failure
      if (err.response?.status !== 401) {
        // 401 means not logged in — silently ignore (ProtectedRoute handles redirect)
        console.warn('[useRating] rate failed, rolling back', err)
        setRating(initialRating)
      }
    }
  }

  return { displayRating, handleMouseEnter, handleMouseLeave, handleClick }
}

