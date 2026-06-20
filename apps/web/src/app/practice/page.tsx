'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1'
const CATEGORIES = ['All', '3-bet pot', 'Open-raise pot', 'Overcard board', 'Monoboard', 'Paired board', 'Wet board']
const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Advanced']
const POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
const EXERCISE_TYPES = ['GTO Quiz', 'Timed Drill', 'Spaced Repetition']

interface Spot {
  category: string
  difficulty: string
  position: string
  hero_hand: string
  board: string | null
  pot_size: number
  stack_depth: number
  gto_action: string
  gto_frequency: number
  gto_ev: number
  options: { action: string; frequency: number; ev: number; is_gto: boolean }[]
}

interface SessionHistory {
  category: string
  difficulty: string
  position: string
  hero_hand: string
  correct: boolean
  gtoAction: string
  selectedAction: string
}

function mockSpot(): Spot {
  const cats = CATEGORIES.slice(1)
  const diffs = DIFFICULTIES.slice(1)
  const actions = ['Fold', 'Call', 'Raise', 'All-in']
  const gtoIdx = Math.floor(Math.random() * 4)
  return {
    category: cats[Math.floor(Math.random() * cats.length)],
    difficulty: diffs[Math.floor(Math.random() * diffs.length)],
    position: POSITIONS[Math.floor(Math.random() * POSITIONS.length)],
    hero_hand: ['AKs', 'AA', 'KK', 'QQ', 'AQs', 'JJ', 'TT', 'AKo', 'KQs', 'AJs'][Math.floor(Math.random() * 10)],
    board: Math.random() > 0.3 ? 'Kd7h2c' : null,
    pot_size: Math.floor(Math.random() * 80) + 15,
    stack_depth: [50, 75, 100, 125, 150, 200][Math.floor(Math.random() * 6)],
    gto_action: actions[gtoIdx],
    gto_frequency: Math.round(30 + Math.random() * 50),
    gto_ev: Math.round((Math.random() * 4 - 0.5) * 100) / 100,
    options: actions.map((a, i) => ({
      action: a,
      frequency: Math.round(Math.random() * 60 + 5),
      ev: Math.round((Math.random() * 5 - 1) * 100) / 100,
      is_gto: i === gtoIdx,
    })),
  }
}

const SUIT_SYM: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' }
const SUIT_COLOR: Record<string, string> = { h: '#ff7a7a', d: '#ff7a7a', c: '#e8eef7', s: '#e8eef7' }

const DIFFICULTY_COLOR: Record<string, string> = {
  Beginner: '#AAFBB2',
  Intermediate: '#e09b3d',
  Advanced: '#e05a5a',
}

function renderHand(hand: string) {
  const chars = hand.split('')
  const cards: { r: string; s: string }[] = []
  if (chars.length === 2) {
    cards.push({ r: chars[0], s: '' })
    cards.push({ r: chars[1], s: '' })
  } else if (chars.length === 3) {
    cards.push({ r: chars[0], s: '' })
    cards.push({ r: chars[1], s: chars[2] })
  }
  return (
    <div style={{ display: 'inline-flex', gap: 4 }}>
      {cards.map((c, i) => (
        <div key={i} style={{
          width: 36, height: 50, background: '#fff', borderRadius: 6,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 15, boxShadow: '0 2px 8px rgba(0,0,0,.35)',
          color: c.s && (c.s === 'h' || c.s === 'd') ? '#ff7a7a' : '#1a1a1a',
          border: '1px solid #ddd',
        }}>
          <div>{c.r}</div>
          {c.s && <div style={{ fontSize: 16, lineHeight: 1 }}>{SUIT_SYM[c.s] || ''}</div>}
        </div>
      ))}
    </div>
  )
}

function renderBoard(board: string | null) {
  if (!board) return null
  const cards: { r: string; s: string }[] = []
  for (let i = 0; i < board.length; i += 2) {
    cards.push({ r: board[i], s: board[i + 1]?.toLowerCase() || '' })
  }
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '12px 0' }}>
      {cards.map((c, i) => (
        <div key={i} style={{
          width: 44, height: 62, background: '#fff', borderRadius: 6,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 16, boxShadow: '0 2px 8px rgba(0,0,0,.35)',
          color: (c.s === 'h' || c.s === 'd') ? '#ff7a7a' : '#1a1a1a',
          border: '1px solid #ddd',
        }}>
          <div>{c.r}</div>
          <div style={{ fontSize: 18, lineHeight: 1 }}>{SUIT_SYM[c.s] || ''}</div>
        </div>
      ))}
    </div>
  )
}

