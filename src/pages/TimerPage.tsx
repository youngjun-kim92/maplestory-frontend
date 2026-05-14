import { useState, useEffect, useRef } from 'react'

const TIMER_PRESETS = [
  { label: '30분', seconds: 1800 },
  { label: '20분', seconds: 1200 },
  { label: '15분', seconds: 900 },
  { label: '10분', seconds: 600 },
]

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function playAlarm(volume: number) {
  try {
    const ctx = new AudioContext()
    const master = ctx.createGain()
    master.gain.value = volume / 100
    master.connect(ctx.destination)

    // 부드러운 2음 차임벨 (C6 → G5)
    const notes = [1047, 784]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const env = ctx.createGain()
      osc.connect(env)
      env.connect(master)
      osc.type = 'sine'
      osc.frequency.value = freq

      const t = ctx.currentTime + i * 0.28
      env.gain.setValueAtTime(0, t)
      env.gain.linearRampToValueAtTime(0.55, t + 0.015)
      env.gain.exponentialRampToValueAtTime(0.001, t + 1.1)
      osc.start(t)
      osc.stop(t + 1.15)
    })

    setTimeout(() => ctx.close(), 2000)
  } catch { /* ignore */ }
}

export default function TimerPage() {
  const [timerPreset, setTimerPreset] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [volume, setVolume] = useState(70)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const alarmFiredRef = useRef(false)

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning])

  useEffect(() => {
    if (timeLeft === 0 && timerPreset !== null && !isRunning && !alarmFiredRef.current) {
      alarmFiredRef.current = true
      playAlarm(volume)
      setTimeout(() => playAlarm(volume), 1500)
    }
    if (timeLeft > 0) alarmFiredRef.current = false
  }, [timeLeft, timerPreset, isRunning, volume])

  const handlePreset = (seconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTimerPreset(seconds)
    setTimeLeft(seconds)
    setIsRunning(false)
    alarmFiredRef.current = false
  }

  const handleReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTimeLeft(timerPreset ?? 0)
    setIsRunning(false)
    alarmFiredRef.current = false
  }

  const panelStyle = {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
  }

  return (
    <div className="space-y-4 max-w-sm mx-auto">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>⏱️ 사냥 타이머</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
          사냥 시간을 설정하고 종료 시 알람을 받으세요
        </p>
      </div>

      <div className="rounded-xl p-5 space-y-4" style={panelStyle}>
        {/* 프리셋 */}
        <div className="flex gap-2 flex-wrap">
          {TIMER_PRESETS.map((p) => (
            <button
              key={p.seconds}
              type="button"
              onClick={() => handlePreset(p.seconds)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={
                timerPreset === p.seconds
                  ? { backgroundColor: 'var(--primary-dim)', color: 'var(--primary)', border: '1.5px solid var(--primary-glow)' }
                  : { backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }
              }
            >{p.label}</button>
          ))}
        </div>

        {/* 시간 표시 */}
        <div className="text-center py-6">
          {timerPreset === null ? (
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>프리셋을 선택하세요</p>
          ) : (
            <>
              <p
                className="font-bold tabular-nums"
                style={{
                  fontSize: '4rem',
                  color: timeLeft === 0 ? 'var(--red)' : timeLeft <= 60 ? 'var(--orange-light)' : 'var(--text)',
                  letterSpacing: '0.05em',
                }}
              >
                {formatTime(timeLeft)}
              </p>
              {timeLeft === 0 && (
                <p className="text-sm mt-1 font-semibold" style={{ color: 'var(--red)' }}>⏰ 시간 종료!</p>
              )}
            </>
          )}
        </div>

        {/* 컨트롤 버튼 */}
        {timerPreset !== null && (
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => setIsRunning((v) => !v)}
              disabled={timeLeft === 0}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={
                timeLeft === 0
                  ? { backgroundColor: 'var(--surface-2)', color: 'var(--text-3)', opacity: 0.5 }
                  : isRunning
                  ? { backgroundColor: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }
                  : { backgroundColor: 'var(--primary-dim)', color: 'var(--primary)', border: '1px solid var(--primary-glow)' }
              }
            >
              {isRunning ? '⏸ 일시정지' : '▶ 시작'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
            >↺ 초기화</button>
          </div>
        )}

        {/* 음량 + 미리듣기 */}
        <div className="pt-2 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xs shrink-0" style={{ color: 'var(--text-3)' }}>🔔 알람 음량</span>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: 'var(--primary)' }}
            />
            <span className="text-xs w-8 text-right shrink-0" style={{ color: 'var(--text-2)' }}>{volume}%</span>
          </div>
          <button
            type="button"
            onClick={() => playAlarm(volume)}
            className="w-full py-2 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
          >
            🎵 알람 미리듣기
          </button>
        </div>
      </div>
    </div>
  )
}
