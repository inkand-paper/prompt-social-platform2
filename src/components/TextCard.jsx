// components/TextCard.jsx
// Layout:
//   • CATEGORY
//   Title
//   ┌──────────────────────────────┐
//   │  [copy btn on the line]  │  preview text
//   │        line              │  tags
//   │        line              │
//   │       [AV] Author  ⚡    │
//   └──────────────────────────────┘
// CopyButton now also logs the copy event to the API.

import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import BoltRating from './BoltRating'
import CopyButton from './CopyButton'
import { logCopyEvent } from '../lib/feedApi'

export default function TextCard({ prompt }) {
  function handleCopy() {
    logCopyEvent(prompt.id)
  }

  return (
    <div className="text-block">

      {/* Category label */}
      <div className="prompt-cat">
        <span className="cat-dot" />
        {prompt.cat}
      </div>

      {/* Title — links to prompt detail page if slug is available */}
      {prompt.slug ? (
        <Link to={`/p/${prompt.slug}`} className="prompt-title" style={{ textDecoration: 'none', display: 'block' }}>
          {prompt.title}
        </Link>
      ) : (
        <div className="prompt-title">{prompt.title}</div>
      )}

      {/* Body: vertical line + content */}
      <div className="card-body">

        {/* Left column: line + copy button */}
        <div className="card-line">
          <CopyButton text={prompt.preview} onCopy={handleCopy} />
        </div>

        {/* Right column */}
        <div className="card-content">
          <div className="text-preview">{prompt.preview}</div>

          <div className="prompt-tags">
            {(prompt.tags || []).map((tag) => (
              <Link
                key={tag}
                to={`/tag/${tag.replace('#', '')}`}
                className="tag"
                style={{ textDecoration: 'none' }}
              >
                {tag}
              </Link>
            ))}
          </div>

          <div className="prompt-footer">
            <div className="prompt-author">
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
            <div className="p-btn rated">
              <BoltRating promptId={prompt.id} initialRating={prompt.rating} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}