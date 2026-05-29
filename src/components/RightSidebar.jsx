// components/RightSidebar.jsx
// Right sidebar: trending tags, top prompters, top categories.

const TAGS = ['#marketing', '#coding', '#chatgpt', '#startup', '#seo', '#writing', '#react', '#design']

const PROMPTERS = [
  { name: 'Sara Reeves', initials: 'SR', count: '142 prompts', color: '#3282B8' },
  { name: 'Marcus Kim',  initials: 'MK', count: '118 prompts', color: '#2a6d9e' },
  { name: 'Lena Park',   initials: 'LP', count: '97 prompts',  color: '#3d8fc2' },
  { name: 'Aiko Ota',    initials: 'AO', count: '84 prompts',  color: '#4899cc' },
]

const CATEGORIES = [
  { name: 'Coding',    emoji: '💻', count: '1.4k' },
  { name: 'Marketing', emoji: '📣', count: '1.1k' },
  { name: 'Writing',   emoji: '✍️',  count: '890'  },
  { name: 'UI Design', emoji: '🎨', count: '640'  },
  { name: 'Startup',   emoji: '🚀', count: '510'  },
]

export default function RightSidebar() {
  return (
    <div className="sidebar-right">

      <div className="r-section">
        <div className="r-title">Trending Tags</div>
        <div className="trend-tags">
          {TAGS.map((tag) => (
            <span key={tag} className="trend-tag">{tag}</span>
          ))}
        </div>
      </div>

      <div className="s-div" />

      <div className="r-section">
        <div className="r-title">Top Prompters</div>
        <div className="prompter-list">
          {PROMPTERS.map((p) => (
            <div key={p.name} className="prompter-item">
              <div className="p-av" style={{ background: p.color }}>{p.initials}</div>
              <div>
                <div className="prompter-name">{p.name}</div>
                <div className="prompter-count">{p.count}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="s-div" />

      <div className="r-section">
        <div className="r-title">Top Categories</div>
        <div className="cat-list">
          {CATEGORIES.map((c) => (
            <div key={c.name} className="cat-item">
              <div className="cat-name">
                <span className="cat-ico">{c.emoji}</span>
                {c.name}
              </div>
              <div className="cat-count">{c.count}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
