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

  const handleSubmit = async (e: React.FormEvent) => {
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0f1729' }}>
      <div className="w-full max-w-sm">
        {/* 로고 영역 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🍁</div>
          <h1 className="text-2xl font-bold text-orange-400">메이플 가계부</h1>
          <p className="text-slate-400 text-sm mt-1">스마트한 게임 경제 관리</p>
        </div>

        {/* 로그인 카드 */}
        <div
          className="rounded-2xl p-6 shadow-2xl"
          style={{ backgroundColor: '#1a1a2e', border: '1px solid #2d3748' }}
        >
          <h2 className="text-white font-semibold text-lg mb-5">로그인</h2>
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
              <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
            <Button type="submit" size="lg" loading={loading} className="w-full mt-1">
              로그인
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-400">
            계정이 없으신가요?{' '}
            <Link to="/register" className="text-orange-400 hover:text-orange-300 font-medium">
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
