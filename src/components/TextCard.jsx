// components/TextCard.jsx
// Layout:
//   • CATEGORY
//   Title
//   ┌─────────────────────────────┐
//   │  [copy btn on the line] │  preview text
//   │         line            │  tags
//   │         line            │
//   │        [AV] Author  ⚡  │
//   └─────────────────────────────┘
// The vertical line + copy button column spans from just below title to the avatar row.

import Avatar from './Avatar'
import BoltRating from './BoltRating'
import CopyButton from './CopyButton'

export default function TextCard({ prompt }) {
  return (
    <div className="text-block">

      {/* Category label — sits above the line section */}
      <div className="prompt-cat">
        <span className="cat-dot" />
        {prompt.cat}
      </div>

      {/* Title — sits above the line section */}
      <div className="prompt-title">{prompt.title}</div>

      {/* Everything below the title is in one flex row:
          left = vertical line with copy button
          right = preview + tags + footer */}
      <div className="card-body">

        {/* Left column: the vertical line. Copy button floats centered on it. */}
        <div className="card-line">
          <CopyButton text={prompt.preview} />
        </div>

        {/* Right column: content + footer stacked */}
        <div className="card-content">
          <div className="text-preview">{prompt.preview}</div>

          <div className="prompt-tags">
            {prompt.tags.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>

          {/* Footer sits inside right column so line ends at avatar level */}
          <div className="prompt-footer">
            <div className="prompt-author">
              <Avatar initials={prompt.initials} av={prompt.av} size="sm" />
              <span className="author-name">{prompt.author}</span>
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