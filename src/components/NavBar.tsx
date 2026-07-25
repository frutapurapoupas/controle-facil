import { NavLink } from 'react-router-dom'

export default function NavBar() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
        Início
      </NavLink>
      <NavLink to="/accounts" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
        Contas
      </NavLink>
      <NavLink to="/reports" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
        Extrato
      </NavLink>
      <NavLink to="/statement" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
        PDF
      </NavLink>
    </nav>
  )
}
