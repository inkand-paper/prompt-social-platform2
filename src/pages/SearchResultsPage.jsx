// src/pages/SearchResultsPage.jsx
// Real search with debounced query, result tabs, and loading states.

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { searchPrompts } from '../lib/userApi'
import TextCard from '../components/TextCard'
import ImageCard from '../components/ImageCard'

const RESULT_TABS = ['All', 'Texts', 'Images']

function debounce(fn, delay) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay) }
}

export default function SearchResultsPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''

  const [results, setResults]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [activeTab, setTab]     = useState('All')
  const [total, setTotal]       = useState(0)

  const doSearch = useCallback(
    debounce(async (q) => {
      if (!q.trim()) { setResults([]); setTotal(0); setLoading(false); return }
      setLoading(true)
      try {
        const data = await searchPrompts(q, { type: 'all' })
        setResults(data.results || [])
        setTotal(data.total || 0)
      } catch (_) {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350),
    [],
  )

  useEffect(() => {
    doSearch(query)
  }, [query, doSearch])

  const textResults  = results.filter((r) => !r.img)
  const imageResults = results.filter((r) => !!r.img)

  const displayResults =
    activeTab === 'Texts'  ? textResults :
    activeTab === 'Images' ? imageResults :
    results

  return (
    <div className="feed">
      <div className="feed-header">
        <div className="feed-tabs">
          {RESULT_TABS.map((tab) => (
            <div
              key={tab}
              className={`feed-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setTab(tab)}
            >
              {tab}
              {tab === 'Texts'  && textResults.length  > 0 && <span className="tab-badge">{textResults.length}</span>}
              {tab === 'Images' && imageResults.length > 0 && <span className="tab-badge">{imageResults.length}</span>}
            </div>
          ))}
        </div>
        {total > 0 && !loading && (
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginLeft: 'auto', paddingBottom: 2 }}>
            {total.toLocaleString()} result{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {!query ? (
        <div className="feed-section">
          <div className="page-placeholder">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <div className="page-placeholder-text">Search for prompts</div>
            <div className="page-placeholder-sub">Try "marketing email", "react", or "image generation"</div>
          </div>
        </div>
      ) : loading ? (
        <div className="feed-section">
          {[1,2,3].map((i) => (
            <div key={i} className="sk sk-block" style={{ height: 90, marginBottom: 12 }} />
          ))}
        </div>
      ) : displayResults.length === 0 ? (
        <div className="feed-section">
          <div className="page-placeholder">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <div className="page-placeholder-text">No results for "{query}"</div>
            <div className="page-placeholder-sub">Try different keywords or browse the feed</div>
          </div>
        </div>
      ) : (
        <div className="feed-section">
          {/* Text results */}
          {(activeTab === 'All' || activeTab === 'Texts') && textResults.length > 0 && (
            <>
              {activeTab === 'All' && (
                <div className="feed-section-heading" style={{ marginBottom: 16 }}>Text Prompts</div>
              )}
              <div className="text-list">
                {(activeTab === 'All' ? textResults.slice(0, 5) : textResults).map((p) => (
                  <TextCard key={p.id} prompt={p} />
                ))}
              </div>
            </>
          )}

          {/* Image results */}
          {(activeTab === 'All' || activeTab === 'Images') && imageResults.length > 0 && (
            <div style={{ marginTop: activeTab === 'All' ? 32 : 0 }}>
              {activeTab === 'All' && (
                <div className="feed-section-heading" style={{ marginBottom: 16 }}>Image Prompts</div>
              )}
              <div className="masonry">
                {(activeTab === 'All' ? imageResults.slice(0, 6) : imageResults).map((p) => (
                  <ImageCard key={p.id} prompt={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
