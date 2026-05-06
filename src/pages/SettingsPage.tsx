import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { serverProfilesApi } from '../api/serverProfiles'
import { useAuth } from '../contexts/AuthContext'
import type { MvpGrade } from '../types'
import { MVP_GRADE_LABELS } from '../types'
import { formatMeso, toKoreanAmount } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import QuickAmountButtons from '../components/ui/QuickAmountButtons'

const WORLD_OPTIONS = [
  { value: 'SCANIA',   label: '스카니아' },
  { value: 'LUNA',     label: '루나' },
  { value: 'ELYSIUM',  label: '엘리시움' },
  { value: 'CROA',     label: '크로아' },
  { value: 'BERA',     label: '베라' },
  { value: 'AURORA',   label: '오로라' },
  { value: 'UNION',    label: '유니온' },
  { value: 'ENOSIS',   label: '이노시스' },
  { value: 'ZENITH',   label: '제니스' },
  { value: 'RED',      label: '레드' },
  { value: 'ARCANE',   label: '아케인' },
  { value: 'NOVA',     label: '노바' },
  { value: 'EOS',      label: '에오스' },
  { value: 'HELIOS',   label: '헬리오스' },
]

export default function SettingsPage() {
  const { user, refreshUser, activeServer, setActiveServerId } = useAuth()
  const navigate = useNavigate()

  const [showResetModal, setShowResetModal] = useState(false)
  const [resetSubmitting, setResetSubmitting] = useState(false)

  const handleReset = async () => {
    setResetSubmitting(true)
    try {
      await authApi.reset()
      await refreshUser()
      setShowResetModal(false)
      navigate('/dashboard')
    } finally {
      setResetSubmitting(false)
    }
  }

  const [mesoForm, setMesoForm] = useState({
    inventoryMeso: String(activeServer?.inventoryMeso ?? 0),
    storageMeso: String(activeServer?.storageMeso ?? 0),
  })
  const [mesoSubmitting, setMesoSubmitting] = useState(false)
  const [mesoSuccess, setMesoSuccess] = useState(false)
  const [mesoError, setMesoError] = useState<string | null>(null)

  const [mvpGrade, setMvpGrade] = useState<string>(user?.mvpGrade ?? 'NORMAL')
  const [mvpSubmitting, setMvpSubmitting] = useState(false)
  const [mvpSuccess, setMvpSuccess] = useState(false)
  const [mvpError, setMvpError] = useState<string | null>(null)

  // 서버 관리
  const [addingServer, setAddingServer] = useState(false)
  const [newWorld, setNewWorld] = useState('SCANIA')
  const [serverSubmitting, setServerSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // activeServer가 바뀌면 폼 동기화
  useEffect(() => {
    if (activeServer) {
      setMesoForm({
        inventoryMeso: String(activeServer.inventoryMeso ?? 0),
        storageMeso: String(activeServer.storageMeso ?? 0),
      })
    }
  }, [activeServer])

  useEffect(() => {
    if (user) {
      setMvpGrade(user.mvpGrade ?? 'NORMAL')
    }
  }, [user])

  const handleMvpSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setMvpSubmitting(true)
    setMvpSuccess(false)
    setMvpError(null)
    try {
      await authApi.updateMvpGrade(mvpGrade as MvpGrade)
      await refreshUser()
      setMvpSuccess(true)
      setTimeout(() => setMvpSuccess(false), 2500)
    } catch (err: any) {
      setMvpError(err?.response?.data?.message ?? '저장 실패')
    } finally {
      setMvpSubmitting(false)
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

  const handleAddServer = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setServerSubmitting(true)
    setServerError(null)
    try {
      const res = await serverProfilesApi.createProfile({ world: newWorld })
      await refreshUser()
      setActiveServerId(res.data.id)
      setAddingServer(false)
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? '서버 추가 실패')
    } finally {
      setServerSubmitting(false)
    }
  }

  const handleDeleteServer = async (id: number) => {
    if (!confirm('이 서버 프로필을 삭제하시겠습니까? 해당 서버의 모든 데이터가 삭제됩니다.')) return
    try {
      await serverProfilesApi.deleteProfile(id)
      await refreshUser()
    } catch (err: any) {
      alert(err?.response?.data?.message ?? '삭제 실패')
    }
  }

  const usedWorlds = new Set(user?.serverProfiles?.map((p) => p.world) ?? [])
  const availableWorlds = WORLD_OPTIONS.filter((w) => !usedWorlds.has(w.value))

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold font-heading" style={{ color: 'var(--text)' }}>⚙️ 설정</h1>

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

      {/* 서버 관리 */}
      <Card icon="🗺️" title="서버 관리">
        <p className="text-xs mb-3" style={{ color: 'var(--text-2)' }}>
          플레이 중인 서버를 추가하면 서버별로 수익/지출을 따로 관리할 수 있습니다.
        </p>
        <div className="space-y-2 mb-3">
          {user?.serverProfiles?.map((sp) => (
            <button
              key={sp.id}
              onClick={() => setActiveServerId(sp.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all"
              style={{
                backgroundColor: sp.id === activeServer?.id ? 'var(--primary-dim)' : 'var(--surface-2)',
                border: `1.5px solid ${sp.id === activeServer?.id ? 'var(--primary-glow)' : 'var(--border)'}`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold w-3" style={{ color: 'var(--primary)' }}>
                  {sp.id === activeServer?.id ? '✓' : ''}
                </span>
                <span className="text-sm font-semibold" style={{ color: sp.id === activeServer?.id ? 'var(--primary)' : 'var(--text)' }}>
                  {sp.worldDisplayName}
                </span>
              </div>
              {(user?.serverProfiles?.length ?? 0) > 1 && (
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteServer(sp.id) }}
                  className="text-xs w-6 h-6 flex items-center justify-center rounded"
                  style={{ color: 'var(--red)' }}
                >✕</span>
              )}
            </button>
          ))}
        </div>

        {serverError && (
          <div className="mb-3 p-2.5 rounded-xl text-sm" style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }}>
            ❌ {serverError}
          </div>
        )}

        {!addingServer && availableWorlds.length > 0 && (
          <button
            onClick={() => { setAddingServer(true); setNewWorld(availableWorlds[0].value) }}
            className="w-full py-2 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'var(--surface-2)', border: '1.5px dashed var(--border-2)', color: 'var(--text-2)' }}
          >
            + 서버 추가
          </button>
        )}

        {addingServer && (
          <form onSubmit={handleAddServer} className="flex gap-2 items-end mt-2">
            <Select
              label="서버 선택"
              options={availableWorlds}
              value={newWorld}
              onChange={(e) => setNewWorld(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" loading={serverSubmitting} className="shrink-0">추가</Button>
            <Button type="button" variant="ghost" onClick={() => setAddingServer(false)} className="shrink-0">취소</Button>
          </form>
        )}
      </Card>

      {/* MVP grade */}
      <Card icon="🏆" title="MVP 등급">
        <p className="text-xs mb-3" style={{ color: 'var(--text-2)' }}>
          MVP 등급은 계정 단위로 설정됩니다. 실버 이상이면 경매장 수수료 3%, 일반·브론즈는 5%가 적용됩니다.
        </p>
        {mvpSuccess && (
          <div className="mb-3 p-2.5 rounded-xl text-sm" style={{ backgroundColor: 'rgba(22,163,74,0.1)', color: 'var(--green)', border: '1px solid rgba(22,163,74,0.2)' }}>
            ✅ 저장되었습니다.
          </div>
        )}
        {mvpError && (
          <div className="mb-3 p-2.5 rounded-xl text-sm" style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }}>
            ❌ {mvpError}
          </div>
        )}
        <form onSubmit={handleMvpSubmit} className="flex gap-2 items-end">
          <Select
            label="현재 MVP 등급"
            options={Object.entries(MVP_GRADE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            value={mvpGrade}
            onChange={(e) => setMvpGrade(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" loading={mvpSubmitting} className="shrink-0">저장</Button>
        </form>
        <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
          💡 PC방 접속 중일 때는 등급에 관계없이 수수료 3%가 적용됩니다.
        </p>
      </Card>

      {/* Meso balance — 현재 활성 서버 기준 */}
      <Card icon="💰" title={`현재 보유 메소 기록 (${activeServer?.worldDisplayName ?? ''})`}>
        <p className="text-xs mb-3" style={{ color: 'var(--text-2)' }}>
          인벤토리와 창고 메소를 기록해두면 대시보드에서 합계를 확인할 수 있습니다.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: '인벤토리', value: activeServer?.inventoryMeso ?? 0 },
            { label: '창고',     value: activeServer?.storageMeso ?? 0 },
            { label: '합계',     value: activeServer?.totalMeso ?? 0, highlight: true },
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
            <div>
              <Input
                label="인벤토리 메소"
                type="number"
                value={mesoForm.inventoryMeso}
                onChange={(e) => setMesoForm((p) => ({ ...p, inventoryMeso: e.target.value }))}
                min={0}
              />
              <QuickAmountButtons onAdd={(v) => setMesoForm((p) => ({ ...p, inventoryMeso: String((Number(p.inventoryMeso) || 0) + v) }))} />
              {toKoreanAmount(mesoForm.inventoryMeso) && (
                <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>{toKoreanAmount(mesoForm.inventoryMeso)}</p>
              )}
            </div>
            <div>
              <Input
                label="창고 메소"
                type="number"
                value={mesoForm.storageMeso}
                onChange={(e) => setMesoForm((p) => ({ ...p, storageMeso: e.target.value }))}
                min={0}
              />
              <QuickAmountButtons onAdd={(v) => setMesoForm((p) => ({ ...p, storageMeso: String((Number(p.storageMeso) || 0) + v) }))} />
              {toKoreanAmount(mesoForm.storageMeso) && (
                <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>{toKoreanAmount(mesoForm.storageMeso)}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMesoForm((p) => ({
                inventoryMeso: '0',
                storageMeso: String((Number(p.storageMeso) || 0) + (Number(p.inventoryMeso) || 0)),
              }))}
              className="flex-1 text-xs px-2 py-1.5 rounded-lg transition-all"
              style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
            >
              창고로 옮기기 →
            </button>
            <button
              type="button"
              onClick={() => setMesoForm((p) => ({
                storageMeso: '0',
                inventoryMeso: String((Number(p.inventoryMeso) || 0) + (Number(p.storageMeso) || 0)),
              }))}
              className="flex-1 text-xs px-2 py-1.5 rounded-lg transition-all"
              style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
            >
              ← 인벤으로 옮기기
            </button>
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

      {/* Danger zone */}
      <Card icon="⚠️" title="위험 구역">
        <p className="text-xs mb-3" style={{ color: 'var(--text-2)' }}>
          모든 기록을 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <Button variant="ghost" onClick={() => setShowResetModal(true)} className="w-full" style={{ color: 'var(--red)', border: '1px solid rgba(220,38,38,0.3)' }}>
          전체 기록 초기화
        </Button>
      </Card>

      {/* Reset confirm modal */}
      {showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm space-y-4"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <h2 className="font-bold text-lg" style={{ color: 'var(--text)' }}>
              전체 기록을 초기화하시겠습니까?
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
              모든 캐릭터, 보스 처치 기록, 사냥 기록, 수입/지출 내역, 목표가 삭제됩니다.
              이 작업은 <strong style={{ color: 'var(--red)' }}>되돌릴 수 없습니다.</strong>
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowResetModal(false)} disabled={resetSubmitting}>
                취소
              </Button>
              <Button
                onClick={handleReset}
                loading={resetSubmitting}
                style={{ backgroundColor: 'var(--red)', color: '#fff', border: 'none' }}
              >
                초기화
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
