'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

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

const SUIT_SYMBOLS: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' }

const DIFFICULTY_COLOR: Record<string, string> = {
  Beginner: '#AAFBB2',
  Intermediate: '#e09b3d',
  Advanced: '#e05a5a',
}

const ACTION_COLORS: Record<string, string> = {
  Fold: '#2a2a2a',
  Call: '#3A6EA5',
  Raise: '#E53935',
  'All-in': '#E53935',
  Check: '#6b7280',
  Bet: '#E53935',
}

interface CardViewProps {
  rank: string
  suit?: string
  size?: 'sm' | 'md'
}

function PlayingCard({ rank, suit, size = 'md' }: CardViewProps) {
  const w = size === 'sm' ? 32 : 40
  const h = size === 'sm' ? 44 : 56
  const isRed = suit && (suit === 'h' || suit === 'd')
  return (
    <div
      className="flex flex-col items-center justify-center rounded-md border shadow-lg shrink-0"
      style={{
        width: w,
        height: h,
        backgroundColor: 'var(--bg)',
        borderColor: 'var(--border)',
        color: 'var(--text)',
      }}
    >
      <span className="font-bold leading-none" style={{ fontSize: size === 'sm' ? 12 : 14 }}>
        {rank}
      </span>
      {suit && (
        <span
          className="font-bold leading-none"
          style={{
            fontSize: size === 'sm' ? 14 : 17,
            color: isRed ? '#ff7a7a' : '#e8eef7',
          }}
        >
          {SUIT_SYMBOLS[suit] || suit}
        </span>
      )}
    </div>
  )
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
    <div className="inline-flex gap-1.5">
      {cards.map((c, i) => (
        <PlayingCard key={i} rank={c.r} suit={c.s || undefined} size="md" />
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
    <div className="flex gap-2 justify-center my-3">
      {cards.map((c, i) => (
        <PlayingCard key={i} rank={c.r} suit={c.s} size="md" />
      ))}
    </div>
  )
}

function ProgressRing({
  value,
  max,
  size = 56,
  stroke = 5,
  color = 'var(--green)',
}: {
  value: number
  max: number
  size?: number
  stroke?: number
  color?: string
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = max > 0 ? value / max : 0
  const offset = circumference * (1 - pct)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset .4s ease' }}
      />
    </svg>
  )
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full text-xs font-medium cursor-pointer transition-all duration-150 shrink-0"
      style={{
        padding: '5px 14px',
        background: active ? 'var(--green)' : 'var(--panel)',
        color: active ? '#000' : 'var(--muted)',
        border: `1px solid ${active ? 'var(--green)' : 'var(--border)'}`,
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  )
}

function FilterBtn({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer transition-all duration-150 shrink-0"
      style={{
        padding: '4px 10px',
        borderRadius: 6,
        fontSize: 11,
        background: active ? 'var(--green)' : 'var(--panel)',
        color: active ? '#000' : 'var(--muted)',
        border: `1px solid ${active ? 'var(--green)' : 'var(--border)'}`,
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
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
    setHistory(prev => [
      ...prev,
      {
        category: spot.category,
        difficulty: spot.difficulty,
        position: spot.position,
        hero_hand: spot.hero_hand,
        correct: isCorrect,
        gtoAction: spot.gto_action,
        selectedAction: actionName,
      },
    ])
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0

  // ── Session Summary Screen ──
  if (!sessionActive && history.length > 0) {
    const byCategory: Record<string, { total: number; correct: number }> = {}
    const byDifficulty: Record<string, { total: number; correct: number }> = {}
    const byPosition: Record<string, { total: number; correct: number }> = {}
    history.forEach(h => {
      ;[byCategory, byDifficulty, byPosition].forEach((m, i) => {
        const key = i === 0 ? h.category : i === 1 ? h.difficulty : h.position
        m[key] = m[key] || { total: 0, correct: 0 }
        m[key].total++
        if (h.correct) m[key].correct++
      })
    })

    const accColor = accuracy >= 70 ? 'var(--green)' : accuracy >= 50 ? '#e09b3d' : 'var(--red-bright)'

    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
        <div className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-3xl mb-2">📊</div>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>
                Session Complete
              </h2>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>
                Time: {formatTime(elapsed)}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Spots', value: stats.total, color: 'var(--text)' },
                { label: 'Accuracy', value: `${accuracy}%`, color: accColor },
                { label: 'Best Streak', value: stats.bestStreak, color: stats.bestStreak >= 5 ? 'var(--green)' : 'var(--text)' },
                { label: 'Correct', value: `${stats.correct}/${stats.total}`, color: 'var(--green)' },
              ].map(s => (
                <div
                  key={s.label}
                  className="rounded-lg p-3 text-center"
                  style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
                >
                  <div className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>
                    {s.label}
                  </div>
                  <div className="text-xl font-bold" style={{ color: s.color }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Accuracy Ring */}
            <div className="flex justify-center mb-5">
              <div className="relative inline-flex items-center justify-center">
                <ProgressRing value={stats.correct} max={Math.max(stats.total, 1)} size={88} stroke={7} color={accColor} />
                <div className="absolute text-center">
                  <div className="text-lg font-bold" style={{ color: accColor }}>{accuracy}%</div>
                  <div className="text-[10px]" style={{ color: 'var(--muted)' }}>accuracy</div>
                </div>
              </div>
            </div>

            {/* Breakdowns */}
            {[
              { title: 'By Category', data: byCategory },
              { title: 'By Difficulty', data: byDifficulty },
              { title: 'By Position', data: byPosition, grid: Object.keys(byPosition).length > 3 },
            ].map(section => {
              const entries = Object.entries(section.data)
              if (entries.length === 0) return null
              return (
                <div
                  key={section.title}
                  className="rounded-lg p-4 mb-3"
                  style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
                >
                  <h3
                    className="text-[11px] font-bold uppercase tracking-wider mb-3"
                    style={{ color: 'var(--muted)' }}
                  >
                    {section.title}
                  </h3>
                  {section.grid ? (
                    <div className="grid grid-cols-3 gap-2">
                      {entries.map(([key, d]) => {
                        const pct = d.total > 0 ? d.correct / d.total : 0
                        return (
                          <div
                            key={key}
                            className="rounded-lg p-2 text-center"
                            style={{ background: 'var(--border)', border: '1px solid var(--border-light)' }}
                          >
                            <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text)' }}>
                              {key}
                            </div>
                            <div
                              className="text-sm font-bold"
                              style={{ color: pct >= 0.6 ? 'var(--green)' : '#e09b3d' }}
                            >
                              {d.correct}/{d.total}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    entries.map(([key, d]) => {
                      const pct = d.total > 0 ? d.correct / d.total : 0
                      return (
                        <div key={key} className="mb-2 last:mb-0">
                          <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: 'var(--text)' }}>{key}</span>
                            <span style={{ color: pct >= 0.6 ? 'var(--green)' : '#e09b3d' }}>
                              {d.correct}/{d.total}
                            </span>
                          </div>
                          <div
                            className="h-1 rounded-full overflow-hidden"
                            style={{ background: 'var(--border)' }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${pct * 100}%`,
                                background: pct >= 0.6 ? 'var(--green)' : '#e09b3d',
                              }}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )
            })}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center mt-4">
              <button
                onClick={() => { endSession(); startSession() }}
                className="font-semibold cursor-pointer border-none rounded-lg px-7 py-2.5 text-sm"
                style={{ background: 'var(--green)', color: '#000' }}
              >
                New Session
              </button>
              <button
                onClick={endSession}
                className="font-medium cursor-pointer rounded-lg px-7 py-2.5 text-sm"
                style={{
                  background: 'var(--panel)',
                  color: 'var(--muted)',
                  border: '1px solid var(--border)',
                }}
              >
                Back to Setup
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Setup Screen ──
  if (!sessionActive)
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col items-center justify-center min-h-full py-12 px-4">
            <div
              className="rounded-xl p-8 w-full max-w-lg"
              style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
            >
              {/* Header */}
              <div className="text-center mb-6">
                <div className="text-3xl mb-2">🎯</div>
                <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text)' }}>
                  Practice
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  Test your GTO knowledge with structured training exercises
                </p>
              </div>

              {/* Exercise Type */}
              <div className="mb-5">
                <div
                  className="text-[10px] font-bold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--muted)' }}
                >
                  Exercise Type
                </div>
                <div className="flex gap-2 flex-wrap">
                  {EXERCISE_TYPES.map(et => (
                    <Pill key={et} label={et} active={exerciseType === et} onClick={() => setExerciseType(et)} />
                  ))}
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col gap-4 mb-5">
                {[
                  { label: 'Category', options: CATEGORIES, sel: category, set: setCategory },
                  { label: 'Difficulty', options: DIFFICULTIES, sel: difficulty, set: setDifficulty },
                ].map(g => (
                  <div key={g.label}>
                    <div
                      className="text-[10px] font-bold uppercase tracking-wider mb-2"
                      style={{ color: 'var(--muted)' }}
                    >
                      {g.label}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {g.options.map(o => (
                        <FilterBtn key={o} label={o} active={g.sel === o} onClick={() => g.set(o)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Start Button */}
              <button
                onClick={startSession}
                className="w-full font-semibold cursor-pointer border-none rounded-lg py-3 text-sm"
                style={{ background: 'var(--green)', color: '#000' }}
              >
                Start Practice Session
              </button>
            </div>
          </div>
        </div>
      </div>
    )

  // ── Active Session Screen ──
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Top Bar */}
      <div
        className="flex items-center gap-3 shrink-0 px-4"
        style={{
          height: 48,
          background: 'var(--panel)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>
          Practice
        </span>
        <span
          className="text-[10px] font-medium px-2 py-1 rounded"
          style={{ background: 'var(--bg)', color: 'var(--muted)' }}
        >
          {exerciseType}
        </span>
        <div className="ml-auto flex items-center gap-4 text-xs" style={{ color: 'var(--muted)' }}>
          <span>
            Spots:{' '}
            <b style={{ color: 'var(--text)' }}>{stats.total}</b>
          </span>
          <span>
            Accuracy:{' '}
            <b style={{ color: accuracy >= 60 ? 'var(--green)' : '#e09b3d' }}>{accuracy}%</b>
          </span>
          <span>
            Streak:{' '}
            <b style={{ color: stats.streak >= 3 ? 'var(--green)' : 'var(--text)' }}>{stats.streak}</b>
          </span>
          <span>
            Time:{' '}
            <b style={{ color: 'var(--text)' }}>{formatTime(elapsed)}</b>
          </span>
        </div>
        <button
          onClick={endSession}
          className="text-xs cursor-pointer rounded-md px-3 py-1.5"
          style={{
            background: 'var(--bg)',
            color: 'var(--muted)',
            border: '1px solid var(--border)',
          }}
        >
          End Session
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Spot Display */}
        <div
          className="flex-1 overflow-auto p-5"
          style={{ borderRight: '1px solid var(--border)' }}
        >
          {spot && (
            <div>
              {/* Tags */}
              <div className="flex gap-2 mb-3 flex-wrap">
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-md"
                  style={{ background: 'var(--panel)', color: 'var(--green)' }}
                >
                  {spot.category}
                </span>
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-md"
                  style={{
                    background: 'var(--panel)',
                    color: DIFFICULTY_COLOR[spot.difficulty] || '#e09b3d',
                  }}
                >
                  {spot.difficulty}
                </span>
                <span
                  className="text-[11px] px-2.5 py-1 rounded-md"
                  style={{ background: 'var(--panel)', color: 'var(--muted)' }}
                >
                  {spot.position}
                </span>
              </div>

              {/* Hand */}
              <div className="text-center mb-2">
                <div className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
                  Your Hand
                </div>
                <div className="flex justify-center">{renderHand(spot.hero_hand)}</div>
              </div>

              {/* Board */}
              {renderBoard(spot.board)}

              {/* Spot Info */}
              <div className="flex justify-center gap-5 my-3 text-xs" style={{ color: 'var(--muted)' }}>
                <span>
                  Pot: <b style={{ color: 'var(--text)' }}>{spot.pot_size}bb</b>
                </span>
                <span>
                  Stack: <b style={{ color: 'var(--text)' }}>{spot.stack_depth}bb</b>
                </span>
                <span>
                  Position: <b style={{ color: 'var(--text)' }}>{spot.position}</b>
                </span>
              </div>

              {/* Question */}
              <div className="text-sm font-semibold mb-3 text-center" style={{ color: 'var(--text)' }}>
                What&apos;s the GTO play?
              </div>

              {/* Action Buttons */}
              <div className="max-w-sm mx-auto">
                {spot.options.map(opt => {
                  const isSelected = selectedAction === opt.action
                  const isCorrect = opt.is_gto
                  const bgColor = isSelected
                    ? isCorrect
                      ? 'rgba(0,200,83,0.12)'
                      : 'rgba(229,57,57,0.12)'
                    : 'var(--panel)'
                  const borderColor = isSelected
                    ? isCorrect
                      ? 'var(--green)'
                      : 'var(--red-bright)'
                    : 'var(--border)'

                  return (
                    <button
                      key={opt.action}
                      onClick={() => handleAnswer(opt.action)}
                      disabled={answered}
                      className="w-full flex items-center justify-between cursor-pointer rounded-lg mb-2 px-4 py-3 transition-all duration-150"
                      style={{
                        background: bgColor,
                        border: `1px solid ${borderColor}`,
                        color: 'var(--text)',
                        opacity: answered && !isSelected && !isCorrect ? 0.4 : 1,
                        outline: answered && isCorrect ? `2px solid var(--green)` : 'none',
                        outlineOffset: -2,
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        {answered && isCorrect && (
                          <span className="text-sm" style={{ color: 'var(--green)' }}>✓</span>
                        )}
                        {answered && isSelected && !isCorrect && (
                          <span className="text-sm" style={{ color: 'var(--red-bright)' }}>✗</span>
                        )}
                        <span
                          className="font-semibold text-sm"
                          style={{
                            color: !answered ? ACTION_COLORS[opt.action] || 'var(--text)' : undefined,
                          }}
                        >
                          {opt.action}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!answered && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: 'rgba(255,255,255,0.08)',
                              color: 'var(--muted)',
                            }}
                          >
                            {opt.frequency}%
                          </span>
                        )}
                        {answered && (
                          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                            EV:{' '}
                            <b
                              style={{
                                color: opt.ev >= 0 ? 'var(--green)' : 'var(--red-bright)',
                              }}
                            >
                              {opt.ev >= 0 ? '+' : ''}
                              {opt.ev.toFixed(2)}
                            </b>
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Feedback + Next */}
              {answered && (
                <div className="mt-4 text-center">
                  <div className="text-sm font-semibold mb-2">
                    <span
                      style={{
                        color:
                          selectedAction === spot.options.find(o => o.is_gto)?.action
                            ? 'var(--green)'
                            : 'var(--red-bright)',
                      }}
                    >
                      {selectedAction === spot.options.find(o => o.is_gto)?.action
                        ? '✓ Correct!'
                        : `✗ GTO: ${spot.gto_action} (${spot.gto_frequency}%)`}
                    </span>
                  </div>
                  <button
                    onClick={fetchSpot}
                    className="font-semibold cursor-pointer border-none rounded-lg px-6 py-2.5 text-sm"
                    style={{ background: 'var(--green)', color: '#000' }}
                  >
                    Next Spot →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Session Stats Panel */}
        <div
          className="w-64 shrink-0 overflow-auto p-4"
          style={{ background: 'var(--panel)' }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--muted)' }}>
            Session Stats
          </h3>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { l: 'Spots', v: stats.total },
              { l: 'Accuracy', v: `${accuracy}%`, c: accuracy >= 60 ? 'var(--green)' : '#e09b3d' },
              { l: 'Streak', v: stats.streak, c: stats.streak >= 3 ? 'var(--green)' : 'var(--text)' },
              { l: 'Best', v: stats.bestStreak, c: stats.bestStreak >= 5 ? 'var(--green)' : 'var(--text)' },
            ].map(s => (
              <div
                key={s.l}
                className="rounded-lg p-2.5 text-center"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
              >
                <div className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>
                  {s.l}
                </div>
                <div className="text-base font-bold" style={{ color: s.c || 'var(--text)' }}>
                  {s.v}
                </div>
              </div>
            ))}
          </div>

          {/* Accuracy bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--muted)' }}>
              <span>Accuracy</span>
              <span>{accuracy}%</span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--border)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${accuracy}%`,
                  background: accuracy >= 60 ? 'var(--green)' : '#e09b3d',
                }}
              />
            </div>
          </div>

          {/* Progress Ring */}
          <div className="flex justify-center mb-4">
            <ProgressRing
              value={stats.correct}
              max={Math.max(stats.total, 1)}
              size={64}
              stroke={5}
              color={accuracy >= 60 ? 'var(--green)' : '#e09b3d'}
            />
          </div>

          {/* Recent History */}
          {history.length > 0 && (
            <>
              <h4
                className="text-[10px] font-bold uppercase tracking-wider mb-2"
                style={{ color: 'var(--muted)' }}
              >
                Recent
              </h4>
              <div className="space-y-1">
                {history
                  .slice()
                  .reverse()
                  .slice(0, 10)
                  .map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 py-1.5 text-xs"
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <span
                        className="font-bold text-sm"
                        style={{ color: h.correct ? 'var(--green)' : 'var(--red-bright)' }}
                      >
                        {h.correct ? '✓' : '✗'}
                      </span>
                      <span style={{ color: 'var(--text)' }}>{h.hero_hand}</span>
                      <span style={{ color: 'var(--muted)' }}>{h.position}</span>
                      {!h.correct && (
                        <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                          → {h.gtoAction}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
