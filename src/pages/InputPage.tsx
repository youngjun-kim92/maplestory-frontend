import { useState, useEffect } from 'react'
import { PenLine, Calculator } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { bossApi } from '../api/boss'
import { ledgerApi } from '../api/ledger'
import { charactersApi } from '../api/characters'
import { useAuth } from '../contexts/AuthContext'
import type { BossDropItem, BossMaster, EntryCategory, EntryType, LedgerAddResponse, MapleCharacter, ResetType } from '../types'
import { formatMeso, toDateString, withCurrentTime, difficultyLabel } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import QuickAmountButtons from '../components/ui/QuickAmountButtons'


const RESET_TABS = [
  { key: 'all' as const,     label: '전체' },
  { key: 'daily' as const,   label: '일간' },
  { key: 'weekly' as const,  label: '주간' },
  { key: 'monthly' as const, label: '월간' },
]

const INCOME_CATS: { value: EntryCategory; label: string }[] = [
  { value: 'hunting',  label: '사냥 👾' },
  { value: 'auction',  label: '경매장 🏪' },
  { value: 'sol_erda', label: '솔 에르다 조각 🔮' },
  { value: 'other',    label: '기타 💰' },
]

const EXPENSE_CATS: { value: EntryCategory; label: string }[] = [
  { value: 'cube',        label: '큐브 🎲' },
  { value: 'starforce',   label: '스타포스 ⭐' },
  { value: 'spell_trace', label: '주문서 📜' },
  { value: 'other',       label: '기타 💸' },
]

const ITEM_CATEGORY_LABELS: Record<string, string> = {
  dark_accessory:    '칠흑의 장신구',
  radiant_accessory: '광휘의 장신구',
  dawn_accessory:    '여명 장신구',
  other:             '기타',
}

export default function InputPage() {
  const { activeServerId } = useAuth()
  const [bossList, setBossList] = useState<BossMaster[]>([])
  const [characters, setCharacters] = useState<MapleCharacter[]>([])

  useEffect(() => {
    bossApi.getBossList().then((r) => setBossList(r.data))
    charactersApi.getCharacters().then((r) => setCharacters(r.data))
  }, [activeServerId])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold font-heading" style={{ color: 'var(--text)' }}>
        ✏️ 기록하기
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BossSection bossList={bossList} characters={characters} />
        <GeneralSection characters={characters} />
      </div>
    </div>
  )
}

