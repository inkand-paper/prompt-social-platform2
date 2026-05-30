// components/Feed.jsx
// Real data via useFeed() hook with infinite scroll.
// Tabs: All | Texts | Images | Videos
// Falls back to mock data while backend is offline (MOCK_MODE=true in feedApi.js).

import { useState, useRef, useCallback, useEffect } from 'react'
import { useFeed } from '../hooks/useFeed'
import TextCard from './TextCard'
import ImageCard from './ImageCard'
import SkeletonCard from './SkeletonCard'

const TABS = ['All', 'Texts', 'Images', 'Videos']

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

// ── Show More button ─────────────────────────────────────────
function ShowMoreBtn({ label, onClick }) {
  return (
    <div className="show-more-wrap">
      <button className="show-more-btn" onClick={onClick}>
        {label}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}

// ── Videos placeholder ───────────────────────────────────────
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
export default function Feed({ category = '' }) {
  const [activeTab, setActiveTab] = useState('All')
  const [sortedByRating, setSorted] = useState(false)

  // Which type to pass to the API
  const typeParam =
    activeTab === 'Texts'  ? 'text' :
    activeTab === 'Images' ? 'image' : 'all'
  const sortParam = sortedByRating ? 'rating' : 'new'

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useFeed({
    type: activeTab === 'Videos' ? 'all' : typeParam,
    sort: sortParam,
    category,
  })

  const allItems = data?.pages.flatMap((page) => page.results) ?? []
  const textItems  = allItems.filter((p) => !p.img)
  const imageItems = allItems.filter((p) => !!p.img)

  // Decide which items to show in each tab
  const displayText  = activeTab === 'All' ? textItems.slice(0, 5)  : textItems
  const displayImage = activeTab === 'All' ? imageItems.slice(0, 4) : imageItems

  // Infinite scroll sentinel
  const sentinelRef = useRef(null)
  const onIntersect = useCallback(
    (entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  )
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(onIntersect, { rootMargin: '300px' })
    obs.observe(el)
    return () => obs.unobserve(el)
  }, [onIntersect])

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

      {activeTab === 'Videos' && <VideosTab />}

      {activeTab !== 'Videos' && (
        <>
          {/* Loading state */}
          {isLoading && (
            <div className="feed-section">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
              {activeTab !== 'Texts' && (
                <div className="masonry" style={{ marginTop: 24 }}>
                  {[1, 2, 3].map((i) => <SkeletonCard key={`img-${i}`} type="image" />)}
                </div>
              )}
            </div>
          )}

          {/* Error state */}
          {isError && !isLoading && (
            <div className="feed-section">
              <div className="page-placeholder">
                <div className="page-placeholder-text">Failed to load feed</div>
                <div className="page-placeholder-sub">Check your connection and try again.</div>
              </div>
            </div>
          )}

          {/* Content */}
          {!isLoading && !isError && (
            <>
              {/* All tab — sections */}
              {activeTab === 'All' && (
                <div className="feed-section">
                  <div className="feed-section-heading">Latest</div>
                  {displayText.length > 0 && (
                    <div className="all-block">
                      <div className="text-list">
                        {displayText.map((p) => <TextCard key={p.id} prompt={p} />)}
                      </div>
                      {textItems.length > 5 && (
                        <ShowMoreBtn label="More text prompts" onClick={() => handleShowMore('Texts')} />
                      )}
                    </div>
                  )}
                  {displayImage.length > 0 && (
                    <div className="all-block" style={{ marginTop: 'var(--sp-6)' }}>
                      <div className="masonry">
                        {displayImage.map((p) => <ImageCard key={p.id} prompt={p} />)}
                      </div>
                      {imageItems.length > 4 && (
                        <ShowMoreBtn label="More image prompts" onClick={() => handleShowMore('Images')} />
                      )}
                    </div>
                  )}
                  {allItems.length === 0 && (
                    <div className="page-placeholder">
                      <div className="page-placeholder-text">Nothing here yet</div>
                      <div className="page-placeholder-sub">Be the first to share a prompt!</div>
                    </div>
                  )}
                </div>
              )}

              {/* Texts tab */}
              {activeTab === 'Texts' && (
                <div className="feed-section">
                  <div className="text-list">
                    {textItems.length === 0 ? (
                      <div className="page-placeholder">
                        <div className="page-placeholder-text">No text prompts yet</div>
                      </div>
                    ) : (
                      textItems.map((p) => <TextCard key={p.id} prompt={p} />)
                    )}
                  </div>
                </div>
              )}

              {/* Images tab */}
              {activeTab === 'Images' && (
                <div className="feed-section">
                  {imageItems.length === 0 ? (
                    <div className="page-placeholder">
                      <div className="page-placeholder-text">No image prompts yet</div>
                    </div>
                  ) : (
                    <div className="masonry">
                      {imageItems.map((p) => <ImageCard key={p.id} prompt={p} />)}
                    </div>
                  )}
                </div>
              )}

              {/* Infinite scroll sentinel */}
              {activeTab !== 'All' && (
                <>
                  <div ref={sentinelRef} style={{ height: 1 }} />
                  {isFetchingNextPage && (
                    <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
                      Loading more…
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}