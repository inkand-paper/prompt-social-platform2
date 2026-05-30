// App.jsx
// Layout shell for all routes that use the Navbar + sidebar grid.
// Auth-only or public-content routes that DON'T need this shell
// (Login, Register, ForgotPassword) are mounted directly in main.jsx.

import { Outlet } from 'react-router-dom'
import Navbar      from './components/Navbar'
import LeftSidebar from './components/LeftSidebar'
import RightSidebar from './components/RightSidebar'

export default function App() {
  return (
    <>
      <Navbar />

      <div className="page">
        <LeftSidebar />
        {/* The matched child route renders here */}
        <Outlet />
        <RightSidebar />
      </div>
    </>
  )
}
