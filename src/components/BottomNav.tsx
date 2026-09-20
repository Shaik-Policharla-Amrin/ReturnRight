import { Home, ListChecks } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { theme } from '../theme'

export default function BottomNav() {
  return (
    <nav className="mobile-bottom-nav" aria-label="Primary navigation">
      <NavLink to="/dashboard" className="bottom-nav-link">
        <Home size={19} />
        <span style={{ fontSize: 11, fontWeight: 600 }}>Home</span>
      </NavLink>

      <NavLink to="/purchases" className="bottom-nav-link">
        <ListChecks size={19} />
        <span style={{ fontSize: 11, fontWeight: 600 }}>Purchases</span>
      </NavLink>
    </nav>
  )
}
