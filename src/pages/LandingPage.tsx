import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function LandingPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSuccess = async (token: string) => {
    await login(token)
    navigate('/dashboard')
  }

  return (
    <div className="auth-bg min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Logo area */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">🍁</div>
        <h1
          className="text-3xl font-bold font-diary"
          style={{ color: 'var(--text)' }}
        >
          MaplePlanner
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-2)' }}>
          오늘도 열심히 메소 벌자! 💪
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-3xl p-6"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1.5px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Tabs */}
        <div
          className="flex rounded-xl p-1 mb-5"
          style={{ backgroundColor: 'var(--surface-2)' }}
        >
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={
                tab === t
                  ? {
                      backgroundColor: 'var(--surface)',
                      color: 'var(--primary)',
                      boxShadow: 'var(--shadow-sm)',
                    }
                  : { color: 'var(--text-2)' }
              }
            >
              {t === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {tab === 'login' ? (
          <LoginForm onSuccess={handleSuccess} />
        ) : (
          <RegisterForm onSuccess={handleSuccess} />
        )}
      </div>

      <p className="mt-6 text-xs" style={{ color: 'var(--text-3)' }}>
        메이플스토리 가계부 · MaplePlanner
      </p>
    </div>
  )
}

const SAVED_NICKNAME_KEY = 'savedNickname'

function LoginForm({ onSuccess }: { onSuccess: (token: string) => void }) {
  const savedNickname = localStorage.getItem(SAVED_NICKNAME_KEY) ?? ''
  const [form, setForm] = useState({ nickname: savedNickname, password: '' })
  const [remember, setRemember] = useState(!!savedNickname)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nickname || !form.password) return
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login(form)
      if (remember) localStorage.setItem(SAVED_NICKNAME_KEY, form.nickname)
      else localStorage.removeItem(SAVED_NICKNAME_KEY)
      onSuccess(res.data.token)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        label="닉네임"
        placeholder="닉네임 입력"
        value={form.nickname}
        onChange={(e) => setForm((p) => ({ ...p, nickname: e.target.value }))}
        autoFocus
      />
      <Input
        label="비밀번호"
        type="password"
        placeholder="비밀번호 입력"
        value={form.password}
        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
      />
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="w-3.5 h-3.5"
          style={{ accentColor: 'var(--primary)' }}
        />
        <span className="text-xs" style={{ color: 'var(--text-2)' }}>아이디 기억하기</span>
      </label>
      {error && (
        <p className="text-xs font-medium" style={{ color: 'var(--red)' }}>{error}</p>
      )}
      <Button type="submit" loading={loading} className="w-full mt-1" size="lg">
        로그인
      </Button>
    </form>
  )
}

function RegisterForm({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [form, setForm] = useState({ nickname: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nickname || !form.password) return
    if (form.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    if (form.password !== form.confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await authApi.register({ nickname: form.nickname, password: form.password })
      onSuccess(res.data.token)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        label="닉네임"
        placeholder="사용할 닉네임"
        value={form.nickname}
        onChange={(e) => setForm((p) => ({ ...p, nickname: e.target.value }))}
        autoFocus
      />
      <Input
        label="비밀번호"
        type="password"
        placeholder="6자 이상"
        value={form.password}
        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
      />
      <Input
        label="비밀번호 확인"
        type="password"
        placeholder="비밀번호 재입력"
        value={form.confirm}
        onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
      />
      {error && (
        <p className="text-xs font-medium" style={{ color: 'var(--red)' }}>{error}</p>
      )}
      <Button type="submit" loading={loading} className="w-full mt-1" size="lg">
        가입하기
      </Button>
    </form>
  )
}
