import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ nickname: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!form.nickname || !form.password) {
      setError('닉네임과 비밀번호를 입력해주세요.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await authApi.login(form)
      await login(res.data.token)
      navigate('/')
    } catch {
      setError('닉네임 또는 비밀번호가 올바르지 않습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm fade-in">

        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-3xl mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(249,115,22,0.25) 0%, rgba(249,115,22,0.06) 100%)',
              border: '1px solid rgba(249,115,22,0.35)',
              boxShadow: '0 0 32px rgba(249,115,22,0.15)',
            }}
          >
            🍁
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            메이플 <span style={{ color: 'var(--orange-light)' }}>가계부</span>
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-2)' }}>
            스마트한 게임 경제 관리
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Orange top accent */}
          <div
            className="h-0.5 w-full"
            style={{ background: 'linear-gradient(90deg, var(--orange), var(--orange-light), transparent)' }}
          />

          <div className="p-6">
            <h2 className="font-semibold text-base mb-5" style={{ color: 'var(--text)' }}>로그인</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="닉네임"
                placeholder="캐릭터 닉네임을 입력하세요"
                value={form.nickname}
                onChange={(e) => setForm((p) => ({ ...p, nickname: e.target.value }))}
                autoFocus
              />
              <Input
                label="비밀번호"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              />
              {error && (
                <div
                  className="px-3 py-2.5 rounded-xl text-sm"
                  style={{
                    backgroundColor: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.25)',
                    color: 'var(--red)',
                  }}
                >
                  {error}
                </div>
              )}
              <Button type="submit" size="lg" loading={loading} className="w-full mt-1">
                로그인
              </Button>
            </form>

            <div className="mt-5 text-center text-sm" style={{ color: 'var(--text-2)' }}>
              계정이 없으신가요?{' '}
              <Link
                to="/register"
                className="font-semibold transition-colors hover:brightness-110"
                style={{ color: 'var(--orange-light)' }}
              >
                회원가입
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
