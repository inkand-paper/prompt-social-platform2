// src/components/FollowButton.jsx
// Handles follow/unfollow with optimistic UI. Auth-gated.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { followUser, unfollowUser } from '../lib/userApi'

export default function FollowButton({ username, initiallyFollowing = false, compact = false }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [following, setFollowing] = useState(initiallyFollowing)
  const [loading, setLoading]     = useState(false)
  const [hovered, setHovered]     = useState(false)

  async function handleClick() {
    if (!isAuthenticated) { navigate('/login'); return }
    setLoading(true)
    try {
      if (following) {
        setFollowing(false) // optimistic
        await unfollowUser(username)
      } else {
        setFollowing(true)  // optimistic
        await followUser(username)
      }
    } catch (_) {
      setFollowing((v) => !v) // rollback
    } finally {
      setLoading(false)
    }
  }

  const label = following
    ? (hovered ? 'Unfollow' : 'Following')
    : 'Follow'

  return (
    <button
      className={`follow-btn ${following ? 'following' : ''} ${compact ? 'compact' : ''}`}
      onClick={handleClick}
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`${label} ${username}`}
    >
      {loading ? '…' : label}
    </button>
  )
}
