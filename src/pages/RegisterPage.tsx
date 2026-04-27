import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ nickname: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.nickname) e.nickname = '닉네임을 입력해주세요.'
    else if (form.nickname.length < 2) e.nickname = '닉네임은 2자 이상이어야 합니다.'
    if (!form.password) e.password = '비밀번호를 입력해주세요.'
    else if (form.password.length < 4) e.password = '비밀번호는 4자 이상이어야 합니다.'
    if (form.password !== form.confirmPassword) e.confirmPassword = '비밀번호가 일치하지 않습니다.'
    return e
  }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setLoading(true)
    setErrors({})
    try {
      const res = await authApi.register({ nickname: form.nickname, password: form.password })
      await login(res.data.token)
      navigate('/')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      setErrors({ general: axiosErr.response?.data?.message || '회원가입에 실패했습니다.' })
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
            닉네임과 비밀번호만으로 간편 가입
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
            <h2 className="font-semibold text-base mb-5" style={{ color: 'var(--text)' }}>회원가입</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="닉네임"
                placeholder="메이플 캐릭터 닉네임"
                value={form.nickname}
                onChange={(e) => setForm((p) => ({ ...p, nickname: e.target.value }))}
                error={errors.nickname}
                autoFocus
              />
              <Input
                label="비밀번호"
                type="password"
                placeholder="4자 이상"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                error={errors.password}
              />
              <Input
                label="비밀번호 확인"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                value={form.confirmPassword}
                onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                error={errors.confirmPassword}
              />
              {errors.general && (
                <div
                  className="px-3 py-2.5 rounded-xl text-sm"
                  style={{
                    backgroundColor: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.25)',
                    color: 'var(--red)',
                  }}
                >
                  {errors.general}
                </div>
              )}
              <Button type="submit" size="lg" loading={loading} className="w-full mt-1">
                가입하기
              </Button>
            </form>

            <div className="mt-5 text-center text-sm" style={{ color: 'var(--text-2)' }}>
              이미 계정이 있으신가요?{' '}
              <Link
                to="/login"
                className="font-semibold transition-colors hover:brightness-110"
                style={{ color: 'var(--orange-light)' }}
              >
                로그인
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