function ProgressRing({ value, max, size = 56, stroke = 5, color = 'var(--green)' }: { value: number; max: number; size?: number; stroke?: number; color?: string }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = max > 0 ? value / max : 0
  const offset = circumference * (1 - pct)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset .4s ease' }} />
    </svg>
  )
}

export default function PracticePage() {
  const [exerciseType, setExerciseType] = useState('GTO Quiz')
  const [category, setCategory] = useState('All')
  const [difficulty, setDifficulty] = useState('All')
  const [sessionActive, setSessionActive] = useState(false)
  const [spot, setSpot] = useState<Spot | null>(null)
  const [answered, setAnswered] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [stats, setStats] = useState({ total: 0, correct: 0, streak: 0, bestStreak: 0 })
  const [history, setHistory] = useState<SessionHistory[]>([])
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchSpot = useCallback(async () => {
    setAnswered(false)
    setSelectedAction(null)
    try {
      const params = new URLSearchParams()
      if (category !== 'All') params.set('category', category)
      if (difficulty !== 'All') params.set('difficulty', difficulty.toLowerCase())
      const res = await fetch(`${API_BASE}/quiz/random?${params.toString()}`)
      if (res.ok) {
        const d = await res.json()
        if (d?.options) {
          setSpot(d)
          return
        }
      }
    } catch {
      /* fallback */
    }
    setSpot(mockSpot())
  }, [category, difficulty])

  const startSession = () => {
    setSessionActive(true)
    setStats({ total: 0, correct: 0, streak: 0, bestStreak: 0 })
    setHistory([])
    setElapsed(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    fetchSpot()
  }

  const endSession = () => {
    setSessionActive(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleAnswer = (actionName: string) => {
    if (answered || !spot) return
    setSelectedAction(actionName)
    setAnswered(true)
    const isCorrect = spot.options.find(o => o.action === actionName)?.is_gto ?? false
    setStats(prev => ({
      total: prev.total + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
      streak: isCorrect ? prev.streak + 1 : 0,
      bestStreak: isCorrect ? Math.max(prev.bestStreak, prev.streak + 1) : prev.bestStreak,
    }))
    setHistory(prev => [...prev, {
      category: spot.category,
      difficulty: spot.difficulty,
      position: spot.position,
      hero_hand: spot.hero_hand,
      correct: isCorrect,
      gtoAction: spot.gto_action,
      selectedAction: actionName,
    }])
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const accuracy = stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0

  const stl = {
    bg: 'var(--bg)',
    panel: 'var(--panel)',
    border: 'var(--border)',
    text: 'var(--text)',
    muted: 'var(--muted)',
    green: 'var(--green)',
    red: 'var(--red-bright)',
    blue: 'var(--blue)',
  }

  // --- Session Summary Screen ---
  if (!sessionActive && history.length > 0) {
    const byCategory: Record<string, { total: number; correct: number }> = {}
    const byDifficulty: Record<string, { total: number; correct: number }> = {}
    const byPosition: Record<string, { total: number; correct: number }> = {}
    history.forEach(h => {
      byCategory[h.category] = byCategory[h.category] || { total: 0, correct: 0 }
      byCategory[h.category].total++
      if (h.correct) byCategory[h.category].correct++
      byDifficulty[h.difficulty] = byDifficulty[h.difficulty] || { total: 0, correct: 0 }
      byDifficulty[h.difficulty].total++
      if (h.correct) byDifficulty[h.difficulty].correct++
      byPosition[h.position] = byPosition[h.position] || { total: 0, correct: 0 }
      byPosition[h.position].total++
      if (h.correct) byPosition[h.position].correct++
    })

    const accColor = accuracy >= 70 ? stl.green : accuracy >= 50 ? '#e09b3d' : stl.red

    return (
      <div style={{ minHeight: '100vh', background: stl.bg, padding: 24 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
            <h2 style={{ margin: '0 0 6px', color: stl.text, fontSize: 24, fontWeight: 700 }}>Session Complete</h2>
            <div style={{ color: stl.muted, fontSize: 13 }}>Time: {formatTime(elapsed)}</div>
          </div>

          {/* Main stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Spots', value: stats.total, color: stl.text },
              { label: 'Accuracy', value: `${accuracy}%`, color: accColor },
              { label: 'Best Streak', value: stats.bestStreak, color: stats.bestStreak >= 5 ? stl.green : stl.text },
              { label: 'Correct', value: `${stats.correct}/${stats.total}`, color: stl.green },
            ].map(s => (
              <div key={s.label} style={{
                background: stl.panel, borderRadius: 10, padding: '16px 12px', textAlign: 'center',
                border: `1px solid ${stl.border}`,
              }}>
                <div style={{ fontSize: 11, color: stl.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Accuracy ring */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <ProgressRing value={stats.correct} max={stats.total} size={100} stroke={8} color={accColor} />
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: accColor }}>{accuracy}%</div>
                <div style={{ fontSize: 10, color: stl.muted }}>accuracy</div>
              </div>
            </div>
          </div>

          {/* Breakdown by category */}
          <div style={{ background: stl.panel, borderRadius: 10, padding: 16, border: `1px solid ${stl.border}`, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#8a94a6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>By Category</h3>
            {Object.entries(byCategory).map(([cat, d]) => (
              <div key={cat} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: stl.text }}>{cat}</span>
                  <span style={{ color: d.correct / d.total >= 0.6 ? stl.green : '#e09b3d' }}>{d.correct}/{d.total}</span>
                </div>
                <div style={{ height: 4, background: stl.border, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${d.correct / d.total * 100}%`, height: '100%', background: d.correct / d.total >= 0.6 ? stl.green : '#e09b3d', borderRadius: 2, transition: 'width .3s' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Breakdown by difficulty */}
          <div style={{ background: stl.panel, borderRadius: 10, padding: 16, border: `1px solid ${stl.border}`, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#8a94a6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>By Difficulty</h3>
            {Object.entries(byDifficulty).map(([diff, d]) => (
              <div key={diff} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: stl.text }}>{diff}</span>
                  <span style={{ color: d.correct / d.total >= 0.6 ? stl.green : '#e09b3d' }}>{d.correct}/{d.total}</span>
                </div>
                <div style={{ height: 4, background: stl.border, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${d.correct / d.total * 100}%`, height: '100%', background: d.correct / d.total >= 0.6 ? stl.green : '#e09b3d', borderRadius: 2, transition: 'width .3s' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Breakdown by position */}
          <div style={{ background: stl.panel, borderRadius: 10, padding: 16, border: `1px solid ${stl.border}`, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#8a94a6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>By Position</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {Object.entries(byPosition).map(([pos, d]) => (
                <div key={pos} style={{ background: 'var(--border)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: stl.text, marginBottom: 2 }}>{pos}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: d.correct / d.total >= 0.6 ? stl.green : '#e09b3d' }}>
                    {d.correct}/{d.total}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => { endSession(); startSession() }}
              style={{ background: stl.green, color: '#000', border: 'none', padding: '12px 28px', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              New Session
            </button>
            <button onClick={endSession}
              style={{ background: stl.panel, color: stl.muted, border: `1px solid ${stl.border}`, padding: '12px 28px', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Back to Setup
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Setup Screen ---
  if (!sessionActive) return (
    <div style={{ minHeight: '100vh', background: stl.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 20 }}>
      {/* Exercise type selector */}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 8px', color: stl.text, fontSize: 22, fontWeight: 700 }}>Practice</h2>
        <p style={{ margin: 0, color: stl.muted, fontSize: 14, maxWidth: 400 }}>
          Test your GTO knowledge with structured training exercises
        </p>
      </div>

      {/* Exercise type pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {EXERCISE_TYPES.map(et => (
          <button key={et} onClick={() => setExerciseType(et)}
            style={{
              padding: '8px 20px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
              background: exerciseType === et ? stl.green : stl.panel,
              color: exerciseType === et ? '#000' : stl.muted,
              border: `1px solid ${exerciseType === et ? stl.green : stl.border}`,
              fontWeight: exerciseType === et ? 600 : 400,
              transition: 'all .15s',
            }}>{et}</button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', marginTop: 8 }}>
        {[
          { label: 'Category', options: CATEGORIES, sel: category, set: setCategory },
          { label: 'Difficulty', options: DIFFICULTIES, sel: difficulty, set: setDifficulty },
        ].map(g => (
          <div key={g.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: stl.muted, marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{g.label}</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
              {g.options.map(o => (
                <button key={o} onClick={() => g.set(o)}
                  style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                    background: g.sel === o ? stl.green : stl.panel,
                    color: g.sel === o ? '#000' : stl.muted,
                    border: `1px solid ${g.sel === o ? stl.green : stl.border}`,
                    fontWeight: g.sel === o ? 600 : 400,
                  }}>{o}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button onClick={startSession}
        style={{ marginTop: 8, background: stl.green, color: '#000', border: 'none', padding: '12px 36px', borderRadius: 10, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
        Start Practice Session
      </button>
    </div>
  )

  // --- Active Session Screen ---
  return (
    <div style={{ minHeight: '100vh', background: stl.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ height: 52, background: stl.panel, borderBottom: `1px solid ${stl.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: stl.text }}>Practice</span>
        <span style={{ fontSize: 11, color: stl.muted, padding: '2px 8px', borderRadius: 4, background: stl.bg }}>{exerciseType}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 12, color: stl.muted }}>
          <span>Spots: <b style={{ color: stl.text }}>{stats.total}</b></span>
          <span>Accuracy: <b style={{ color: accuracy >= 60 ? stl.green : '#e09b3d' }}>{accuracy}%</b></span>
          <span>Streak: <b style={{ color: stats.streak >= 3 ? stl.green : stl.text }}>{stats.streak}</b></span>
          <span>Time: <b style={{ color: stl.text }}>{formatTime(elapsed)}</b></span>
        </div>
        <button onClick={endSession}
          style={{ background: stl.bg, border: `1px solid ${stl.border}`, color: stl.muted, padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
          End Session
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.3fr 1fr' }} className="practice-grid">
        {/* Left: Spot display */}
        <div style={{ padding: 24, borderRight: `1px solid ${stl.border}` }}>
          {spot && (
            <>
              {/* Tags */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <span style={{ background: stl.panel, color: stl.green, padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{spot.category}</span>
                <span style={{ background: stl.panel, color: DIFFICULTY_COLOR[spot.difficulty] || '#e09b3d', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{spot.difficulty}</span>
                <span style={{ background: stl.panel, color: stl.muted, padding: '4px 10px', borderRadius: 6, fontSize: 12 }}>{spot.position}</span>
              </div>

              {/* Hand display */}
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: stl.muted, marginBottom: 8 }}>Your Hand</div>
                {renderHand(spot.hero_hand)}
              </div>

              {/* Board */}
              {renderBoard(spot.board)}

              {/* Spot info */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, margin: '12px 0 20px', fontSize: 13, color: stl.muted }}>
                <span>Pot: <b style={{ color: stl.text }}>{spot.pot_size}bb</b></span>
                <span>Stack: <b style={{ color: stl.text }}>{spot.stack_depth}bb</b></span>
                <span>Position: <b style={{ color: stl.text }}>{spot.position}</b></span>
              </div>

              {/* Question */}
              <div style={{ fontSize: 15, fontWeight: 600, color: stl.text, marginBottom: 14 }}>What&apos;s the GTO play?</div>

              {/* Action buttons */}
              {spot.options.map(opt => {
                const isSelected = selectedAction === opt.action
                const isCorrect = opt.is_gto
                const actionColor = opt.action === 'Fold' ? stl.muted : opt.action === 'Call' ? stl.blue : stl.red
                return (
                  <button key={opt.action} onClick={() => handleAnswer(opt.action)} disabled={answered}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
                      padding: '12px 16px', marginBottom: 8, borderRadius: 10,
                      cursor: answered ? 'default' : 'pointer',
                      background: isSelected ? (isCorrect ? 'rgba(170,251,178,.12)' : 'rgba(229,57,57,.12)') : stl.panel,
                      border: `1px solid ${isSelected ? (isCorrect ? stl.green : stl.red) : stl.border}`,
                      color: stl.text,
                      opacity: answered && !isSelected && !isCorrect ? 0.4 : 1,
                      outline: answered && isCorrect ? `2px solid ${stl.green}` : 'none',
                      outlineOffset: -2,
                      transition: 'all .15s ease',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {answered && isCorrect && <span style={{ color: stl.green, fontSize: 16 }}>✓</span>}
                      {answered && isSelected && !isCorrect && <span style={{ color: stl.red, fontSize: 16 }}>✗</span>}
                      <span style={{
                        fontWeight: 600, fontSize: 14,
                        color: !answered ? actionColor : undefined,
                      }}>{opt.action}</span>
                    </div>
                    {answered
                      ? <span style={{ fontSize: 12, color: stl.muted }}>EV: <b style={{ color: opt.ev >= 0 ? stl.green : stl.red }}>{opt.ev >= 0 ? '+' : ''}{opt.ev.toFixed(2)}</b></span>
                      : <span style={{ fontSize: 12, color: stl.muted }}>{opt.frequency}%</span>}
                  </button>
                )
              })}

              {/* Feedback + Next */}
              {answered && (
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600, marginBottom: 10,
                    color: selectedAction === spot.options.find(o => o.is_gto)?.action ? stl.green : stl.red,
                  }}>
                    {selectedAction === spot.options.find(o => o.is_gto)?.action ? '✓ Correct!' : `✗ GTO: ${spot.gto_action} (${spot.gto_frequency}%)`}
                  </div>
                  <button onClick={fetchSpot}
                    style={{ background: stl.green, color: '#000', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                    Next Spot →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Session panel */}
        <div style={{ background: stl.panel, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, color: stl.text, fontWeight: 600 }}>Session Stats</h3>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { l: 'Spots', v: stats.total },
              { l: 'Accuracy', v: `${accuracy}%`, c: accuracy >= 60 ? stl.green : '#e09b3d' },
              { l: 'Streak', v: stats.streak, c: stats.streak >= 3 ? stl.green : stl.text },
              { l: 'Best Streak', v: stats.bestStreak, c: stats.bestStreak >= 5 ? stl.green : stl.text },
            ].map(s => (
              <div key={s.l} style={{ background: stl.bg, borderRadius: 8, padding: 10, textAlign: 'center', border: `1px solid ${stl.border}` }}>
                <div style={{ fontSize: 11, color: stl.muted, marginBottom: 4 }}>{s.l}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.c || stl.text }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Accuracy bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: stl.muted, marginBottom: 4 }}>
              <span>Accuracy</span><span>{accuracy}%</span>
            </div>
            <div style={{ height: 6, background: stl.border, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${accuracy}%`, height: '100%', background: accuracy >= 60 ? stl.green : '#e09b3d', borderRadius: 3, transition: 'width .3s' }} />
            </div>
          </div>

          {/* Progress ring */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <ProgressRing value={stats.correct} max={Math.max(stats.total, 1)} size={72} stroke={6} color={accuracy >= 60 ? stl.green : '#e09b3d'} />
          </div>

          {/* Recent history */}
          {history.length > 0 && (
            <>
              <h4 style={{ margin: '0 0 8px', fontSize: 12, color: stl.muted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recent</h4>
              <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                {history.slice().reverse().slice(0, 10).map((h, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                    borderBottom: `1px solid ${stl.border}`, fontSize: 12,
                  }}>
                    <span style={{ color: h.correct ? stl.green : stl.red, fontWeight: 700, fontSize: 14 }}>{h.correct ? '✓' : '✗'}</span>
                    <span style={{ color: stl.text }}>{h.hero_hand}</span>
                    <span style={{ color: stl.muted }}>{h.position}</span>
                    {!h.correct && <span style={{ color: stl.muted, fontSize: 11 }}>→ {h.gtoAction}</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 1100px) { .practice-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
