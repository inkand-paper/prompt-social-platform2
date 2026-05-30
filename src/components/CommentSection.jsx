// src/components/CommentSection.jsx
// Threaded (flat for now) comment list + post form.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchComments, postComment } from '../lib/userApi'

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('')
}

export default function CommentSection({ promptId }) {
  const { user, isAuthenticated } = useAuth()
  const [comments, setComments] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [body,     setBody]     = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchComments(promptId).then((data) => {
      if (!cancelled) { setComments(data); setLoading(false) }
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [promptId])

  async function handleSubmit(e) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setSubmitting(true)
    try {
      const newComment = await postComment(promptId, text)
      setComments((prev) => [newComment, ...prev])
      setBody('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="comments-section">
      <div className="comments-heading">
        <span className="comments-count">{comments.length} Comment{comments.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Post form */}
      {isAuthenticated ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <div className="comment-form-row">
            <div
              className="comment-av"
              style={{ background: user?.avatar_color || '#3282B8' }}
            >
              {getInitials(user?.display_name || '')}
            </div>
            <div className="comment-input-wrap">
              <textarea
                className="comment-textarea"
                placeholder="Add a comment…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={2}
                maxLength={2000}
              />
              <div className="comment-form-actions">
                <span className="comment-char-count">{body.length}/2000</span>
                <button
                  type="submit"
                  className="comment-submit-btn"
                  disabled={!body.trim() || submitting}
                >
                  {submitting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="comment-auth-prompt">
          <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link> to leave a comment
        </div>
      )}

      {/* Comment list */}
      {loading ? (
        <div className="comments-loading">
          {[1, 2].map((i) => (
            <div key={i} className="comment-skeleton">
              <div className="sk sk-av" />
              <div style={{ flex: 1 }}>
                <div className="sk sk-line" style={{ width: '30%', marginBottom: 8 }} />
                <div className="sk sk-line" style={{ width: '80%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="comments-empty">Be the first to comment!</div>
      ) : (
        <div className="comment-list">
          {comments.map((c) => (
            <div key={c.id} className="comment-item">
              <div
                className="comment-av"
                style={{ background: c.author?.avatar_color || '#3282B8' }}
              >
                {getInitials(c.author?.display_name || '?')}
              </div>
              <div className="comment-body-wrap">
                <div className="comment-meta">
                  <Link
                    to={`/u/${c.author?.username}`}
                    className="comment-author"
                  >
                    {c.author?.display_name}
                  </Link>
                  <span className="comment-time">{timeAgo(c.created_at)}</span>
                </div>
                <div className="comment-body">{c.body}</div>
                <div className="comment-actions">
                  <button className="comment-like-btn">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                    {c.like_count > 0 && <span>{c.like_count}</span>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
