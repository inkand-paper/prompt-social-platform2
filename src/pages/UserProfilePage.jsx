// src/pages/UserProfilePage.jsx — Public user profile
// Route: /u/:username

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchUserProfile, fetchUserPrompts } from '../lib/userApi'
import { useAuth } from '../context/AuthContext'
import FollowButton from '../components/FollowButton'
import Avatar from '../components/Avatar'
import TextCard from '../components/TextCard'
import ImageCard from '../components/ImageCard'

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('')
}
function fmtNum(n = 0) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

const PROFILE_TABS = ['Prompts', 'Collections', 'About']

export default function UserProfilePage() {
  const { username } = useParams()
  const { user: me } = useAuth()

  const [profile, setProfile] = useState(null)
  const [prompts, setPrompts] = useState([])
  const [profileLoading, setProfileLoading] = useState(true)
  const [promptsLoading, setPromptsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Prompts')
  const [error, setError] = useState(null)

  const isOwnProfile = me?.username === username

  useEffect(() => {
    let cancelled = false
    setProfileLoading(true)
    setError(null)
    fetchUserProfile(username)
      .then((data) => { if (!cancelled) { setProfile(data); setProfileLoading(false) } })
      .catch((err) => { if (!cancelled) { setError(err.message); setProfileLoading(false) } })
    return () => { cancelled = true }
  }, [username])

  useEffect(() => {
    let cancelled = false
    setPromptsLoading(true)
    fetchUserPrompts(username)
      .then((data) => { if (!cancelled) { setPrompts(data.results || []); setPromptsLoading(false) } })
      .catch(() => { if (!cancelled) setPromptsLoading(false) })
    return () => { cancelled = true }
  }, [username])

  if (profileLoading) return (
    <div className="feed">
      <div className="feed-section" style={{ animation: 'fadeUp 0.3s ease' }}>
        <div className="profile-hero-skeleton">
          <div className="sk sk-av" style={{ width: 72, height: 72 }} />
          <div style={{ flex: 1 }}>
            <div className="sk sk-line" style={{ width: '40%', height: 24, marginBottom: 12 }} />
            <div className="sk sk-line" style={{ width: '60%', height: 14 }} />
          </div>
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className="feed">
      <div className="feed-section">
        <div className="page-placeholder" style={{ marginTop: 64 }}>
          <div className="page-placeholder-text">User not found</div>
          <div className="page-placeholder-sub">@{username} doesn't exist or hasn't joined yet</div>
        </div>
      </div>
    </div>
  )

  const initials = getInitials(profile.display_name)

  return (
    <div className="feed">
      <div className="feed-section">

        {/* Profile hero */}
        <div className="profile-hero">
          <div className="profile-hero-top">
            <Avatar
              initials={initials}
              avatarUrl={profile.avatar_url}
              avatarColor={profile.avatar_color || '#3282B8'}
              size="lg"
            />
            <div className="profile-hero-info">
              <div className="profile-display-name">
                {profile.display_name}
                {profile.is_verified && (
                  <svg className="verified-badge" width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)" stroke="none">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )}
              </div>
              <div className="profile-username">@{profile.username}</div>
              {profile.bio && <div className="profile-bio">{profile.bio}</div>}
              <div className="profile-links">
                {profile.location && (
                  <span className="profile-link-item">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    {profile.location}
                  </span>
                )}
                {profile.website_url && (
                  <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="profile-link-item profile-website">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    {profile.website_url.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>
            <div className="profile-hero-actions">
              {!isOwnProfile && (
                <FollowButton username={username} />
              )}
              {isOwnProfile && (
                <Link to="/settings" className="profile-edit-btn">Edit Profile</Link>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="profile-stats">
            <div className="profile-stat">
              <span className="profile-stat-num">{fmtNum(profile.prompt_count)}</span>
              <span className="profile-stat-label">Prompts</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-num">{fmtNum(profile.follower_count)}</span>
              <span className="profile-stat-label">Followers</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-num">{fmtNum(profile.following_count)}</span>
              <span className="profile-stat-label">Following</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-num profile-stat-rep">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {fmtNum(profile.reputation_score)}
              </span>
              <span className="profile-stat-label">Reputation</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="feed-header" style={{ marginTop: 24 }}>
          <div className="feed-tabs">
            {PROFILE_TABS.map((tab) => (
              <div
                key={tab}
                className={`feed-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </div>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'Prompts' && (
          promptsLoading ? (
            <div style={{ marginTop: 24 }}>
              {[1,2,3].map((i) => (
                <div key={i} className="sk sk-block" style={{ height: 80, marginBottom: 12 }} />
              ))}
            </div>
          ) : prompts.length === 0 ? (
            <div className="page-placeholder" style={{ marginTop: 48 }}>
              <div className="page-placeholder-text">No prompts yet</div>
              <div className="page-placeholder-sub">@{username} hasn't shared any prompts.</div>
            </div>
          ) : (
            <div className="text-list" style={{ marginTop: 16 }}>
              {prompts.filter((p) => p.type !== 'image' && !p.img).map((p) => (
                <TextCard key={p.id} prompt={p} />
              ))}
              <div className="masonry" style={{ marginTop: 24 }}>
                {prompts.filter((p) => p.img).map((p) => (
                  <ImageCard key={p.id} prompt={p} />
                ))}
              </div>
            </div>
          )
        )}

        {activeTab === 'Collections' && (
          <div className="page-placeholder" style={{ marginTop: 48 }}>
            <div className="page-placeholder-text">Collections coming soon</div>
            <div className="page-placeholder-sub">User collections will appear here.</div>
          </div>
        )}

        {activeTab === 'About' && profile.bio && (
          <div style={{ marginTop: 24, maxWidth: 600 }}>
            <div className="detail-section-label" style={{ marginBottom: 12 }}>Bio</div>
            <p style={{ color: 'var(--text-body)', lineHeight: 1.7 }}>{profile.bio}</p>
          </div>
        )}

      </div>
    </div>
  )
}
