import { useState } from 'react'
import Feed from '../components/Feed'

const QUICK_CATS = [
  { label: '✨ All',         value: '' },
  { label: '💻 Coding',     value: 'coding' },
  { label: '📣 Marketing',  value: 'marketing' },
  { label: '✍️ Writing',    value: 'writing' },
  { label: '🎨 Design',     value: 'design' },
  { label: '🚀 Startup',    value: 'startup' },
  { label: '📊 Analytics',  value: 'analytics' },
]

export default function ExplorePage() {
  const [selectedCat, setSelectedCat] = useState('')

  return (
    <>
      <div className="cat-filter-bar">
        {QUICK_CATS.map((cat) => (
          <button
            key={cat.value}
            className={`cat-filter-btn ${selectedCat === cat.value ? 'active' : ''}`}
            onClick={() => setSelectedCat(cat.value)}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <Feed category={selectedCat} />
    </>
  )
}
