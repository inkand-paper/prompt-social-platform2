// src/pages/TrendingPage.jsx — Real trending feed with period filter

import { useRef, useCallback, useEffect } from 'react'
import { useTrending } from '../hooks/useFeed'
import TextCard from '../components/TextCard'
import ImageCard from '../components/ImageCard'
import SkeletonCard from '../components/SkeletonCard'
import { useState } from 'react'

const PERIODS = [
  { label: '24 Hours', value: '24h' },
  { label: '7 Days',   value: '7d'  },
  { label: '30 Days',  value: '30d' },
]

export default function TrendingPage() {
  const [period, setPeriod] = useState('7d')

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useTrending({ period })

  const allItems = data?.pages.flatMap((page) => page.results) ?? []

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
    const obs = new IntersectionObserver(onIntersect, { rootMargin: '200px' })
    obs.observe(el)
    return () => obs.unobserve(el)
  }, [onIntersect])

  const ranked = allItems.map((item, idx) => ({ ...item, rank: idx + 1 }))

  return (
    <div className="feed">
      <div className="feed-header">
        <div className="feed-tabs">
          {PERIODS.map((p) => (
            <div
              key={p.value}
              className={`feed-tab ${period === p.value ? 'active' : ''}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 2 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
          </svg>
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>Trending</span>
        </div>
      </div>

      {isLoading ? (
        <div className="feed-section">
          {[1,2,3,4,5].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : allItems.length === 0 ? (
        <div className="feed-section">
          <div className="page-placeholder">
            <div className="page-placeholder-text">No trending prompts</div>
            <div className="page-placeholder-sub">Check back later for trending content.</div>
          </div>
        </div>
      ) : (
        <div className="feed-section">
          {/* Ranked list */}
          <div className="trending-list">
            {ranked.map((item, idx) => (
              <div key={item.id} className="trending-item">
                <div className="trending-rank">#{idx + 1}</div>
                <div style={{ flex: 1 }}>
                  {item.img
                    ? <ImageCard prompt={item} />
                    : <TextCard prompt={item} />
                  }
                </div>
              </div>
            ))}
          </div>

          <div ref={sentinelRef} style={{ height: 1 }} />
          {isFetchingNextPage && <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>Loading more…</div>}
        </div>
      )}
    </div>
  )
}
