import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/dashboard',  label: '대시보드', icon: '📊' },
  { to: '/input',      label: '기록하기', icon: '✏️' },
  { to: '/exp',        label: '경험치',   icon: '📈' },
  { to: '/goals',      label: '목표',     icon: '🎯' },
  { to: '/characters', label: '캐릭터',   icon: '🧙' },
  { to: '/settings',   label: '설정',     icon: '⚙️' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: 'var(--surface)',
          borderBottom: '1.5px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍁</span>
            <span className="hidden sm:block font-bold text-base font-diary" style={{ color: 'var(--text)' }}>
              Maple<span style={{ color: 'var(--primary)' }}>Planner</span>
            </span>
          </div>

          {/* User + logout */}
          <div className="flex items-center gap-2">
            {user && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-sm"
                style={{
                  backgroundColor: 'var(--primary-dim)',
                  border: '1px solid var(--primary-glow)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--green)' }} />
                <span className="font-semibold" style={{ color: 'var(--primary)' }}>{user.nickname}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 rounded-xl transition-all"
              style={{
                color: 'var(--text-2)',
                backgroundColor: 'var(--surface-2)',
                border: '1.5px solid var(--border)',
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar (desktop) */}
        <nav
          className="hidden md:flex flex-col w-16 lg:w-56 py-3 gap-0.5 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto"
          style={{ backgroundColor: 'var(--surface)', borderRight: '1.5px solid var(--border)' }}
        >
          {navItems.map((item) => (
            <div key={item.to} className="px-2">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `nav-sidebar ${isActive ? 'nav-sidebar-active' : ''}`
                }
              >
                <span className="text-xl w-6 text-center shrink-0 leading-none">{item.icon}</span>
                <span className="hidden lg:block">{item.label}</span>
              </NavLink>
            </div>
          ))}
        </nav>

        {/* Main */}
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-8 overflow-auto">
          <div className="max-w-6xl mx-auto w-full fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center h-16 px-1"
        style={{
          backgroundColor: 'var(--surface)',
          borderTop: '1.5px solid var(--border)',
          boxShadow: '0 -2px 12px rgba(61,43,31,0.08)',
        }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-mobile ${isActive ? 'nav-mobile-active' : ''}`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
