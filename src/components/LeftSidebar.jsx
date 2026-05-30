// components/LeftSidebar.jsx
// Uses AuthContext for real user data. All menu items are <Link> tags for proper routing.
// "Share a Prompt" button triggers the SharePromptModal.

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'
import SharePromptModal from './SharePromptModal'

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('')
}

function formatRep(n = 0) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toString()
}

const MENU = [
  {
    label: 'Home',
    to: '/',
    exact: true,
    icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  },
  {
    label: 'Starred Prompts',
    to: '/me/starred',
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    protected: true,
  },
  {
    label: 'My Prompts',
    to: '/me/prompts',
    icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z',
    protected: true,
  },
  {
    label: 'Collections',
    to: '/me/collections',
    icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
    protected: true,
  },
  {
    label: 'Settings',
    to: '/settings',
    icon: 'M12 15a3 3 0 100-6 3 3 0 000 6z',
    protected: true,
  },
]

export default function LeftSidebar() {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()
  const [showModal, setShowModal] = useState(false)

  const initials = user ? getInitials(user.display_name) : '?'

  function isActive(item) {
    if (item.exact) return location.pathname === item.to
    return location.pathname.startsWith(item.to)
  }

  return (
    <div className="sidebar-left">

      {/* User profile */}
      <div className="user-profile">
        {isAuthenticated && user ? (
          <>
            <Avatar
              initials={initials}
              avatarUrl={user.avatar_url}
              avatarColor={user.avatar_color}
              size="md"
            />
            <div>
              <div className="user-name">{user.display_name}</div>
              <div className="user-rep">
                <span className="star">★</span> {formatRep(user.reputation_score)} rep
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="user-av">?</div>
            <div>
              <div className="user-name">Guest</div>
              <div className="user-rep" style={{ fontSize: '11px' }}>
                <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link> to save prompts
              </div>
            </div>
          </>
        )}
      </div>

      {/* Nav menu */}
      <ul className="s-menu">
        {MENU.map((item) => {
          // Hide protected items for guests
          if (item.protected && !isAuthenticated) return null
          return (
            <li key={item.label}>
              <Link
                to={item.to}
                className={isActive(item) ? 'active' : ''}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="s-div" />

      {isAuthenticated ? (
        <button
          id="share-prompt-btn"
          className="share-btn"
          onClick={() => setShowModal(true)}
        >
          + Share a Prompt
        </button>
      ) : (
        <Link to="/register" className="share-btn" style={{ textAlign: 'center', textDecoration: 'none' }}>
          + Get Started
        </Link>
      )}

      {showModal && (
        <SharePromptModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            // TODO: invalidate feed query when backend is live
            // queryClient.invalidateQueries(['feed'])
          }}
        />
      )}

    </div>
  )
}