/* ─── 보스 처치 기록 ─── */
function BossSection({
  bossList,
  characters,
}: {
  bossList: BossMaster[]
  characters: MapleCharacter[]
}) {
  const { refreshUser } = useAuth()
  const [resetFilter, setResetFilter] = useState<ResetType | 'all'>('all')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    bossName: '', difficulty: '', partySize: '1',
    killDate: toDateString(), characterId: '',
  })

  // 캐릭터 로드 시 메인캐릭터를 기본값으로 설정
  useEffect(() => {
    const main = characters.find((c) => c.isMain)
    if (main) setForm((p) => ({ ...p, characterId: String(main.id) }))
  }, [characters])

  // 드랍 아이템 상태
  const [dropItems, setDropItems] = useState<BossDropItem[]>([])
  const [dropItemsLoading, setDropItemsLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const filtered = resetFilter === 'all' ? bossList : bossList.filter((b) => b.resetType === resetFilter)
  const uniqueNames = [...new Set(filtered.map((b) => b.bossName))]
  const difficulties = filtered.filter((b) => b.bossName === form.bossName).map((b) => b.difficulty)
  const selectedBoss = bossList.find((b) => b.bossName === form.bossName && b.difficulty === form.difficulty)
  const maxParty = selectedBoss?.maxPartySize ?? 6

  // partySize가 maxPartySize를 초과하면 자동 조정
  useEffect(() => {
    if (selectedBoss && Number(form.partySize) > selectedBoss.maxPartySize) {
      setForm((p) => ({ ...p, partySize: String(selectedBoss.maxPartySize) }))
    }
  }, [form.bossName, form.difficulty]) // eslint-disable-line

  // 보스+난이도 변경 시 드랍 아이템 자동 로드
  useEffect(() => {
    if (!form.bossName || !form.difficulty) {
      setDropItems([])
      setSelectedItems(new Set())
      return
    }
    let cancelled = false
    setDropItemsLoading(true)
    bossApi.getDropItems(form.bossName, form.difficulty)
      .then((res) => { if (!cancelled) setDropItems(res.data) })
      .catch(() => { if (!cancelled) setDropItems([]) })
      .finally(() => { if (!cancelled) setDropItemsLoading(false) })
    return () => { cancelled = true }
  }, [form.bossName, form.difficulty])

  const handleBossNameChange = (name: string) => {
    const diffs = filtered.filter((b) => b.bossName === name).map((b) => b.difficulty)
    setForm((p) => ({ ...p, bossName: name, difficulty: diffs[0] ?? '', partySize: '1' }))
    setSelectedItems(new Set())
  }

  const handleDifficultyChange = (diff: string) => {
    setForm((p) => ({ ...p, difficulty: diff }))
    setSelectedItems(new Set())
  }

  const changeFilter = (key: ResetType | 'all') => {
    setResetFilter(key)
    setForm((p) => ({ ...p, bossName: '', difficulty: '' }))
  }

  const toggleItem = (name: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!form.bossName || !form.difficulty) return
    setSubmitting(true)
    try {
      const res = await bossApi.recordBossKill({
        bossName: form.bossName,
        difficulty: form.difficulty,
        killDate: withCurrentTime(form.killDate),
        partySize: Number(form.partySize),
        characterId: form.characterId ? Number(form.characterId) : null,
      })
      // 선택된 드랍 아이템 일괄 기록
      if (selectedItems.size > 0) {
        await Promise.all([...selectedItems].map((itemName) =>
          bossApi.recordDrop(res.data.id, itemName)
        ))
      }
      setError(null)
      setSuccess(true)
      setSelectedItems(new Set())
      setForm((p) => ({ ...p, bossName: '', difficulty: '', partySize: '1' }))
      await refreshUser()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? '보스 처치 기록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card title="보스 처치 기록" icon={<img src="/maple-icons/boss.png" alt="" width={20} height={20} style={{ imageRendering: 'pixelated' }} />}>
      {success && (
        <div
          className="mb-3 p-3 rounded-xl"
          style={{ backgroundColor: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--green)' }}>
            ✅ 보스 처치 기록 완료!
            {selectedItems.size === 0 && ' (드랍 아이템 없음)'}
          </p>
        </div>
      )}
      {error && (
        <div
          className="mb-3 p-3 rounded-xl"
          style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--red)' }}>❌ {error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* 보스 유형 필터 */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-2)' }}>
            보스 유형
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {RESET_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => changeFilter(t.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={
                  resetFilter === t.key
                    ? { backgroundColor: 'var(--primary-dim)', color: 'var(--primary)', border: '1px solid var(--primary-glow)' }
                    : { backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 보스 + 난이도 */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="보스"
            options={[
              { value: '', label: '보스 선택' },
              ...uniqueNames.map((n) => ({ value: n, label: n })),
            ]}
            value={form.bossName}
            onChange={(e) => handleBossNameChange(e.target.value)}
          />
          <Select
            label="난이도"
            options={
              difficulties.length > 0
                ? difficulties.map((d) => ({ value: d, label: difficultyLabel(d) }))
                : [{ value: '', label: '보스 먼저 선택' }]
            }
            value={form.difficulty}
            onChange={(e) => handleDifficultyChange(e.target.value)}
            disabled={!form.bossName}
          />
        </div>

        {/* 결정석 미리보기 */}
        {selectedBoss && (
          <div
            className="px-3 py-2 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--primary-dim)', border: '1px solid var(--primary-glow)' }}
          >
            💎 결정석:{' '}
            <span className="font-bold" style={{ color: 'var(--primary)' }}>
              {selectedBoss.crystalPrice.toLocaleString()} 메소
            </span>
          </div>
        )}

        {/* 물욕템 드랍 아이템 선택 — 보스+난이도 선택 시 자동 표시 */}
        {form.bossName && form.difficulty && (
          <div
            className="rounded-xl p-3 space-y-2"
            style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
                📦 물욕템 드랍
              </p>
              {selectedItems.size > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: 'var(--primary-dim)', color: 'var(--primary)' }}
                >
                  {selectedItems.size}개 선택됨
                </span>
              )}
            </div>
            {dropItemsLoading ? (
              <p className="text-xs animate-pulse" style={{ color: 'var(--text-3)' }}>불러오는 중...</p>
            ) : dropItems.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                등록된 드랍 아이템이 없습니다
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {dropItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.itemName)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left"
                    style={
                      selectedItems.has(item.itemName)
                        ? { backgroundColor: 'var(--primary-dim)', color: 'var(--primary)', border: '1px solid var(--primary-glow)' }
                        : { backgroundColor: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }
                    }
                  >
                    {selectedItems.has(item.itemName) ? '✓ ' : ''}{item.itemName}
                    <span className="ml-1 opacity-60">
                      ({ITEM_CATEGORY_LABELS[item.itemCategory] ?? item.itemCategory})
                    </span>
                  </button>
                ))}
              </div>
            )}
            {dropItems.length > 0 && (
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                떴다면 해당 아이템을 선택하세요. 기록하기와 함께 저장됩니다.
              </p>
            )}
          </div>
        )}

        {/* 파티 인원 */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-2)' }}>
            파티 인원 (최대 {maxParty}명)
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setForm((p) => ({ ...p, partySize: String(n) }))}
                className="w-9 h-9 rounded-xl text-sm font-semibold transition-all"
                style={
                  form.partySize === String(n)
                    ? { backgroundColor: 'var(--primary-dim)', color: 'var(--primary)', border: '1.5px solid var(--primary-glow)' }
                    : { backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1.5px solid var(--border)' }
                }
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* 날짜 + 캐릭터 */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="처치 날짜"
            type="date"
            value={form.killDate}
            onChange={(e) => setForm((p) => ({ ...p, killDate: e.target.value }))}
          />
          {characters.length > 0 && (
            <Select
              label="캐릭터"
              options={[
                { value: '', label: '선택 안함' },
                ...characters.map((c) => ({ value: String(c.id), label: c.isMain ? `⭐ ${c.name}` : c.name })),
              ]}
              value={form.characterId}
              onChange={(e) => setForm((p) => ({ ...p, characterId: e.target.value }))}
            />
          )}
        </div>

        <Button
          type="submit"
          loading={submitting}
          disabled={!form.bossName || !form.difficulty}
          className="w-full"
        >
          {selectedItems.size > 0 ? `기록하기 (드랍 ${selectedItems.size}개 포함)` : '기록하기'}
        </Button>
      </form>
    </Card>
  )
}

