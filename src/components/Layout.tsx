import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { charactersApi } from '../api/characters'

const navItems = [
  { to: '/dashboard',  label: '대시보드',  icon: '📊', desc: '주간 수익·지출 현황' },
  { to: '/boss',       label: '보스 처치', icon: '⚔️', desc: '보스 킬 기록·결정석 수익' },
  { to: '/hunting',    label: '사냥',      icon: '🌲', desc: '사냥 세션·시간당 수익' },
  { to: '/ledger',     label: '가계부',    icon: '📒', desc: '수입·지출 직접 기록' },
  { to: '/characters', label: '캐릭터',    icon: '🧙', desc: '캐릭터 관리·손익분기점' },
  { to: '/favorites',  label: '즐겨찾기',  icon: '⭐', desc: '보스·도핑 템플릿 관리' },
  { to: '/goals',      label: '목표',      icon: '🎯', desc: '목표 아이템 달성 예측' },
  { to: '/stats',      label: '통계',      icon: '📈', desc: '사냥·보스 추이 분석' },
  { to: '/settings',   label: '설정',      icon: '⚙️', desc: '솔 에르다 가격·메소 설정' },
]

const ONBOARDING_KEY = 'onboarding_v1'

const ONBOARDING_STEPS = [
  { icon: '✏️', title: '기록하기', desc: '보스 처치 후 결정석 수익을 기록하고, 사냥·경매장·지출도 입력해 보세요.' },
  { icon: '📊', title: '대시보드', desc: '주간 수익/지출 현황, 달력으로 날짜별 데이터를 한눈에 확인합니다.' },
  { icon: '🎯', title: '목표', desc: '원하는 아이템 가격을 등록하면 달성 예상 날짜를 자동 계산해 드려요.' },
  { icon: '🧙', title: '캐릭터', desc: '캐릭터별 투자 대비 수익(ROI)과 솔 에르다 조각 현황을 관리합니다.' },
  { icon: '⚙️', title: '설정', desc: '솔 에르다 조각 개당 가격과 현재 보유 메소를 설정해 주세요.' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem(ONBOARDING_KEY))
  const [hasNoChars, setHasNoChars] = useState(false)
  const [charBannerDismissed, setCharBannerDismissed] = useState(false)

  useEffect(() => {
    charactersApi.getCharacters().then((r) => setHasNoChars(r.data.length === 0)).catch(() => {})
  }, [location.pathname])
  const [onboardingStep, setOnboardingStep] = useState(0)

  const closeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, '1')
    setShowOnboarding(false)
  }

  const nextStep = () => {
    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
      setOnboardingStep((s) => s + 1)
    } else {
      closeOnboarding()
    }
  }

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
              onClick={toggleTheme}
              title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-all text-base"
              style={{
                backgroundColor: 'var(--surface-2)',
                border: '1.5px solid var(--border)',
              }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
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
            <div key={item.to} className="px-2 relative group">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `nav-sidebar ${isActive ? 'nav-sidebar-active' : ''}`
                }
              >
                <span className="text-xl w-6 text-center shrink-0 leading-none">{item.icon}</span>
                <span className="hidden lg:block">{item.label}</span>
              </NavLink>
              {/* 아이콘만 보이는 너비(md~lg)에서 hover 툴팁 */}
              <div
                className="hidden md:block lg:hidden absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--surface-2)',
                    border: '1px solid var(--border-2)',
                    color: 'var(--text)',
                    boxShadow: 'var(--shadow)',
                  }}
                >
                  {item.label}
                  <span className="block text-xs font-normal mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {item.desc}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div className="mt-auto px-3 pb-3 hidden lg:block">
            <p style={{ color: 'var(--text-3)', fontSize: '10px', textAlign: 'center' }}>made by 콩만</p>
          </div>
        </nav>

        {/* Main */}
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-8 overflow-auto">
          <div className="max-w-6xl mx-auto w-full fade-in">
            {/* 캐릭터 0개 배너 */}
            {hasNoChars && !charBannerDismissed && location.pathname !== '/characters' && (
              <div
                className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'var(--primary-dim)',
                  border: '1.5px solid var(--primary-glow)',
                }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                    🧙 먼저 캐릭터를 등록해주세요
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                    보스/사냥 기록에 캐릭터가 필요합니다.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate('/characters')}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                    style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
                  >
                    캐릭터 등록하기 →
                  </button>
                  <button
                    onClick={() => setCharBannerDismissed(true)}
                    className="text-xs w-6 h-6 flex items-center justify-center rounded"
                    style={{ color: 'var(--text-3)' }}
                  >✕</button>
                </div>
              </div>
            )}
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
          boxShadow: 'var(--shadow)',
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

      {/* 온보딩 모달 */}
      {showOnboarding && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm space-y-4"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
          >
            <div className="text-center">
              <p className="text-4xl mb-1">{ONBOARDING_STEPS[onboardingStep].icon}</p>
              <h2 className="font-bold text-lg" style={{ color: 'var(--text)' }}>
                {onboardingStep === 0 ? '🍁 MaplePlanner에 오신 것을 환영합니다!' : ONBOARDING_STEPS[onboardingStep].title}
              </h2>
            </div>
            <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--text-2)' }}>
              {ONBOARDING_STEPS[onboardingStep].desc}
            </p>

            {/* 스텝 인디케이터 */}
            <div className="flex justify-center gap-1.5">
              {ONBOARDING_STEPS.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: i === onboardingStep ? '20px' : '6px',
                    height: '6px',
                    backgroundColor: i === onboardingStep ? 'var(--primary)' : 'var(--border-2)',
                  }}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={closeOnboarding}
                className="flex-1 py-2 rounded-xl text-sm font-medium"
                style={{ color: 'var(--text-3)', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}
              >
                건너뛰기
              </button>
              <button
                onClick={nextStep}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)' }}
              >
                {onboardingStep < ONBOARDING_STEPS.length - 1 ? '다음 →' : '시작하기 🍁'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
