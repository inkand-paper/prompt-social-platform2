// src/pages/NotificationsPage.jsx — Real notifications with mark-as-read

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchNotifications, markNotificationsRead } from '../lib/userApi'

const TYPE_ICONS = {
  new_rating:      { icon: '⚡', color: '#f59e0b' },
  new_comment:     { icon: '💬', color: '#3b82f6' },
  comment_reply:   { icon: '↩️', color: '#3b82f6' },
  comment_like:    { icon: '❤️', color: '#ef4444' },
  new_follower:    { icon: '👤', color: '#10b981' },
  prompt_featured: { icon: '⭐', color: '#f59e0b' },
  prompt_forked:   { icon: '🔀', color: '#6366f1' },
  system_message:  { icon: '🔔', color: 'var(--accent)' },
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchNotifications().then((data) => {
      if (!cancelled) { setNotifications(data); setLoading(false) }
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await markNotificationsRead()
  }

  async function handleMarkOne(id) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    await markNotificationsRead([id])
  }

  return (
    <div className="feed">
      <div className="feed-header">
        <div className="feed-tabs">
          <div className="feed-tab active">
            Notifications
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount}</span>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button className="mark-all-btn" onClick={handleMarkAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      <div className="feed-section">
        {loading ? (
          <div>
            {[1,2,3,4].map((i) => (
              <div key={i} className="notif-skeleton">
                <div className="sk sk-av" style={{ width: 40, height: 40 }} />
                <div style={{ flex: 1 }}>
                  <div className="sk sk-line" style={{ width: '70%', marginBottom: 8 }} />
                  <div className="sk sk-line" style={{ width: '30%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="page-placeholder">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <div className="page-placeholder-text">You're all caught up!</div>
            <div className="page-placeholder-sub">No new notifications.</div>
          </div>
        ) : (
          <div className="notif-list">
            {notifications.map((n) => {
              const meta = TYPE_ICONS[n.type] || TYPE_ICONS.system_message
              return (
                <div
                  key={n.id}
                  className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                  onClick={() => !n.is_read && handleMarkOne(n.id)}
                >
                  <div className="notif-icon-wrap" style={{ '--icon-color': meta.color }}>
                    <span className="notif-icon">{meta.icon}</span>
                  </div>
                  <div className="notif-content">
                    <div className="notif-message">{n.message}</div>
                    <div className="notif-time">{timeAgo(n.created_at)}</div>
                  </div>
                  {!n.is_read && <div className="notif-dot" />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
