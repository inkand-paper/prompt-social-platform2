// src/pages/PromptDetailPage.jsx — Full prompt detail view
// Route: /p/:slug

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchPrompt, addBookmark, removeBookmark } from '../lib/userApi'
import { logCopyEvent } from '../lib/feedApi'
import BoltRating from '../components/BoltRating'
import CommentSection from '../components/CommentSection'
import FollowButton from '../components/FollowButton'
import Avatar from '../components/Avatar'

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('')
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PromptDetailPage() {
  const { slug }  = useParams()
  const navigate  = useNavigate()
  const { isAuthenticated } = useAuth()

  const [prompt,  setPrompt]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [copied,  setCopied]  = useState(false)
  const [starred, setStarred] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchPrompt(slug)
      .then((data) => { if (!cancelled) { setPrompt(data); setLoading(false) } })
      .catch((err) => { if (!cancelled) { setError(err.message || 'Prompt not found'); setLoading(false) } })
    return () => { cancelled = true }
  }, [slug])

  function handleCopy() {
    const text = prompt?.body || prompt?.preview || ''
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      logCopyEvent(prompt?.id)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleStar() {
    if (!isAuthenticated) { navigate('/login'); return }
    if (starred) {
      setStarred(false)
      await removeBookmark(prompt.id)
    } else {
      setStarred(true)
      await addBookmark(prompt.id)
    }
  }

  if (loading) return (
    <div className="feed">
      <div className="feed-section" style={{ animation: 'fadeUp 0.3s ease' }}>
        <Link to="/" className="back-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Feed
        </Link>
        <div style={{ marginTop: 32 }}>
          <div className="sk sk-line" style={{ width: '60%', height: 28, marginBottom: 16 }} />
          <div className="sk sk-line" style={{ width: '30%', height: 14, marginBottom: 32 }} />
          <div className="sk sk-block" style={{ height: 200 }} />
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className="feed">
      <div className="feed-section">
        <Link to="/" className="back-link">← Back</Link>
        <div className="page-placeholder" style={{ marginTop: 48 }}>
          <div className="page-placeholder-text">Prompt not found</div>
          <div className="page-placeholder-sub">{error}</div>
        </div>
      </div>
    </div>
  )

  const initials = getInitials(prompt.author || prompt.display_name || '')
  const authorUser = prompt.username ? { username: prompt.username, display_name: prompt.author, avatar_color: prompt.avatarColor } : null

  return (
    <div className="feed">
      <div className="feed-section prompt-detail-page">

        {/* Back nav */}
        <Link to="/" className="back-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Feed
        </Link>

        {/* Header */}
        <div className="detail-header">
          {prompt.cat && (
            <div className="prompt-cat" style={{ padding: 0, marginBottom: 8 }}>
              <span className="cat-dot" />
              {prompt.cat}
            </div>
          )}
          <h1 className="detail-title">{prompt.title}</h1>

          {/* Meta row */}
          <div className="detail-meta">
            {authorUser && (
              <div className="detail-author">
                <Avatar
                  initials={initials}
                  avatarUrl={prompt.avatarUrl || null}
                  avatarColor={prompt.avatarColor || '#3282B8'}
                  size="sm"
                />
                <Link to={`/u/${authorUser.username}`} className="detail-author-name">
                  {authorUser.display_name}
                </Link>
                <FollowButton username={authorUser.username} compact />
              </div>
            )}

            <div className="detail-stats">
              {prompt.views > 0 && (
                <span className="detail-stat">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {prompt.views?.toLocaleString()} views
                </span>
              )}
              {prompt.forks > 0 && (
                <span className="detail-stat">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 01-9 9" />
                  </svg>
                  {prompt.forks} forks
                </span>
              )}
              {prompt.createdAt && (
                <span className="detail-stat">{timeAgo(prompt.createdAt)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        {(prompt.tags || []).length > 0 && (
          <div className="prompt-tags" style={{ marginBottom: 24 }}>
            {(prompt.tags || []).map((tag) => (
              <Link key={tag} to={`/search?q=${encodeURIComponent(tag)}`} className="tag" style={{ textDecoration: 'none' }}>{tag}</Link>
            ))}
          </div>
        )}

        {/* Prompt body */}
        <div className="detail-body-wrap">
          <div className="detail-body-header">
            <span className="detail-body-label">Prompt</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`detail-action-btn ${starred ? 'active' : ''}`}
                onClick={handleStar}
                title={starred ? 'Remove from starred' : 'Star this prompt'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {starred ? 'Starred' : 'Star'}
              </button>
              <button className="detail-action-btn" title="Fork this prompt">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 01-9 9" />
                </svg>
                Fork
              </button>
              <button
                className={`copy-main-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    Copy Prompt
                  </>
                )}
              </button>
            </div>
          </div>
          <pre className="detail-body-text">{prompt.body || prompt.preview}</pre>
        </div>

        {/* Description */}
        {prompt.description && (
          <div className="detail-description">
            <div className="detail-section-label">About this prompt</div>
            <p className="detail-description-text">{prompt.description}</p>
          </div>
        )}

        {/* Rating */}
        <div className="detail-rating-row">
          <div className="detail-section-label">Rate this prompt</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BoltRating promptId={prompt.id} initialRating={prompt.rating || 0} />
            {prompt.ratingCount > 0 && (
              <span className="detail-rating-count">{prompt.ratingCount?.toLocaleString()} ratings</span>
            )}
          </div>
        </div>

        {/* Comments */}
        <div style={{ marginTop: 32 }}>
          <CommentSection promptId={prompt.id} />
        </div>

      </div>
    </div>
  )
}