/* ─── 수익 / 지출 ─── */
function GeneralSection({ characters }: { characters: MapleCharacter[] }) {
  const { refreshUser, activeServer } = useAuth()
  const navigate = useNavigate()
  const [type, setType] = useState<EntryType>('income')
  const [category, setCategory] = useState<EntryCategory>('hunting')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [form, setForm] = useState({
    amount: '', fragments: '', description: '',
    entryDate: toDateString(), characterId: '',
  })
  const [inputMode, setInputMode] = useState<'direct' | 'calc'>('direct')
  const [calcBefore, setCalcBefore] = useState({ meso: '' })
  const [calcAfter, setCalcAfter] = useState({ meso: '' })

  // 캐릭터 로드 시 메인캐릭터를 기본값으로 설정
  useEffect(() => {
    const main = characters.find((c) => c.isMain)
    if (main) setForm((p) => ({ ...p, characterId: String(main.id) }))
  }, [characters])

  const calcAmount = Math.max(0, Number(calcBefore.meso || '0') - Number(calcAfter.meso || '0'))

  const handleTypeChange = (t: EntryType) => {
    setType(t)
    setCategory(t === 'income' ? 'hunting' : 'cube')
    setForm((p) => ({ ...p, amount: '', fragments: '' }))
    setInputMode('direct')
    setCalcBefore({ meso: '' })
    setCalcAfter({ meso: '' })
  }

  const catOptions = type === 'income' ? INCOME_CATS : EXPENSE_CATS
  const isSolErda = category === 'sol_erda'
  const isHunting = category === 'hunting' && type === 'income'
  const solPrice = activeServer?.solErdaFragmentPrice ?? 0
  const solAmount = isSolErda ? (Number(form.fragments) || 0) * solPrice : 0

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 5000)
  }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    const amount = isSolErda ? solAmount : (inputMode === 'calc' ? calcAmount : Number(form.amount))
    if (!amount || amount < 1) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await ledgerApi.addEntry({
        type,
        category,
        amount,
        description: form.description,
        entryDate: withCurrentTime(form.entryDate),
        characterId: form.characterId ? Number(form.characterId) : null,
        solErdaFragments: isHunting && form.fragments ? Number(form.fragments) : null,
      })
      setForm((p) => ({ ...p, amount: '', fragments: '', description: '' }))
      setCalcBefore({ meso: '' })
      setCalcAfter({ meso: '' })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      await refreshUser()
      // 지출 시 목표 지연 경고 표시
      const data = res.data as LedgerAddResponse
      if (data.goalWarnings && data.goalWarnings.length > 0) {
        showToast(data.goalWarnings[0].message)
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? '저장 중 오류가 발생했습니다.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {toast && (
        <div
          className="fixed bottom-20 left-4 right-4 z-50 p-4 rounded-2xl shadow-lg text-sm"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1.5px solid rgba(220,38,38,0.3)',
            color: 'var(--red)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          ⚠️ {toast}
        </div>
      )}

      <Card title="수익 / 지출" icon="📝">
        {success && (
          <div
            className="mb-3 p-3 rounded-xl text-sm"
            style={{ backgroundColor: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)', color: 'var(--green)' }}
          >
            ✅ 기록 완료!
          </div>
        )}
        {error && (
          <div
            className="mb-3 p-3 rounded-xl text-sm"
            style={{ backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--red)' }}
          >
            ❌ {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* 수입/지출 토글 */}
          <div className="flex gap-2">
            {(['income', 'expense'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={
                  type === t
                    ? t === 'income'
                      ? { backgroundColor: 'rgba(22,163,74,0.12)', color: 'var(--green)', border: '1.5px solid rgba(22,163,74,0.25)' }
                      : { backgroundColor: 'rgba(220,38,38,0.1)', color: 'var(--red)', border: '1.5px solid rgba(220,38,38,0.25)' }
                    : { backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1.5px solid var(--border)' }
                }
              >
                {t === 'income' ? '💚 수입' : '🔴 지출'}
              </button>
            ))}
          </div>

          {/* 카테고리 */}
          <div className="flex flex-wrap gap-1.5">
            {catOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={
                  category === opt.value
                    ? { backgroundColor: 'var(--primary-dim)', color: 'var(--primary)', border: '1px solid var(--primary-glow)' }
                    : { backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 인벤 계산 토글 — 지출이고 솔에르다가 아닐 때 */}
          {type === 'expense' && !isSolErda && (
            <div className="flex gap-2">
              {([['direct', <span key="d" className="flex items-center gap-1"><PenLine size={13} strokeWidth={1.75} />직접 입력</span>], ['calc', <span key="c" className="flex items-center gap-1"><Calculator size={13} strokeWidth={1.75} />인벤 계산</span>]] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setInputMode(mode)
                    if (mode === 'calc') {
                      setCalcBefore({ meso: String(activeServer?.inventoryMeso ?? 0) })
                      setCalcAfter({ meso: '' })
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={
                    inputMode === mode
                      ? { backgroundColor: 'var(--primary-dim)', color: 'var(--primary)', border: '1.5px solid var(--primary-glow)' }
                      : { backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }
                  }
                >{label}</button>
              ))}
            </div>
          )}

          {/* 금액 / 솔 에르다 조각 */}
          {isSolErda ? (
            solPrice > 0 ? (
              <div className="space-y-1">
                <Input
                  label="판매한 조각 수"
                  type="number"
                  placeholder="예: 100"
                  value={form.fragments}
                  onChange={(e) => setForm((p) => ({ ...p, fragments: e.target.value }))}
                  min={1}
                />
                {form.fragments && (
                  <p className="text-xs pl-1" style={{ color: 'var(--text-2)' }}>
                    {form.fragments}개 × {solPrice.toLocaleString()}메소 = {formatMeso(solAmount)} 메소
                  </p>
                )}
              </div>
            ) : (
              <div
                className="p-3 rounded-xl text-sm"
                style={{ backgroundColor: 'var(--surface-2)', border: '1px dashed var(--border-2)' }}
              >
                <span style={{ color: 'var(--text-2)' }}>개당 가격 미설정. </span>
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="underline font-medium"
                  style={{ color: 'var(--primary)' }}
                >
                  설정하기 →
                </button>
              </div>
            )
          ) : (
            <div className="space-y-3">
              {type === 'expense' && inputMode === 'calc' ? (
                <div className="space-y-2">
                  <div
                    className="px-3 py-2 rounded-lg text-xs"
                    style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}
                  >
                    <span style={{ color: 'var(--text-3)' }}>현재 인벤 메소: </span>
                    <span className="font-semibold" style={{ color: 'var(--text-2)' }}>
                      {formatMeso(Number(calcBefore.meso || '0'))}
                    </span>
                  </div>
                  <div>
                    <Input
                      label="강화 후 남은 인벤 메소"
                      type="number"
                      placeholder="강화 후 인벤 메소 입력"
                      value={calcAfter.meso}
                      onChange={(e) => setCalcAfter({ meso: e.target.value })}
                      min={0}
                    />
                    {calcAfter.meso !== '' && Number(calcAfter.meso) >= 0 && (
                      <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>
                        {formatMeso(Number(calcAfter.meso))}
                      </p>
                    )}
                  </div>
                  {calcAmount > 0 && (
                    <div className="px-3 py-2 rounded-xl text-xs font-semibold"
                      style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }}>
                      💸 강화 비용: {formatMeso(calcAmount)} 메소
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Input
                    label="금액 (메소)"
                    type="number"
                    placeholder="예: 50000000"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    min={1}
                  />
                  <QuickAmountButtons
                    onAdd={(v) => setForm((p) => ({ ...p, amount: String((Number(p.amount) || 0) + v) }))}
                  />
                  {form.amount && Number(form.amount) > 0 && (
                    <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-2)' }}>
                      = {formatMeso(Number(form.amount))} 메소
                    </p>
                  )}
                </div>
              )}
              {isHunting && (
                <div>
                  <Input
                    label="솔 에르다 조각 개수 (선택)"
                    type="number"
                    placeholder="획득한 조각 수"
                    value={form.fragments}
                    onChange={(e) => setForm((p) => ({ ...p, fragments: e.target.value }))}
                    min={0}
                  />
                  <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>
                    사냥 중 얻은 조각 개수를 입력하면 캐릭터별 보유 현황에 자동 반영됩니다.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="날짜"
              type="date"
              value={form.entryDate}
              onChange={(e) => setForm((p) => ({ ...p, entryDate: e.target.value }))}
            />
            {characters.length > 0 && (
              <Select
                label="캐릭터"
                options={[
                  { value: '', label: '선택 안함' },
                  ...characters.map((c) => ({ value: String(c.id), label: c.isMain ? `⭐ ${c.name}` : c.name })),
                ]}
                value={form.characterId}
                onChange={(e) => setForm((p) => ({ ...p, characterId: e.target.value }))}
              />
            )}
          </div>

          <Input
            label="메모 (선택)"
            placeholder="간단한 메모"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />

          <Button
            type="submit"
            loading={submitting}
            disabled={isSolErda ? (!form.fragments || !solPrice) : (inputMode === 'calc' ? !calcAmount : !form.amount)}
            className="w-full"
          >
            기록하기
          </Button>
        </form>
      </Card>
    </>
  )
}
