// components/CopyButton.jsx
// Copies prompt text to clipboard. Shows "Copied!" tooltip for 1.8s.

import { useState } from 'react'

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  )
}

// Props: text (string to copy), className (optional)
export default function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false)

  function handleClick() {
    navigator.clipboard.writeText(text).finally(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <button className={`copy-btn ${className}`} onClick={handleClick}>
      <CopyIcon />
      <span className={`copy-tip ${copied ? 'show' : ''}`}>Copied!</span>
    </button>
  )
}
