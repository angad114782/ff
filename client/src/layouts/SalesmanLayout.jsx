import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import BrandMark from '../components/BrandMark'

const navItems = [
  { to: '/salesman', label: 'Dashboard', end: true },
  { to: '/salesman/search', label: 'Search Item' },
]

function NavLinks({ onNavigate }) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-2">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
              isActive
                ? 'bg-terracotta text-linen shadow-sm'
                : 'text-ink hover:translate-x-0.5 hover:bg-sand'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default function SalesmanLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (menuOpen) {
      const raf = requestAnimationFrame(() => setDrawerVisible(true))
      return () => cancelAnimationFrame(raf)
    }
    setDrawerVisible(false)
  }, [menuOpen])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-linen md:flex">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-sage-grey bg-sand/60 px-4 py-4 backdrop-blur md:hidden">
        <BrandMark label="Salesman" />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-1.5 text-ink transition-colors hover:bg-sand"
        >
          <span className="text-xl leading-none">☰</span>
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className={`absolute inset-0 bg-ink/40 transition-opacity duration-200 ${
              drawerVisible ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setMenuOpen(false)}
          />
          <aside
            className={`absolute inset-y-0 left-0 flex w-64 flex-col bg-linen shadow-lg transition-transform duration-200 ${
              drawerVisible ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="relative px-4 py-8">
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="absolute right-4 top-8 rounded-md p-1.5 text-ink/60 transition-colors hover:bg-sand hover:text-ink"
              >
                ✕
              </button>
              <BrandMark label="Salesman" variant="full" />
            </div>
            <NavLinks onNavigate={() => setMenuOpen(false)} />
            <div className="border-t border-sage-grey px-4 py-4">
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-medium text-ink/60 transition-colors hover:text-terracotta-deep"
              >
                Log out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sage-grey bg-sand/40 md:flex">
        <div className="px-4 py-8">
          <BrandMark label="Salesman" variant="full" />
        </div>
        <NavLinks />
        <div className="border-t border-sage-grey px-4 py-4">
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm font-medium text-ink/60 transition-colors hover:text-terracotta-deep"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <Outlet />
      </main>
    </div>
  )
}
