// src/pages/StarredPage.jsx — User's bookmarked/starred prompts

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchBookmarks, removeBookmark } from '../lib/userApi'
import TextCard from '../components/TextCard'
import ImageCard from '../components/ImageCard'
import SkeletonCard from '../components/SkeletonCard'

export default function StarredPage() {
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchBookmarks().then((data) => {
      if (!cancelled) { setBookmarks(data.results || []); setLoading(false) }
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function handleUnstar(promptId) {
    setBookmarks((prev) => prev.filter((p) => p.id !== promptId))
    await removeBookmark(promptId)
  }

  const textBookmarks  = bookmarks.filter((p) => !p.img)
  const imageBookmarks = bookmarks.filter((p) =>  !!p.img)

  return (
    <div className="feed">
      <div className="feed-header">
        <div className="feed-tabs">
          <div className="feed-tab active">
            Starred Prompts
            {!loading && bookmarks.length > 0 && (
              <span className="tab-badge" style={{ marginLeft: 6 }}>{bookmarks.length}</span>
            )}
          </div>
        </div>
      </div>

      <div className="feed-section">
        {loading ? (
          <>{[1,2,3].map((i) => <SkeletonCard key={i} />)}</>
        ) : bookmarks.length === 0 ? (
          <div className="page-placeholder">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <div className="page-placeholder-text">No starred prompts yet</div>
            <div className="page-placeholder-sub">
              Star prompts you love. They'll appear here for quick access.{' '}
              <Link to="/" style={{ color: 'var(--accent)' }}>Explore the feed →</Link>
            </div>
          </div>
        ) : (
          <>
            {textBookmarks.length > 0 && (
              <div className="text-list">
                {textBookmarks.map((p) => (
                  <div key={p.id} style={{ position: 'relative' }}>
                    <TextCard prompt={p} />
                    <button
                      className="unstar-btn"
                      onClick={() => handleUnstar(p.id)}
                      title="Remove from starred"
                    >
                      ★
                    </button>
                  </div>
                ))}
              </div>
            )}
            {imageBookmarks.length > 0 && (
              <div className="masonry" style={{ marginTop: textBookmarks.length > 0 ? 32 : 0 }}>
                {imageBookmarks.map((p) => (
                  <ImageCard key={p.id} prompt={p} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
