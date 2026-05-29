// components/Feed.jsx
// Tabs: All | Texts | Images | Videos (scope only)
//
// All tab — same layout as before (text rows + masonry grid),
// split into For You / Popular / New sections.
// Each section shows limited prompts + gradient Show More button.
// Show More switches to Texts or Images tab.
//
// Texts / Images: full list, sortable by rating
// Videos: placeholder

import { useState } from 'react'
import TextCard from './TextCard'
import ImageCard from './ImageCard'
import { TEXT_PROMPTS, IMAGE_PROMPTS } from '../data/prompts'

const TABS = ['All', 'Texts', 'Images', 'Videos']

// Sort highest rating first
function sortByRating(arr) {
  return [...arr].sort((a, b) => b.rating - a.rating)
}

// ── Sort button ──────────────────────────────────────────────
function SortButton({ sorted, onToggle }) {
  return (
    <button className={`filter-btn ${sorted ? 'active' : ''}`} onClick={onToggle}>
      <svg width="12" height="12" viewBox="0 0 24 24">
        <polygon
          points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
          fill={sorted ? 'var(--accent)' : 'currentColor'}
          stroke="none"
        />
      </svg>
      {sorted ? 'Highest Rating' : 'Sort by Rating'}
    </button>
  )
}

// ── Show More button with gradient fade ──────────────────────
function ShowMore({ label, onClick }) {
  return (
    <div className="show-more-wrap">
      <div className="show-more-gradient" />
      <button className="show-more-btn" onClick={onClick}>
        {label}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}

// ── Config for each All tab section ─────────────────────────
// textLimit / imageLimit = how many to show before "Show More"
const ALL_SECTIONS = [
  { label: 'For You',  textLimit: 4, imageLimit: 3 },
  { label: 'Popular',  textLimit: 3, imageLimit: 4 },
  { label: 'New',      textLimit: 2, imageLimit: 5 },
]

// One section: section heading + text rows + image grid + show more buttons
function AllSection({ label, textLimit, imageLimit, onShowMore }) {
  const visibleText  = TEXT_PROMPTS.slice(0, textLimit)
  const visibleImage = IMAGE_PROMPTS.slice(0, imageLimit)
  const hasMoreText  = TEXT_PROMPTS.length > textLimit
  const hasMoreImage = IMAGE_PROMPTS.length > imageLimit

  return (
    <div className="feed-section">
      <div className="feed-section-heading">{label}</div>

      {/* Text prompt rows */}
      <div className="all-block">
        <div className="text-list">
          {visibleText.map((p) => <TextCard key={p.id} prompt={p} />)}
        </div>
        {hasMoreText && (
          <ShowMore label="Show More" onClick={() => onShowMore('Texts')} />
        )}
      </div>

      {/* Image masonry grid */}
      <div className="all-block" style={{ marginTop: 'var(--sp-6)' }}>
        <div className="masonry">
          {visibleImage.map((p) => <ImageCard key={p.id} prompt={p} />)}
        </div>
        {hasMoreImage && (
          <ShowMore label="Show More" onClick={() => onShowMore('Images')} />
        )}
      </div>
    </div>
  )
}

// ── All tab ──────────────────────────────────────────────────
function AllTab({ onShowMore }) {
  return (
    <>
      {ALL_SECTIONS.map((s) => (
        <AllSection
          key={s.label}
          label={s.label}
          textLimit={s.textLimit}
          imageLimit={s.imageLimit}
          onShowMore={onShowMore}
        />
      ))}
    </>
  )
}

// ── Texts tab ────────────────────────────────────────────────
function TextsTab({ sorted }) {
  const prompts = sorted ? sortByRating(TEXT_PROMPTS) : TEXT_PROMPTS
  return (
    <div className="feed-section">
      <div className="text-list">
        {prompts.map((p) => <TextCard key={p.id} prompt={p} />)}
      </div>
    </div>
  )
}

// ── Images tab ───────────────────────────────────────────────
function ImagesTab({ sorted }) {
  const prompts = sorted ? sortByRating(IMAGE_PROMPTS) : IMAGE_PROMPTS
  return (
    <div className="feed-section">
      <div className="masonry">
        {prompts.map((p) => <ImageCard key={p.id} prompt={p} />)}
      </div>
    </div>
  )
}

// ── Videos tab — placeholder (TODO: wire to Django) ──────────
function VideosTab() {
  return (
    <div className="feed-section">
      <div className="videos-placeholder">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
        <div className="videos-placeholder-text">Video prompts coming soon</div>
        <div className="videos-placeholder-sub">Reserved for video generation prompts</div>
      </div>
    </div>
  )
}

// ── Main Feed ────────────────────────────────────────────────
export default function Feed() {
  const [activeTab, setActiveTab] = useState('All')
  const [sortedByRating, setSorted] = useState(false)

  function handleShowMore(tab) {
    setActiveTab(tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const showSort = activeTab === 'Texts' || activeTab === 'Images'

  return (
    <div className="feed">

      <div className="feed-header">
        <div className="feed-tabs">
          {TABS.map((tab) => (
            <div
              key={tab}
              className={`feed-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </div>
          ))}
        </div>

        {showSort && (
          <SortButton sorted={sortedByRating} onToggle={() => setSorted(!sortedByRating)} />
        )}
      </div>

      {activeTab === 'All'    && <AllTab onShowMore={handleShowMore} />}
      {activeTab === 'Texts'  && <TextsTab sorted={sortedByRating} />}
      {activeTab === 'Images' && <ImagesTab sorted={sortedByRating} />}
      {activeTab === 'Videos' && <VideosTab />}

    </div>
  )
}