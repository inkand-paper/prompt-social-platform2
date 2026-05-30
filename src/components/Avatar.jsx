// components/Avatar.jsx
// Shows user avatar image or falls back to coloured initials circle.
// Props:
//   initials    — 2-char string e.g. "AJ"
//   avatarUrl   — full S3/CDN URL (optional) — shown as <img> if provided
//   avatarColor — hex colour string e.g. "#3282B8" — used as background if no avatarUrl
//   av          — legacy integer index (0–4) — still supported for existing data
//   size        — 'sm' | 'md' | 'lg'

const COLORS = ['#3282B8', '#2a6d9e', '#3d8fc2', '#1f5f88', '#4899cc']

export default function Avatar({ initials = '?', avatarUrl = null, avatarColor = null, av = 0, size = 'sm' }) {
  const dim = size === 'lg' ? '42px' : size === 'md' ? '32px' : '22px'
  const fs  = size === 'lg' ? '15px' : size === 'md' ? '13px' : '8.5px'
  const bg  = avatarColor || COLORS[av] || COLORS[0]

  if (avatarUrl) {
    return (
      <img
        className="author-av"
        src={avatarUrl}
        alt={initials}
        style={{
          width: dim, height: dim,
          borderRadius: '25%', objectFit: 'cover', flexShrink: 0,
        }}
        onError={(e) => {
          // If the image fails to load, fall back to the initials div
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  }

  return (
    <div
      className="author-av"
      style={{
        width: dim, height: dim,
        background: bg, fontSize: fs,
        borderRadius: '25%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 600, flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {initials}
    </div>
  )
}
