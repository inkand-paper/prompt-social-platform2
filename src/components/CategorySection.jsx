// components/CategorySection.jsx
// Shows a block of prompts under a category heading.
// Text categories: 5 rows max. Image categories: 3 items max.
// Last row fades with a gradient + "Show More" button.
// Clicking Show More switches the parent tab to Texts or Images.

import { useState } from 'react'
import TextCard from './TextCard'
import ImageCard from './ImageCard'

// Props:
//   category   — string like "Coding" or "UI Design"
//   items      — array of prompts in this category
//   type       — 'text' or 'image'
//   onShowMore — function to call when Show More is clicked (switches tab)

export default function CategorySection({ category, items, type, onShowMore }) {
  const limit = type === 'text' ? 5 : 3
  const hasMore = items.length > limit
  const visibleItems = items.slice(0, limit)

  return (
    <div className="cat-section">

      {/* Category heading */}
      <div className="cat-section-heading">
        <span className="cat-section-name">{category}</span>
        <span className="cat-section-count">{items.length} prompts</span>
      </div>

      {/* Items — wrapped in a container that clips the fade */}
      <div className="cat-section-body">

        {type === 'text' ? (
          <div className="text-list">
            {visibleItems.map((prompt) => (
              <TextCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
        ) : (
          <div className="masonry">
            {visibleItems.map((prompt) => (
              <ImageCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
        )}

        {/* Gradient fade + Show More — only if there are more items */}
        {hasMore && (
          <div className="show-more-wrap">
            <div className="show-more-gradient" />
            <button
              className="show-more-btn"
              onClick={onShowMore}
            >
              Show More in {category}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}

      </div>
    </div>
  )
}