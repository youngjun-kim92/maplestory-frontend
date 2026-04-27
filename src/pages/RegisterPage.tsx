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

  const handleSubmit = async (e: React.FormEvent) => {
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0f1729' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🍁</div>
          <h1 className="text-2xl font-bold text-orange-400">메이플 가계부</h1>
          <p className="text-slate-400 text-sm mt-1">닉네임과 비밀번호만으로 간편 가입</p>
        </div>

        <div
          className="rounded-2xl p-6 shadow-2xl"
          style={{ backgroundColor: '#1a1a2e', border: '1px solid #2d3748' }}
        >
          <h2 className="text-white font-semibold text-lg mb-5">회원가입</h2>
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
              <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm px-3 py-2 rounded-lg">
                {errors.general}
              </div>
            )}
            <Button type="submit" size="lg" loading={loading} className="w-full mt-1">
              가입하기
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-400">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium">
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
