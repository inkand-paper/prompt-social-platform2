// components/Avatar.jsx
// Coloured circle with initials. av = 0-4 picks the colour.

const COLORS = ['#3282B8', '#2a6d9e', '#3d8fc2', '#1f5f88', '#4899cc']

export default function Avatar({ initials, av, size = 'sm' }) {
  const dim = size === 'lg' ? '42px' : size === 'md' ? '32px' : '22px'
  const fs  = size === 'lg' ? '15px' : size === 'md' ? '13px' : '8.5px'

  return (
    <div
      className="author-av"
      style={{
        width: dim, height: dim,
        background: COLORS[av] || COLORS[0],
        fontSize: fs,
        borderRadius: '25%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 600, flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}
