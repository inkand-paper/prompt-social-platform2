// components/LeftSidebar.jsx
// Left sidebar: user profile, navigation menu, share button.

const MENU = [
  { label: 'Home',           d: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
  { label: 'Starred Prompts',d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  { label: 'My Prompts',     d: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' },
  { label: 'Collections',    d: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
  { label: 'Settings',       d: 'M12 15a3 3 0 100-6 3 3 0 000 6z' },
]

export default function LeftSidebar({ activeMenu, onMenuChange }) {
  return (
    <div className="sidebar-left">

      {/* User profile */}
      <div className="user-profile">
        <div className="user-av">AJ</div>
        <div>
          <div className="user-name">Alex Johnson</div>
          <div className="user-rep"><span className="star">★</span> 2,840 rep</div>
        </div>
      </div>

      {/* Nav menu */}
      <ul className="s-menu">
        {MENU.map((item) => (
          <li key={item.label}>
            <a
              href="#"
              className={activeMenu === item.label ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); onMenuChange(item.label) }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.d} />
              </svg>
              {item.label}
            </a>
          </li>
        ))}
      </ul>

      <div className="s-div" />

      <button className="share-btn">+ Share a Prompt</button>

    </div>
  )
}
