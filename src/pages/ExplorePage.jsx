// src/pages/ExplorePage.jsx — Explore feed with category bar

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
  return (
    <>
      <Feed />
    </>
  )
}
