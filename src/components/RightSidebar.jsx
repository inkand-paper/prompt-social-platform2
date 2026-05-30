// components/RightSidebar.jsx
// Wired to real API: trending tags, top prompters, top categories.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTrendingTags, fetchTopPrompters, fetchCategories } from '../lib/feedApi'

function SidebarSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="sk sk-line" style={{ width: `${60 + i * 10}%` }} />
      ))}
    </div>
  )
}

export default function RightSidebar() {
  const [tags,      setTags]      = useState([])
  const [prompters, setPrompters] = useState([])
  const [cats,      setCats]      = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([fetchTrendingTags(), fetchTopPrompters(), fetchCategories()])
      .then(([t, p, c]) => {
        setTags(t)
        setPrompters(p)
        setCats(c)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function getInitials(name = '') {
    return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('')
  }

  return (
    <div className="sidebar-right">

      {/* Trending Tags */}
      <div className="r-section">
        <div className="r-title">Trending Tags</div>
        {loading ? (
          <div className="trend-tags">
            {[1,2,3,4].map((i) => (
              <div key={i} className="sk sk-block" style={{ height: 28, width: 70, borderRadius: 20 }} />
            ))}
          </div>
        ) : (
          <div className="trend-tags">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/search?q=${encodeURIComponent(tag.slug)}`}
                className="trend-tag"
                style={{ textDecoration: 'none' }}
              >
                {tag.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="s-div" />

      {/* Top Prompters */}
      <div className="r-section">
        <div className="r-title">Top Prompters</div>
        {loading ? <SidebarSkeleton /> : (
          <div className="prompter-list">
            {prompters.map((p) => (
              <Link
                key={p.id}
                to={`/u/${p.username}`}
                className="prompter-item"
                style={{ textDecoration: 'none' }}
              >
                <div className="p-av" style={{ background: p.avatar_color || 'var(--accent)' }}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt={p.display_name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : getInitials(p.display_name)
                  }
                </div>
                <div>
                  <div className="prompter-name">{p.display_name}</div>
                  <div className="prompter-count">{p.prompt_count} prompts</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="s-div" />

      {/* Top Categories */}
      <div className="r-section">
        <div className="r-title">Top Categories</div>
        {loading ? <SidebarSkeleton /> : (
          <div className="cat-list">
            {cats.map((c) => (
              <Link
                key={c.id}
                to={`/search?q=${encodeURIComponent(c.slug)}`}
                className="cat-item"
                style={{ textDecoration: 'none' }}
              >
                <div className="cat-name">
                  <span className="cat-ico">{c.emoji}</span>
                  {c.name}
                </div>
                <div className="cat-count">
                  {c.prompt_count >= 1000 ? `${(c.prompt_count / 1000).toFixed(1)}k` : c.prompt_count}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
