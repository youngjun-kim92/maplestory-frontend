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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0f1729' }}>
      {/* 상단 헤더 */}
      <header style={{ backgroundColor: '#1a1a2e', borderBottom: '1px solid #2d3748' }} className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍁</span>
            <span className="font-bold text-orange-400 text-lg hidden sm:block">메이플 가계부</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm hidden sm:block">
              <span className="text-orange-300 font-medium">{user?.nickname}</span> 님
            </span>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 text-sm transition-colors px-3 py-1 rounded border border-slate-600 hover:border-red-400"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* 사이드바 (데스크탑) */}
        <nav
          className="hidden md:flex flex-col w-20 lg:w-52 py-4 gap-1 sticky top-14 h-[calc(100vh-3.5rem)]"
          style={{ backgroundColor: '#1a1a2e', borderRight: '1px solid #2d3748' }}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all text-sm font-medium ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span className="hidden lg:block">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* 하단 네비게이션 바 (모바일) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center h-16 px-2"
        style={{ backgroundColor: '#1a1a2e', borderTop: '1px solid #2d3748' }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${
                isActive ? 'text-orange-400' : 'text-slate-500'
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
