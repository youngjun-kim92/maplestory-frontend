import { useState, useEffect } from 'react'
import { authApi } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'
import { formatMeso } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()

  const [solPrice, setSolPrice] = useState(String(user?.solErdaFragmentPrice ?? 0))
  const [solSubmitting, setSolSubmitting] = useState(false)
  const [solSuccess, setSolSuccess] = useState(false)
  const [solError, setSolError] = useState<string | null>(null)

  const [mesoForm, setMesoForm] = useState({
    inventoryMeso: String(user?.inventoryMeso ?? 0),
    storageMeso: String(user?.storageMeso ?? 0),
  })
  const [mesoSubmitting, setMesoSubmitting] = useState(false)
  const [mesoSuccess, setMesoSuccess] = useState(false)
  const [mesoError, setMesoError] = useState<string | null>(null)

  // user 컨텍스트가 갱신되면 폼 값도 동기화
  useEffect(() => {
    if (user) {
      setSolPrice(String(user.solErdaFragmentPrice ?? 0))
      setMesoForm({
        inventoryMeso: String(user.inventoryMeso ?? 0),
        storageMeso: String(user.storageMeso ?? 0),
      })
    }
  }, [user])

  const handleSolSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    const price = Number(solPrice)
    if (isNaN(price) || price < 0) return
    setSolSubmitting(true)
    setSolSuccess(false)
    setSolError(null)
    try {
      await authApi.updateSolErdaPrice(price)
      await refreshUser()
      setSolSuccess(true)
      setTimeout(() => setSolSuccess(false), 2500)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? `저장 실패 (${err?.response?.status ?? '네트워크 오류'})`
      setSolError(msg)
    } finally {
      setSolSubmitting(false)
    }
  }

  const handleMesoSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    const inv = Number(mesoForm.inventoryMeso)
    const sto = Number(mesoForm.storageMeso)
    if (isNaN(inv) || isNaN(sto) || inv < 0 || sto < 0) return
    setMesoSubmitting(true)
    setMesoSuccess(false)
    setMesoError(null)
    try {
      await authApi.updateMesoBalance({ inventoryMeso: inv, storageMeso: sto })
      await refreshUser()
      setMesoSuccess(true)
      setTimeout(() => setMesoSuccess(false), 2500)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? `저장 실패 (${err?.response?.status ?? '네트워크 오류'})`
      setMesoError(msg)
    } finally {
      setMesoSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold font-heading" style={{ color: 'var(--text)' }}>⚙️ 설정</h1>

      {/* Profile info */}
      <Card icon="👤" title="프로필">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: 'var(--primary-dim)', border: '1.5px solid var(--primary-glow)' }}
          >
            🍁
          </div>
          <div>
            <p className="font-bold" style={{ color: 'var(--text)' }}>{user?.nickname}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              가입일: {user?.createdAt?.split('T')[0]}
            </p>
          </div>
        </div>
      </Card>

      {/* Sol Erda price */}
      <Card icon="🔮" title="솔에르다 조각 개당 가격">
        <p className="text-xs mb-3" style={{ color: 'var(--text-2)' }}>
          기록하기 → 수익/지출 탭에서 솔에르다 카테고리 선택 시 자동 환산에 사용됩니다.
        </p>
        {solSuccess && (
          <div
            className="mb-3 p-2.5 rounded-xl text-sm"
            style={{ backgroundColor: 'rgba(22,163,74,0.1)', color: 'var(--green)', border: '1px solid rgba(22,163,74,0.2)' }}
          >
            ✅ 저장되었습니다.
          </div>
        )}
        {solError && (
          <div
            className="mb-3 p-2.5 rounded-xl text-sm"
            style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }}
          >
            ❌ {solError}
          </div>
        )}
        <form onSubmit={handleSolSubmit} className="flex gap-2 items-start">
          <div className="flex-1">
            <Input
              type="number"
              placeholder="예: 1200"
              value={solPrice}
              onChange={(e) => setSolPrice(e.target.value)}
              min={0}
            />
            {solPrice && Number(solPrice) > 0 && (
              <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-2)' }}>
                현재: {Number(solPrice).toLocaleString()} 메소
              </p>
            )}
          </div>
          <Button type="submit" loading={solSubmitting} className="shrink-0">
            저장
          </Button>
        </form>
      </Card>

      {/* Meso balance */}
      <Card icon="💰" title="현재 보유 메소 기록">
        <p className="text-xs mb-3" style={{ color: 'var(--text-2)' }}>
          인벤토리와 창고 메소를 기록해두면 대시보드에서 합계를 확인할 수 있습니다.
        </p>

        {/* Current values */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: '인벤토리', value: user?.inventoryMeso ?? 0 },
            { label: '창고',     value: user?.storageMeso ?? 0 },
            { label: '합계',     value: user?.totalMeso ?? 0, highlight: true },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl p-2.5 text-center"
              style={{
                backgroundColor: item.highlight ? 'var(--primary-dim)' : 'var(--surface-2)',
                border: `1px solid ${item.highlight ? 'var(--primary-glow)' : 'var(--border)'}`,
              }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{item.label}</p>
              <p className="font-bold text-sm" style={{ color: item.highlight ? 'var(--primary)' : 'var(--text)' }}>
                {formatMeso(item.value)}
              </p>
            </div>
          ))}
        </div>

        {mesoSuccess && (
          <div
            className="mb-3 p-2.5 rounded-xl text-sm"
            style={{ backgroundColor: 'rgba(22,163,74,0.1)', color: 'var(--green)', border: '1px solid rgba(22,163,74,0.2)' }}
          >
            ✅ 저장되었습니다.
          </div>
        )}
        {mesoError && (
          <div
            className="mb-3 p-2.5 rounded-xl text-sm"
            style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }}
          >
            ❌ {mesoError}
          </div>
        )}
        <form onSubmit={handleMesoSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="인벤토리 메소"
              type="number"
              value={mesoForm.inventoryMeso}
              onChange={(e) => setMesoForm((p) => ({ ...p, inventoryMeso: e.target.value }))}
              min={0}
            />
            <Input
              label="창고 메소"
              type="number"
              value={mesoForm.storageMeso}
              onChange={(e) => setMesoForm((p) => ({ ...p, storageMeso: e.target.value }))}
              min={0}
            />
          </div>
          <Button type="submit" loading={mesoSubmitting} className="w-full">
            잔액 업데이트
          </Button>
        </form>
      </Card>

      {/* Info */}
      <div
        className="rounded-2xl p-4 text-xs"
        style={{ backgroundColor: 'var(--surface-2)', border: '1px dashed var(--border-2)', color: 'var(--text-3)' }}
      >
        💡 메이플스토리 주간 초기화는 매주 <strong style={{ color: 'var(--text-2)' }}>목요일 00:00</strong>에 진행됩니다.
        보스 결정석 주간 한도도 이 시점에 초기화됩니다.
      </div>
    </div>
  )
}
