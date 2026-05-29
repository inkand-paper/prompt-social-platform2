// components/BoltRating.jsx
// 5 interactive bolt icons. Click to rate, hover to preview.

import { useRating } from '../hooks/useRating'

function BoltFull() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="var(--accent)" stroke="none" />
    </svg>
  )
}

function BoltEmpty() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="rgba(50,130,184,0.2)" stroke="none" />
    </svg>
  )
}

// Half bolt: left side filled, right side dimmed
// uid keeps the SVG clipPath id unique per card + position
function BoltHalf({ uid }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <defs>
        <clipPath id={`hc-${uid}`}>
          <rect x="0" y="0" width="12" height="24" />
        </clipPath>
      </defs>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="rgba(50,130,184,0.2)" stroke="none" />
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="var(--accent)" stroke="none" clipPath={`url(#hc-${uid})`} />
    </svg>
  )
}

// One bolt at position pos, given the current displayRating
function Bolt({ pos, displayRating, uid, onEnter, onLeave, onClick }) {
  const fraction = Math.min(Math.max(displayRating - (pos - 1), 0), 1)

  let icon
  if (fraction >= 0.75)      icon = <BoltFull />
  else if (fraction >= 0.25) icon = <BoltHalf uid={uid} />
  else                       icon = <BoltEmpty />

  return (
    <span
      className="bolt-pos"
      style={{ cursor: 'pointer', lineHeight: 0, display: 'inline-block' }}
      onMouseEnter={() => onEnter(pos)}
      onMouseLeave={onLeave}
      onClick={() => onClick(pos)}
    >
      {icon}
    </span>
  )
}

// Props:
//   promptId     — unique string like 't1' or 'i2'
//   initialRating — number like 4.8
export default function BoltRating({ promptId, initialRating }) {
  const { displayRating, handleMouseEnter, handleMouseLeave, handleClick } = useRating(initialRating)

  return (
    <div className="rating-wrap">
      <span className="bolt-icons">
        {[1, 2, 3, 4, 5].map((pos) => (
          <Bolt
            key={pos}
            pos={pos}
            displayRating={displayRating}
            uid={`${promptId}-${pos}`}
            onEnter={handleMouseEnter}
            onLeave={handleMouseLeave}
            onClick={handleClick}
          />
        ))}
      </span>
      <span className="bolt-score">{parseFloat(displayRating).toFixed(1)}</span>
    </div>
  )
}
