// components/Navbar.jsx
// Auth-aware top navigation. Avatar and initials come from AuthContext.
// Search bar routes to /search?q=... via react-router-dom.

import { useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'

const NAV_LINKS = [
  { label: 'Home',        to: '/' },
  { label: 'Alerts',      to: '/notifications' },
  { label: 'Starred',     to: '/me/starred' },
]

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('')
}

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [query, setQuery] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const searchRef = useRef(null)

  function handleSearchSubmit(e) {
    e.preventDefault()
    const q = query.trim()
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`)
      setQuery('')
      searchRef.current?.blur()
    }
  }

  function handleSearchKey(e) {
    if (e.key === 'Escape') {
      setQuery('')
      searchRef.current?.blur()
    }
  }

  const initials = user ? getInitials(user.display_name) : ''

  return (
    <div className="nav-shell">
      <div className="nav-inner">

        {/* Logo */}
        <Link className="nav-logo" to="/">
          <div className="logo-mark">
            <svg width="14" height="14" viewBox="0 0 24 24">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="white" stroke="none" />
            </svg>
          </div>
          PromptAtlas
        </Link>

        {/* Center: nav tabs + search */}
        <div className="nav-center">
          {NAV_LINKS.map(({ label, to }) => {
            const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
            return (
              <Link
                key={label}
                to={to}
                className={`nav-tab ${isActive ? 'active' : ''}`}
              >
                {label}
              </Link>
            )
          })}

          <form className="nav-search-wrap" onSubmit={handleSearchSubmit} role="search">
            <span className="search-ico">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              ref={searchRef}
              id="nav-search-input"
              type="search"
              placeholder="Search prompts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKey}
              autoComplete="off"
            />
          </form>
        </div>

        {/* Right: user avatar or login link */}
        <div className="nav-right">
          {isAuthenticated ? (
            <div className="nav-user-wrap" style={{ position: 'relative' }}>
              <button
                id="nav-avatar-btn"
                className="nav-avatar-btn"
                onClick={() => setShowUserMenu((v) => !v)}
                aria-label="User menu"
                aria-expanded={showUserMenu}
              >
                <Avatar
                  initials={initials}
                  avatarUrl={user.avatar_url}
                  avatarColor={user.avatar_color}
                  size="sm"
                />
              </button>
              {showUserMenu && (
                <div className="user-dropdown" role="menu">
                  <div className="dropdown-header">
                    <div className="dropdown-name">{user.display_name}</div>
                    <div className="dropdown-username">@{user.username}</div>
                  </div>
                  <div className="dropdown-divider" />
                  <Link to={`/u/${user.username}`} className="dropdown-item" onClick={() => setShowUserMenu(false)} role="menuitem">Profile</Link>
                  <Link to="/me/prompts"     className="dropdown-item" onClick={() => setShowUserMenu(false)} role="menuitem">My Prompts</Link>
                  <Link to="/me/collections" className="dropdown-item" onClick={() => setShowUserMenu(false)} role="menuitem">Collections</Link>
                  <Link to="/settings"       className="dropdown-item" onClick={() => setShowUserMenu(false)} role="menuitem">Settings</Link>
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item dropdown-logout"
                    onClick={() => { setShowUserMenu(false); logout() }}
                    role="menuitem"
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="nav-auth-links">
              <Link to="/login"    className="nav-tab">Log In</Link>
              <Link to="/register" className="share-btn" style={{ padding: '6px 14px', fontSize: '13px' }}>Sign Up</Link>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
