import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/', label: '가계부', icon: '📒', exact: true },
  { to: '/boss', label: '보스', icon: '⚔️' },
  { to: '/hunting', label: '사냥터', icon: '🗡️' },
  { to: '/goals', label: '목표', icon: '🎯' },
  { to: '/characters', label: '캐릭터', icon: '🧙' },
  { to: '/stats', label: '통계', icon: '📊' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 1px 24px rgba(0,0,0,0.5)',
        }}
      >
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(249,115,22,0.22) 0%, rgba(249,115,22,0.06) 100%)',
                border: '1px solid rgba(249,115,22,0.3)',
              }}
            >
              🍁
            </div>
            <span className="hidden sm:block font-bold text-lg tracking-tight" style={{ color: 'var(--text)' }}>
              메이플<span style={{ color: 'var(--orange-light)' }}> 가계부</span>
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user && (
              <div
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm"
                style={{
                  backgroundColor: 'rgba(249,115,22,0.08)',
                  border: '1px solid rgba(249,115,22,0.2)',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: 'var(--green)' }}
                />
                <span className="font-semibold" style={{ color: 'var(--orange-light)' }}>
                  {user.nickname}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1.5 rounded-xl transition-all hover:brightness-110"
              style={{
                color: 'var(--text-2)',
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border)',
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
          className="hidden md:flex flex-col w-16 lg:w-56 py-4 gap-0.5 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto"
          style={{ backgroundColor: 'var(--surface)', borderRight: '1px solid var(--border)' }}
        >
          {navItems.map((item) => (
            <div key={item.to} className="px-2">
              <NavLink
                to={item.to}
                end={item.exact}
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

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-auto">
          <div className="max-w-5xl mx-auto fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center h-16 px-1"
        style={{
          backgroundColor: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
        }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
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
