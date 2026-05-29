// App.jsx
// Root component — puts all pieces together.

import { useState } from 'react'
import Navbar from './components/Navbar'
import LeftSidebar from './components/LeftSidebar'
import Feed from './components/Feed'
import RightSidebar from './components/RightSidebar'

export default function App() {
  const [navTab, setNavTab]   = useState('Home')
  const [menuItem, setMenuItem] = useState('Home')

  return (
    <>
      <Navbar activeTab={navTab} onTabChange={setNavTab} />

      <div className="page">
        <LeftSidebar activeMenu={menuItem} onMenuChange={setMenuItem} />
        <Feed />
        <RightSidebar />
      </div>
    </>
  )
}
