import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { charactersApi } from '../api/characters'

type NavItem =
  | { type: 'link'; to: string; label: string; icon: string; indent?: boolean; hideMobile?: boolean }
  | { type: 'group'; label: string }

const NAV_ITEMS: NavItem[] = [
  { type: 'link',  to: '/dashboard',  label: '대시보드',  icon: '📊' },
  { type: 'group', label: '기록하기' },
  { type: 'link',  to: '/boss',       label: '보스 처치', icon: '⚔️', indent: true },
  { type: 'link',  to: '/hunting',    label: '사냥',      icon: '🌲', indent: true },
  { type: 'link',  to: '/ledger',     label: '메소 강화', icon: '🔩', indent: true },
  { type: 'link',  to: '/auction',    label: '경매장',    icon: '🏪', indent: true },
  { type: 'link',  to: '/shop',       label: '상점',      icon: '🛒', indent: true },
  { type: 'link',  to: '/characters', label: '캐릭터',    icon: '🧙' },
  { type: 'link',  to: '/settings',   label: '설정',      icon: '⚙️' },
  { type: 'link',  to: '/timer',      label: '타이머',    icon: '⏱️', hideMobile: true },
]

const navLinks = NAV_ITEMS.filter((n): n is Extract<NavItem, { type: 'link' }> => n.type === 'link' && !n.hideMobile)

const ONBOARDING_KEY = 'onboarding_v1'

const ONBOARDING_STEPS = [
  { icon: '✏️', title: '기록하기', desc: '보스 처치 후 결정석 수익을 기록하고, 사냥·경매장·지출도 입력해 보세요.' },
  { icon: '📊', title: '대시보드', desc: '주간 수익/지출 현황, 달력으로 날짜별 데이터를 한눈에 확인합니다.' },
  { icon: '🎯', title: '목표', desc: '원하는 아이템 가격을 등록하면 달성 예상 날짜를 자동 계산해 드려요.' },
  { icon: '🧙', title: '캐릭터', desc: '캐릭터별 투자 대비 수익(ROI)과 솔 에르다 조각 현황을 관리합니다.' },
  { icon: '⚙️', title: '설정', desc: '솔 에르다 조각 개당 가격과 현재 보유 메소를 설정해 주세요.' },
]

const SERVER_MIGRATION_KEY = 'server_migrated_notice_v1'

function ServerBoundary() {
  return <Outlet />
}

export default function Layout() {
  const { user, logout, activeServer, activeServerId, serverKey, setActiveServerId } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem(ONBOARDING_KEY))
  const [hasNoChars, setHasNoChars] = useState(false)
  const [charBannerDismissed, setCharBannerDismissed] = useState(false)
  const [showServerMenu, setShowServerMenu] = useState(false)
  const [showMigrationBanner, setShowMigrationBanner] = useState(
    () => !localStorage.getItem(SERVER_MIGRATION_KEY) && (user?.serverProfiles?.length ?? 0) <= 1
  )
  const serverMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    charactersApi.getCharacters().then((r) => setHasNoChars(r.data.length === 0)).catch(() => {})
  }, [location.pathname, serverKey])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (serverMenuRef.current && !serverMenuRef.current.contains(e.target as Node)) {
        setShowServerMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
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

            {/* 서버 선택기 */}
            {user && user.serverProfiles?.length > 0 && (
              <div className="relative" ref={serverMenuRef}>
                <button
                  onClick={() => setShowServerMenu((v) => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: 'var(--surface-2)',
                    border: '1.5px solid var(--border)',
                    color: 'var(--text)',
                  }}
                >
                  <span>🗺️</span>
                  <span className="hidden sm:inline">{activeServer?.worldDisplayName ?? '서버'}</span>
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>▾</span>
                </button>
                {showServerMenu && (
                  <div
                    className="absolute right-0 top-full mt-1.5 z-50 rounded-xl overflow-hidden min-w-[140px]"
                    style={{ backgroundColor: 'var(--surface)', border: '1.5px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
                  >
                    {user.serverProfiles.map((sp) => (
                      <button
                        key={sp.id}
                        onClick={() => { setActiveServerId(sp.id); setShowServerMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                        style={{
                          backgroundColor: sp.id === activeServerId ? 'var(--primary-dim)' : 'transparent',
                          color: sp.id === activeServerId ? 'var(--primary)' : 'var(--text)',
                        }}
                      >
                        {sp.id === activeServerId && <span className="text-xs">✓</span>}
                        {sp.id !== activeServerId && <span className="text-xs opacity-0">✓</span>}
                        {sp.worldDisplayName}
                      </button>
                    ))}
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      <button
                        onClick={() => { navigate('/settings'); setShowServerMenu(false) }}
                        className="w-full text-left px-3 py-2 text-xs transition-colors"
                        style={{ color: 'var(--text-3)' }}
                      >
                        + 서버 관리
                      </button>
                    </div>
                  </div>
                )}
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
          className="hidden md:flex flex-col w-16 lg:w-[200px] py-3 gap-0.5 sticky top-14 h-[calc(100vh-3.5rem)]"
          style={{ backgroundColor: 'var(--surface)', borderRight: '1.5px solid var(--border)' }}
        >
          {NAV_ITEMS.map((item, idx) => {
            if (item.type === 'group') {
              return (
                <div key={idx} className="px-3 pt-3 pb-0.5 hidden lg:block">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                    {item.label}
                  </p>
                </div>
              )
            }
            return (
              <div key={item.to} className={`relative group ${item.indent ? 'pl-3 pr-2' : 'px-2'}`}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-sidebar ${isActive ? 'nav-sidebar-active' : ''}`
                  }
                >
                  <span className="text-xl w-6 text-center shrink-0 leading-none">{item.icon}</span>
                  <span className="hidden lg:block">{item.label}</span>
                </NavLink>
                {/* 사이드바 hover 툴팁 (접힌 상태 md — 메뉴명만) */}
                <div className="hidden md:block lg:hidden absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: 'max-content' }}>
                  <div
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)', boxShadow: 'var(--shadow)' }}
                  >
                    {item.label}
                  </div>
                </div>
              </div>
            )
          })}
          <div className="mt-auto px-3 pb-3 hidden lg:block">
            <p style={{ color: 'var(--text-3)', fontSize: '10px', textAlign: 'center' }}>made by 콩만</p>
          </div>
        </nav>

        {/* Main */}
        <main className="flex-1 p-2 md:p-3 pb-20 md:pb-6 overflow-auto">
          <div className="max-w-7xl mx-auto w-full fade-in">
            {/* 서버 마이그레이션 안내 배너 (기존 사용자 1회) */}
            {showMigrationBanner && (
              <div
                className="mb-3 flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
                style={{ backgroundColor: 'rgba(99,102,241,0.08)', border: '1.5px solid rgba(99,102,241,0.25)' }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                    🗺️ 멀티 서버 기능이 추가되었습니다
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                    기존 데이터는 스카니아 서버로 자동 이전되었습니다. 설정에서 다른 서버를 추가할 수 있어요.
                  </p>
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem(SERVER_MIGRATION_KEY, '1')
                    setShowMigrationBanner(false)
                  }}
                  className="text-xs w-6 h-6 flex items-center justify-center rounded shrink-0"
                  style={{ color: 'var(--text-3)' }}
                >✕</button>
              </div>
            )}

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
            <ServerBoundary key={serverKey} />
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
        {navLinks.map((item) => (
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
