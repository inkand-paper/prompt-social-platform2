// components/Navbar.jsx
// Top navigation bar: logo | tabs + search | avatar

export default function Navbar({ activeTab, onTabChange }) {
  const tabs = ['Home', 'Alerts', 'Starred']

  return (
    <div className="nav-shell">
      <div className="nav-inner">

        {/* Logo */}
        <a className="nav-logo" href="#">
          <div className="logo-mark">
            <svg width="14" height="14" viewBox="0 0 24 24">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="white" stroke="none" />
            </svg>
          </div>
          PromptAtlas
        </a>

        {/* Center: tabs + search */}
        <div className="nav-center">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => onTabChange(tab)}
            >
              {tab}
            </button>
          ))}

          <div className="nav-search-wrap">
            <span className="search-ico">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input type="text" placeholder="Search prompts…" />
          </div>
        </div>

        {/* Avatar */}
        <div className="nav-right">
          <div className="nav-avatar">AJ</div>
        </div>

      </div>
    </div>
  )
}
