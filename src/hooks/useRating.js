// hooks/useRating.js
// Manages rating state for one prompt.
// hoverRating = what user is previewing (null when not hovering)
// rating = the committed/saved value

import { useState } from 'react'

export function useRating(initialRating) {
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

  function handleClick(pos) {
    setRating(pos)
    setHoverRating(null)
    // TODO Django: fetch('/api/prompts/${id}/rate/', { method: 'POST', body: JSON.stringify({ rating: pos }) })
  }

  return { displayRating, handleMouseEnter, handleMouseLeave, handleClick }
}
