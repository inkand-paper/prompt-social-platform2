// components/ImageCard.jsx
// Pinterest-style card: image on top, author + rating + copy below.

import Avatar from './Avatar'
import BoltRating from './BoltRating'
import CopyButton from './CopyButton'

export default function ImageCard({ prompt }) {
  return (
    <div className={`prompt-block ${prompt.ar}`}>

      {/* Image + hover overlay */}
      <div className="img-wrap">
        <img
          className="prompt-img"
          src={prompt.img}
          alt={prompt.cat}
          loading="lazy"
        />
        <div className="img-overlay">
          <div className="overlay-text">{prompt.preview}</div>
        </div>
      </div>

      {/* Below-image row */}
      <div className="img-footer">
        <div className="img-author">
          <Avatar initials={prompt.initials} av={prompt.av} size="sm" />
          <span className="author-name">{prompt.author}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <div className="img-rating">
            <BoltRating promptId={prompt.id} initialRating={prompt.rating} />
          </div>
          <CopyButton text={prompt.preview} className="img-copy" />
        </div>
      </div>

    </div>
  )
}
