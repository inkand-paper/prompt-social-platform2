// src/pages/MyPromptsPage.jsx — Authenticated user's own prompts with CRUD

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchMyPrompts, deletePrompt } from '../lib/userApi'
import { useAuth } from '../context/AuthContext'
import SkeletonCard from '../components/SkeletonCard'
import SharePromptModal from '../components/SharePromptModal'

const VISIBILITY_LABEL = {
  public:   { text: 'Public',   color: '#10b981' },
  unlisted: { text: 'Unlisted', color: '#f59e0b' },
  private:  { text: 'Private',  color: '#6b7280' },
}

export default function MyPromptsPage() {
  const { user } = useAuth()
  const [prompts,  setPrompts]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showModal, setModal]   = useState(false)
  const [deleting,  setDeleting] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchMyPrompts().then((data) => {
      if (!cancelled) { setPrompts(data.results || []); setLoading(false) }
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function handleDelete(id) {
    if (!confirm('Delete this prompt? This cannot be undone.')) return
    setDeleting(id)
    try {
      await deletePrompt(id)
      setPrompts((prev) => prev.filter((p) => p.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="feed">
      <div className="feed-header">
        <div className="feed-tabs">
          <div className="feed-tab active">
            My Prompts
            {!loading && prompts.length > 0 && (
              <span className="tab-badge" style={{ marginLeft: 6 }}>{prompts.length}</span>
            )}
          </div>
        </div>
        <button className="share-btn" style={{ width: 'auto', padding: '7px 16px', fontSize: 'var(--fs-sm)' }} onClick={() => setModal(true)}>
          + New Prompt
        </button>
      </div>

      <div className="feed-section">
        {loading ? (
          <>{[1,2,3].map((i) => <SkeletonCard key={i} />)}</>
        ) : prompts.length === 0 ? (
          <div className="page-placeholder">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            <div className="page-placeholder-text">No prompts yet</div>
            <div className="page-placeholder-sub">
              Share your first prompt with the community!{' '}
              <button className="inline-link" onClick={() => setModal(true)}>Create one now →</button>
            </div>
          </div>
        ) : (
          <div className="my-prompts-list">
            {prompts.map((p) => {
              const vis = VISIBILITY_LABEL[p.visibility] || VISIBILITY_LABEL.public
              return (
                <div key={p.id} className="my-prompt-row">
                  <div className="my-prompt-meta">
                    <span className="my-prompt-cat">{p.cat || 'General'}</span>
                    <span
                      className="my-prompt-visibility"
                      style={{ color: vis.color, border: `1px solid ${vis.color}33` }}
                    >
                      {vis.text}
                    </span>
                  </div>
                  <div className="my-prompt-title">
                    {p.slug ? (
                      <Link to={`/p/${p.slug}`} style={{ color: 'var(--text-hi)', textDecoration: 'none' }}>
                        {p.title}
                      </Link>
                    ) : p.title}
                  </div>
                  <div className="my-prompt-preview">{p.preview}</div>
                  <div className="my-prompt-footer">
                    <div className="my-prompt-stats">
                      <span>⚡ {p.rating?.toFixed(1) || '—'}</span>
                      <span>· {p.ratingCount || 0} ratings</span>
                      {p.copyCount > 0 && <span>· {p.copyCount} copies</span>}
                    </div>
                    <div className="my-prompt-actions">
                      <button className="my-prompt-action-btn">Edit</button>
                      <button
                        className="my-prompt-action-btn danger"
                        onClick={() => handleDelete(p.id)}
                        disabled={deleting === p.id}
                      >
                        {deleting === p.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <SharePromptModal
          onClose={() => setModal(false)}
          onSuccess={(created) => {
            setModal(false)
            setPrompts((prev) => [created, ...prev])
          }}
        />
      )}
    </div>
  )
}
