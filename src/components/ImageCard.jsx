// components/ImageCard.jsx
// Pinterest-style card. Copy button now logs the event to the API.

import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import BoltRating from './BoltRating'
import CopyButton from './CopyButton'
import { logCopyEvent } from '../lib/feedApi'

export default function ImageCard({ prompt }) {
  function handleCopy() {
    logCopyEvent(prompt.id)
  }

  return (
    <div className={`prompt-block ${prompt.ar || 'ar-4-3'}`}>

      {/* Image + hover overlay — links to /p/:slug */}
      <div className="img-wrap">
        {prompt.img ? (
          <img
            className="prompt-img"
            src={prompt.img}
            alt={prompt.cat}
            loading="lazy"
          />
        ) : (
          /* Placeholder if no image URL yet */
          <div
            className="prompt-img"
            style={{
              background: 'var(--accent-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: '160px',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
        <div className="img-overlay">
          <div className="overlay-text">{prompt.preview}</div>
        </div>
      </div>

      {/* Below-image meta row */}
      <div className="img-footer">
        <div className="img-author">
          <Avatar
            initials={prompt.initials}
            avatarUrl={prompt.avatarUrl}
            avatarColor={prompt.avatarColor}
            av={prompt.av}
            size="sm"
          />
          {prompt.username ? (
            <Link to={`/u/${prompt.username}`} className="author-name" style={{ textDecoration: 'none' }}>
              {prompt.author}
            </Link>
          ) : (
            <span className="author-name">{prompt.author}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <div className="img-rating">
            <BoltRating promptId={prompt.id} initialRating={prompt.rating} />
          </div>
          <CopyButton text={prompt.preview} className="img-copy" onCopy={handleCopy} />
        </div>
      </div>

    </div>
  )
}
