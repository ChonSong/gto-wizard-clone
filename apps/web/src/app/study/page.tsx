'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import PostflopTraining from '@/components/study/PostflopTraining'
import ActionSelector from '@/components/study/ActionSelector'

// --- Study Stats (localStorage-backed) ---

interface StudyStats {
  total: number
  correct: number
  streak: number
  bestStreak: number
  byPosition: Record<string, { total: number; correct: number }>
  byAction: Record<string, { total: number; correct: number }>
  lastActiveTs: number // for session timeout
}

const STATS_KEY = 'gto-study-stats'
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

function loadStats(): StudyStats {
  if (typeof window === 'undefined') return emptyStats()
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return emptyStats()
    const parsed = JSON.parse(raw) as StudyStats
    // Session timeout check
    if (parsed.lastActiveTs && Date.now() - parsed.lastActiveTs > SESSION_TIMEOUT_MS) {
      return emptyStats()
    }
    return parsed
  } catch {
    return emptyStats()
  }
}

function emptyStats(): StudyStats {
  return {
    total: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    byPosition: {},
    byAction: {},
    lastActiveTs: Date.now(),
  }
}

function saveStats(stats: StudyStats) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify({ ...stats, lastActiveTs: Date.now() }))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

function incrementStats(
  stats: StudyStats,
  isCorrect: boolean,
  position: string,
  action: string,
): StudyStats {
  const next = { ...stats, total: stats.total + 1, lastActiveTs: Date.now() }
  if (isCorrect) {
    next.correct = stats.correct + 1
    next.streak = stats.streak + 1
    next.bestStreak = Math.max(next.streak, stats.bestStreak)
  } else {
    next.streak = 0
  }
  // By position
  const prevPos = stats.byPosition[position] || { total: 0, correct: 0 }
  next.byPosition = {
    ...stats.byPosition,
    [position]: { total: prevPos.total + 1, correct: prevPos.correct + (isCorrect ? 1 : 0) },
  }
  // By action
  const prevAction = stats.byAction[action] || { total: 0, correct: 0 }
  next.byAction = {
    ...stats.byAction,
    [action]: { total: prevAction.total + 1, correct: prevAction.correct + (isCorrect ? 1 : 0) },
  }
  return next
}

const RED = '#D32F2F'
const RED_BRIGHT = '#E53935'
const RED_DARK = '#7B1E1E'
const BLUE = '#3A6EA5'
const GREEN = '#00C853'
const GRAY = '#2a2a2a'

const MATRIX_HANDS: string[][] = [
  ['AA','AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s'],
  ['AKo','KK','KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s'],
  ['AQo','KQo','QQ','QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s','Q4s','Q3s','Q2s'],
  ['AJo','KJo','QJo','JJ','JTs','J9s','J8s','J7s','J6s','J5s','J4s','J3s','J2s'],
  ['ATo','KTo','QTo','JTo','TT','T9s','T8s','T7s','T6s','T5s','T4s','T3s','T2s'],
  ['A9o','K9o','Q9o','J9o','T9o','99','98s','97s','96s','95s','94s','93s','92s'],
  ['A8o','K8o','Q8o','J8o','T8o','98o','88','87s','86s','85s','84s','83s','82s'],
  ['A7o','K7o','Q7o','J7o','T7o','97o','87o','77','76s','75s','74s','73s','72s'],
  ['A6o','K6o','Q6o','J6o','T6o','96o','86o','76o','66','65s','64s','63s','62s'],
  ['A5o','K5o','Q5o','J5o','T5o','95o','85o','75o','65o','55','54s','53s','52s'],
  ['A4o','K4o','Q4o','J4o','T4o','94o','84o','74o','64o','54o','44','43s','42s'],
  ['A3o','K3o','Q3o','J3o','T3o','93o','83o','73o','63o','53o','43o','33','32s'],
  ['A2o','K2o','Q2o','J2o','T2o','92o','82o','72o','62o','52o','42o','32o','22'],
]

const SUIT_SYM: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
const SUIT_COLOR: Record<string, string> = { s: '#fff', h: '#E53935', d: '#E53935', c: '#fff' }
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

type HandData = { hand: string; action: string; frequency: number; equity: number }
type BoardCard = { rank: string; suit: string }

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A']
const SUITS = ['s','h','d','c']

function generateRandomCards(count: number, exclude: string[]): BoardCard[] {
  const used = new Set(exclude.map(c => c.toLowerCase()))
  const cards: BoardCard[] = []
  const available: BoardCard[] = []
  for (const r of RANKS) for (const s of SUITS) {
    const key = (r + s).toLowerCase()
    if (!used.has(key)) available.push({ rank: r, suit: s })
  }
  // Shuffle and pick
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]]
  }
  for (let i = 0; i < Math.min(count, available.length); i++) {
    cards.push(available[i])
  }
  return cards
}

function parseBoardString(boardStr: string): BoardCard[] {
  const cards: BoardCard[] = []
  const cleaned = boardStr.replace(/[^2-9TJQKAtshdch]/gi, '')
  for (let i = 0; i < cleaned.length; i += 2) {
    if (i + 1 < cleaned.length) {
      cards.push({ rank: cleaned[i].toUpperCase(), suit: cleaned[i + 1].toLowerCase() })
    }
  }
  return cards
}

function boardCardsToString(cards: BoardCard[]): string {
  return cards.map(c => c.rank + c.suit).join('')
}

const ACTION_COLORS: Record<string, string> = {
  'raise': RED_BRIGHT,
  'call': BLUE,
  'fold': GRAY,
  'all_in': RED_DARK,
}

// Action sets per position (matches GTO Wizard reference)
const POSITION_ACTIONS: Record<string, Array<{ id: string; label: string; actionBase: string; size?: number }>> = {
  'UTG': [
    { id: 'fold', label: 'Fold', actionBase: 'fold' },
    { id: 'raise_2.5', label: 'Raise 2.5', actionBase: 'raise', size: 2.5 },
    { id: 'all_in', label: 'Allin 100', actionBase: 'all_in' },
  ],
  'HJ': [
    { id: 'fold', label: 'Fold', actionBase: 'fold' },
    { id: 'raise_2.5', label: 'Raise 2.5', actionBase: 'raise', size: 2.5 },
    { id: 'all_in', label: 'Allin 100', actionBase: 'all_in' },
  ],
  'CO': [
    { id: 'fold', label: 'Fold', actionBase: 'fold' },
    { id: 'raise_2.5', label: 'Raise 2.5', actionBase: 'raise', size: 2.5 },
    { id: 'all_in', label: 'Allin 100', actionBase: 'all_in' },
  ],
  'BTN': [
    { id: 'fold', label: 'Fold', actionBase: 'fold' },
    { id: 'raise_2.5', label: 'Raise 2.5', actionBase: 'raise', size: 2.5 },
    { id: 'all_in', label: 'Allin 100', actionBase: 'all_in' },
  ],
  'SB': [
    { id: 'fold', label: 'Fold', actionBase: 'fold' },
    { id: 'call', label: 'Call', actionBase: 'call' },
    { id: 'raise_3.5', label: 'Raise 3.5', actionBase: 'raise', size: 3.5 },
    { id: 'all_in', label: 'Allin 100', actionBase: 'all_in' },
  ],
  'BB': [
    { id: 'fold', label: 'Fold', actionBase: 'fold' },
    { id: 'call', label: 'Call', actionBase: 'call' },
    { id: 'raise_3.5', label: 'Raise 3.5', actionBase: 'raise', size: 3.5 },
    { id: 'all_in', label: 'Allin 100', actionBase: 'all_in' },
  ],
}

function getGtoActionBase(handData: HandData | undefined): string {
  if (!handData) return 'fold'
  const a = handData.action
  if (a.startsWith('raise')) return 'raise'
  return a
}

const POSITION_KEYS: Record<string, string> = {
  '1': 'UTG', '2': 'HJ', '3': 'CO', '4': 'BTN', '5': 'SB', '6': 'BB',
}

const ACTION_HOTKEYS: Record<string, string> = {
  'a': 'all_in',
  's': 'fold',
  'd': 'call',
  'f': 'raise',
}

const TAB_ORDER: Array<'strategy' | 'ranges' | 'breakdown'> = ['strategy', 'ranges', 'breakdown']

export default function StudyPage() {
  const [mode, setMode] = useState<'preflop' | 'postflop'>('preflop')
  const [activePosition, setActivePosition] = useState('UTG')
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [rangeData, setRangeData] = useState<Map<string, HandData>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSolverMode, setIsSolverMode] = useState(false)
  const [userAction, setUserAction] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [betSize, setBetSize] = useState<number | null>(null)
  const [stackDepth, setStackDepth] = useState(100)
  const [boardCards, setBoardCards] = useState<BoardCard[]>([])
  const [boardStreet, setBoardStreet] = useState<'preflop' | 'flop' | 'turn' | 'river'>('preflop')
  const [availableDepths, setAvailableDepths] = useState<{value: number; label: string}[]>([
    { value: 50, label: '50bb' },
    { value: 100, label: '100bb' },
    { value: 150, label: '150bb' },
    { value: 200, label: '200bb' },
  ])
  const [activeTab, setActiveTab] = useState<'strategy' | 'ranges' | 'breakdown'>('strategy')
  const [hotkeyToast, setHotkeyToast] = useState<string | null>(null)
  const [showHotkeys, setShowHotkeys] = useState(false)
  const [studyStats, setStudyStats] = useState<StudyStats>(emptyStats)
  const [showStatsPanel, setShowStatsPanel] = useState(false)
  const [rightTopTab, setRightTopTab] = useState<'overview' | 'table' | 'equity_chart'>('overview')
  const [rightSubTab, setRightSubTab] = useState<'hand' | 'summary' | 'filters' | 'actions'>('actions')
  const [handFilters, setHandFilters] = useState<Record<string, boolean>>({ pairs: true, suited: true, offsuit: true, broadway: true, aceHigh: true })
  const [blockerRanks, setBlockerRanks] = useState<string[]>([])

  // Load stats from localStorage on mount
  useEffect(() => {
    setStudyStats(loadStats())
  }, [])

  const positions = useMemo(() => [
    { id: 'UTG', label: 'UTG', stack: stackDepth },
    { id: 'HJ', label: 'HJ', stack: stackDepth },
    { id: 'CO', label: 'CO', stack: stackDepth },
    { id: 'BTN', label: 'BTN', stack: stackDepth },
    { id: 'SB', label: 'SB', stack: stackDepth - 0.5 },
    { id: 'BB', label: 'BB', stack: stackDepth - 1 },
  ], [stackDepth])

  // Fetch available stack depths and solver data when position/depth changes
  useEffect(() => {
    async function fetchDepths() {
      try {
        const res = await fetch(`${API_BASE}/strategy-lookup/stack-depths`)
        if (res.ok) {
          const data = await res.json()
          if (data.stack_depths?.length) {
            setAvailableDepths(data.stack_depths)
            // If current depth isn't available, use the closest
            const values = data.stack_depths.map((d: any) => d.value)
            if (!values.includes(stackDepth)) {
              const closest = values.reduce((a: number, b: number) =>
                Math.abs(b - stackDepth) < Math.abs(a - stackDepth) ? b : a
              )
              setStackDepth(closest)
            }
          }
        }
      } catch {
        // Keep defaults if API is unavailable
      }
    }
    fetchDepths()
  }, [])

  // Fetch solver data when position or stack depth changes
  useEffect(() => {
    async function fetchRange() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/solver/preflop-range`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            position: activePosition,
            stack_depth: positions.find(p => p.id === activePosition)?.stack || stackDepth,
          }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const map = new Map<string, HandData>()
        for (const h of data.hands || []) {
          map.set(h.hand, h)
        }
        setRangeData(map)
        setIsSolverMode(true)
        // Auto-select strongest non-fold hand so ActionSelector is immediately usable
        const firstActionable = data.hands?.find((h: any) => h.action !== 'fold')
        if (firstActionable) {
          setSelectedCell(firstActionable.hand)
        } else {
          setSelectedCell(null)
        }
      } catch (err: any) {
        setError(err.message)
        setIsSolverMode(false)
      } finally {
        setLoading(false)
      }
    }
    fetchRange()
  }, [activePosition, stackDepth])

  const handCells = MATRIX_HANDS.flat()

  function getCellColor(hand: string): string {
    if (isSolverMode) {
      const data = rangeData.get(hand)
      if (!data || data.action === 'fold') return GRAY
      return ACTION_COLORS[data.action] || RED
    }
    // Fallback to hardcoded colors
    const redSet = new Set(['AA','AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s','AKo','KK','KQs','KJs','KTs','K9s','K8s','K7s','AQo','KQo','QQ','QJs','QTs','AJo','KJo','JJ','JTs','ATo','TT','99','98s','88','87s'])
    if (redSet.has(hand)) return RED
    return BLUE
  }

  function getCellOpacity(hand: string): number {
    // Apply hand filters and blocker ranks first
    if (isHandFiltered(hand)) return 0.08
    if (isHandBlocked(hand)) return 0.15
    if (!isSolverMode) return 1.0
    const data = rangeData.get(hand)
    if (!data) return 0.3
    if (data.action === 'fold') return 0.3
    return 0.5 + data.frequency * 0.5
  }

  function getHandCategories(hand: string): string[] {
    const cats: string[] = []
    const r1 = hand[0], r2 = hand[1]
    const isPair = r1 === r2
    const isSuited = hand.length === 3 && hand[2] === 's'
    const isOffsuit = hand.length === 3 && hand[2] === 'o'
    if (isPair) cats.push('pair')
    if (isSuited) cats.push('suited')
    if (isOffsuit) cats.push('offsuit')
    const broadwayRanks = new Set(['T','J','Q','K','A'])
    if (broadwayRanks.has(r1) && broadwayRanks.has(r2)) cats.push('broadway')
    if (r1 === 'A') cats.push('aceHigh')
    return cats
  }

  function isHandFiltered(hand: string): boolean {
    const cats = getHandCategories(hand)
    if (!handFilters.pairs && cats.includes('pair')) return true
    if (!handFilters.suited && cats.includes('suited')) return true
    if (!handFilters.offsuit && cats.includes('offsuit')) return true
    if (!handFilters.broadway && cats.includes('broadway')) return true
    if (!handFilters.aceHigh && cats.includes('aceHigh')) return true
    return false
  }

  function isHandBlocked(hand: string): boolean {
    if (blockerRanks.length === 0) return false
    const r1 = hand[0], r2 = hand[1]
    return blockerRanks.includes(r1) || blockerRanks.includes(r2)
  }

  // Compute action summary from solver data
  const actionSummary = useMemo(() => {
    const counts: Record<string, { count: number; totalFreq: number }> = {}
    rangeData.forEach((h) => {
      const action = h.action.startsWith('raise') ? 'raise' : h.action
      if (!counts[action]) counts[action] = { count: 0, totalFreq: 0 }
      counts[action].count++
      counts[action].totalFreq += h.frequency
    })
    return counts
  }, [rangeData])

  const totalCombos = 1326 // 52 choose 2

  const actionLabels: Record<string, string> = {
    raise: 'Raise 2.5',
    call: 'Call',
    fold: 'Fold',
    all_in: 'All In',
  }

  const actionLabelsShort: Record<string, string> = {
    raise: 'RAISE',
    call: 'CALL',
    fold: 'FOLD',
    all_in: 'ALL IN',
  }
  const selectedHandData = useMemo(() => {
    if (!selectedCell) return null
    return rangeData.get(selectedCell) || null
  }, [selectedCell, rangeData])

  const selectedHandCombos = useMemo(() => {
    if (!selectedCell) return []
    const suits = ['s', 'h', 'd', 'c']; const combos: [string, string][] = []
    for (const s1 of suits) for (const s2 of suits) if (s1 !== s2) combos.push([s1, s2])
    return combos.slice(0, 12)
  }, [selectedCell])

  // Reset user selection when hand changes
  useEffect(() => {
    setUserAction(null)
    setActionFeedback(null)
    setBetSize(null)
  }, [selectedCell])

  const handleCheckAction = useCallback(() => {
    if (!userAction || !selectedHandData) return
    const gtoBase = selectedHandData.action.startsWith('raise') ? 'raise' : selectedHandData.action
    let isCorrect: boolean
    // If both are raise, also compare size
    if (userAction === 'raise' && gtoBase === 'raise') {
      const gtoSizeStr = selectedHandData.action.replace('raise_', '').replace('bb', '')
      const gtoSize = parseFloat(gtoSizeStr)
      const userSize = betSize || 2.5
      const sizeDiff = Math.abs(userSize - gtoSize)
      // Accept close sizes (within 1bb) as correct
      isCorrect = sizeDiff <= 1.0
    } else {
      isCorrect = userAction === gtoBase
    }
    setActionFeedback(isCorrect ? 'correct' : 'incorrect')
    // Record stats
    setStudyStats(prev => {
      const updated = incrementStats(prev, isCorrect, activePosition, userAction)
      saveStats(updated)
      return updated
    })
  }, [userAction, selectedHandData, betSize, activePosition])

  const handleGenerateFlop = useCallback(() => {
    const flop = generateRandomCards(3, [])
    setBoardCards(flop)
    setBoardStreet('flop')
  }, [])

  const handleAdvanceStreet = useCallback(() => {
    if (boardStreet === 'river') return
    const currentLen = boardCards.length
    const nextCard = generateRandomCards(1, boardCards.map(c => c.rank + c.suit))
    if (nextCard.length === 0) return
    const updated = [...boardCards, nextCard[0]]
    setBoardCards(updated)
    if (boardStreet === 'flop') setBoardStreet('turn')
    else if (boardStreet === 'turn') setBoardStreet('river')
  }, [boardCards, boardStreet])

  const handleResetBoard = useCallback(() => {
    setBoardCards([])
    setBoardStreet('preflop')
  }, [])

  const handleRandomSpot = useCallback(() => {
    // Pick random position
    const posIds = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
    const randPos = posIds[Math.floor(Math.random() * posIds.length)]
    setActivePosition(randPos)

    // Pick random stack depth from available
    const depths = availableDepths.length > 0 ? availableDepths : [{ value: 100, label: '100bb' }, { value: 150, label: '150bb' }, { value: 200, label: '200bb' }]
    const randDepth = depths[Math.floor(Math.random() * depths.length)]
    setStackDepth(randDepth.value)

    // Generate random board (flop)
    const flop = generateRandomCards(3, [])
    setBoardCards(flop)
    setBoardStreet('flop')

    // Pick a random hand from the matrix
    const allHands = MATRIX_HANDS.flat()
    const randHand = allHands[Math.floor(Math.random() * allHands.length)]
    setSelectedCell(randHand)

    // Reset user action state
    setUserAction(null)
    setActionFeedback(null)
    setBetSize(null)
  }, [availableDepths])

  // Hotkey handler
  useEffect(() => {
    function showToast(msg: string) {
      setHotkeyToast(msg)
      setTimeout(() => setHotkeyToast(null), 1200)
    }

    function navigateMatrix(direction: string) {
      if (!selectedCell) return
      const row = MATRIX_HANDS.findIndex(r => r.includes(selectedCell))
      if (row === -1) return
      const col = MATRIX_HANDS[row].indexOf(selectedCell)
      let newRow = row, newCol = col
      if (direction === 'arrowup') newRow = Math.max(0, row - 1)
      if (direction === 'arrowdown') newRow = Math.min(12, row + 1)
      if (direction === 'arrowleft') newCol = Math.max(0, col - 1)
      if (direction === 'arrowright') newCol = Math.min(12, col + 1)
      const newHand = MATRIX_HANDS[newRow]?.[newCol]
      if (newHand) setSelectedCell(newHand)
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const key = e.key.toLowerCase()

      // Position switching: 1-6
      if (POSITION_KEYS[key] && mode === 'preflop') {
        e.preventDefault()
        setActivePosition(POSITION_KEYS[key])
        showToast(`Position: ${POSITION_KEYS[key]}`)
        return
      }

      // Tab cycling: Tab
      if (key === 'tab' && mode === 'preflop') {
        e.preventDefault()
        setActiveTab(prev => {
          const idx = TAB_ORDER.indexOf(prev)
          return TAB_ORDER[(idx + 1) % TAB_ORDER.length]
        })
        return
      }

      // Deal flop / advance street: F
      if (key === 'f' && mode === 'preflop') {
        e.preventDefault()
        if (boardStreet === 'preflop') handleGenerateFlop()
        else if (boardStreet !== 'river') handleAdvanceStreet()
        return
      }

      // Reset board: R
      if (key === 'r' && mode === 'preflop' && boardCards.length > 0) {
        e.preventDefault()
        handleResetBoard()
        return
      }

      // Random spot: Space
      if (key === ' ' && mode === 'preflop') {
        e.preventDefault()
        handleRandomSpot()
        return
      }

      // Check vs GTO: Enter
      if (key === 'enter' && selectedHandData && userAction && !actionFeedback) {
        e.preventDefault()
        handleCheckAction()
        return
      }

      // Escape: deselect / close feedback
      if (key === 'escape') {
        e.preventDefault()
        if (actionFeedback) {
          setUserAction(null)
          setActionFeedback(null)
          setBetSize(null)
        } else if (selectedCell) {
          setSelectedCell(null)
        }
        return
      }

      // Action hotkeys: a/s/d/f (only when hand selected and no feedback)
      if (ACTION_HOTKEYS[key] && selectedHandData && !actionFeedback) {
        e.preventDefault()
        setUserAction(ACTION_HOTKEYS[key])
        showToast(`${ACTION_HOTKEYS[key].replace('_', ' ').toUpperCase()}`)
        return
      }

      // Arrow keys: navigate matrix
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key) && selectedCell) {
        e.preventDefault()
        navigateMatrix(key)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, boardStreet, boardCards.length, selectedCell, selectedHandData, userAction, actionFeedback, activeTab, activePosition, handleCheckAction, handleGenerateFlop, handleAdvanceStreet, handleResetBoard, handleRandomSpot])

  // Close hotkey help popup on outside click
  useEffect(() => {
    if (!showHotkeys) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-hotkeys-popup]')) {
        setShowHotkeys(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [showHotkeys])

  // Extended stack depths for top bar (including 30bb, 75bb)
  const topBarDepths = useMemo(() => [
    { value: 30, label: '30bb' },
    { value: 50, label: '50bb' },
    { value: 75, label: '75bb' },
    { value: 100, label: '100bb' },
    { value: 150, label: '150bb' },
    { value: 200, label: '200bb' },
  ], [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0E0E0E', overflow: 'hidden' }}>
      <style>{`
        @media (max-width: 768px) {
          .study-main-grid {
            grid-template-columns: 1fr !important;
            gap: 4px !important;
            padding: 0 4px !important;
          }
          .study-matrix-grid {
            grid-template-columns: repeat(13, 1fr) !important;
          }
          .study-matrix-cell {
            font-size: 6px !important;
            letter-spacing: -0.5px !important;
          }
          .study-position-bar {
            gap: 4px !important;
            padding: 4px 4px 2px !important;
          }
          .study-position-btn {
            min-width: 56px !important;
            padding: 4px 8px !important;
            font-size: 10px !important;
          }
          .study-position-btn-stack {
            font-size: 8px !important;
          }
          .study-action-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 6px !important;
          }
          .study-action-btn {
            padding: 14px 6px !important;
            min-height: 48px !important;
          }
          .study-stack-selector {
            gap: 3px !important;
            padding: 3px 4px !important;
            flex-wrap: wrap !important;
          }
          .study-details-panel {
            min-height: 300px !important;
          }
          .study-top-bar {
            flex-wrap: wrap !important;
            gap: 6px !important;
            padding: 6px 8px !important;
          }
          .study-top-bar-upgrade {
            margin-left: auto !important;
          }
        }
        @media (max-width: 480px) {
          .study-matrix-cell {
            font-size: 5px !important;
            letter-spacing: -0.8px !important;
          }
          .study-matrix-cell-freq {
            display: none !important;
          }
          .study-position-btn-label {
            font-size: 11px !important;
          }
          .study-position-btn-stack {
            font-size: 9px !important;
            color: #999 !important;
          }
        }
        /* Accessibility: visible focus indicators */
        *:focus-visible {
          outline: 2px solid #7CFC7C !important;
          outline-offset: 1px !important;
        }
        [role="gridcell"]:focus-visible {
          outline: 2px solid #fff !important;
          outline-offset: 1px !important;
          z-index: 10 !important;
        }
      `}</style>
      {/* Hotkey toast */}
      {hotkeyToast && (
        <div style={{
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: '#1a3a2a', border: `1px solid ${GREEN}`,
          color: '#fff', padding: '6px 16px', borderRadius: 6,
          fontSize: 12, fontWeight: 600, zIndex: 1000,
          animation: 'fadeInOut 1.2s ease',
        }}>
          {hotkeyToast}
          <style>{`
            @keyframes fadeInOut {
              0% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
              15% { opacity: 1; transform: translateX(-50%) translateY(0); }
              85% { opacity: 1; }
              100% { opacity: 0; }
            }
          `}</style>
        </div>
      )}
      {/* Top Bar — Cash / Stack Depth / Spots / Upgrade */}
      <div className="study-top-bar" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 12px', background: '#1A1A1A',
        borderBottom: '1px solid #333', flexShrink: 0,
      }}>
        {/* Game type label */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          color: '#e0e0e0', fontSize: 12, fontWeight: 600,
          whiteSpace: 'nowrap',
        }}>
          <span>Cash</span>
          <span style={{ color: '#666', fontSize: 8, marginTop: 1 }}>▾</span>
        </div>
        <div style={{ width: 1, height: 16, background: '#333', flexShrink: 0 }} />
        {/* Stack depth selector */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <select
            value={stackDepth}
            onChange={(e) => setStackDepth(Number(e.target.value))}
            aria-label="Select stack depth"
            style={{
              background: '#0E0E0E', color: '#e0e0e0',
              border: '1px solid #333', borderRadius: 4,
              padding: '2px 20px 2px 8px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
              lineHeight: 1.6, minWidth: 66,
            }}
          >
            {topBarDepths.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <span style={{
            position: 'absolute', right: 6, top: '50%', marginTop: -5,
            color: '#666', fontSize: 8, pointerEvents: 'none',
          }}>▾</span>
        </div>
        <div style={{ width: 1, height: 16, background: '#333', flexShrink: 0 }} />
        {/* Spots counter */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          color: '#888', fontSize: 11, fontWeight: 500,
          whiteSpace: 'nowrap',
        }}>
          <span style={{ color: '#aaa', fontWeight: 600 }}>2,000+</span>
          <span>spots</span>
        </div>
        <div style={{ flex: 1 }} />
        {/* Upgrade CTA button */}
        <a
          href="#"
          className="study-top-bar-upgrade"
          onClick={(e) => { e.preventDefault() }}
          style={{
            color: '#00C853', fontSize: 11, fontWeight: 700,
            padding: '3px 12px', borderRadius: 4,
            border: '1px solid #00C853',
            background: 'transparent',
            textDecoration: 'none', cursor: 'pointer',
            whiteSpace: 'nowrap', letterSpacing: '0.03em',
            lineHeight: 1.5,
          }}
        >
          Upgrade
        </a>
      </div>
      {/* Mode Toggle — fixed height */}
      <div style={{ display: 'flex', gap: 8, padding: '6px 12px', borderBottom: '1px solid #141414', background: '#0E0E0E', flexShrink: 0 }}>
        <button onClick={() => setMode('preflop')}
          style={{
            background: mode === 'preflop' ? '#16241a' : '#161616',
            border: mode === 'preflop' ? `1px solid ${GREEN}` : '1px solid #262626',
            color: mode === 'preflop' ? '#fff' : '#888',
            padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
          }}>
          Preflop Ranges
        </button>
        <button onClick={() => setMode('postflop')}
          style={{
            background: mode === 'postflop' ? '#16241a' : '#161616',
            border: mode === 'postflop' ? `1px solid ${GREEN}` : '1px solid #262626',
            color: mode === 'postflop' ? '#fff' : '#888',
            padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
          }}>
          Postflop Training
        </button>
      </div>

      {/* Study Stats Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 12px', background: '#111', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: studyStats.total > 0 ? '#7CFC7C' : '#666' }}>
          {studyStats.correct}/{studyStats.total} ({studyStats.total > 0 ? Math.round((studyStats.correct / studyStats.total) * 100) : 0}%)
        </span>
        {studyStats.streak > 0 && (
          <span style={{ fontSize: 11, color: '#FFD700', fontWeight: 600 }}>
            Streak: {studyStats.streak}
          </span>
        )}
        {studyStats.bestStreak > 0 && studyStats.bestStreak !== studyStats.streak && (
          <span style={{ fontSize: 10, color: '#666' }}>Best: {studyStats.bestStreak}</span>
        )}
        <span style={{ flex: 1 }} />
        <button onClick={() => setShowStatsPanel(p => !p)}
          style={{
            fontSize: 10, fontWeight: 600, color: showStatsPanel ? '#7CFC7C' : '#555',
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
          }}>
          {showStatsPanel ? '▾ Stats' : '▸ Stats'}
        </button>
        {studyStats.total > 0 && (
          <button onClick={() => { setStudyStats(emptyStats()); saveStats(emptyStats()) }}
            style={{
              fontSize: 10, fontWeight: 600, color: '#555',
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
            }}>
            New Session
          </button>
        )}
      </div>

      {/* Stats Detail Panel */}
      {showStatsPanel && (
        <div style={{ background: '#141414', borderBottom: '1px solid #1a1a1a', padding: '8px 12px', flexShrink: 0, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {/* By position */}
          <div style={{ minWidth: 140, flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>By Position</div>
            {Object.entries(studyStats.byPosition).length === 0 ? (
              <div style={{ fontSize: 10, color: '#555' }}>No data yet</div>
            ) : (
              Object.entries(studyStats.byPosition)
                .sort(([,a],[,b]) => b.total - a.total)
                .map(([pos, d]) => (
                  <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <span style={{ fontSize: 10, width: 30, color: '#aaa', fontWeight: 600 }}>{pos}</span>
                    <div style={{ flex: 1, height: 5, background: '#222', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${d.total > 0 ? (d.correct / d.total) * 100 : 0}%`, background: '#00C853', borderRadius: 3, opacity: 0.7 }} />
                    </div>
                    <span style={{ fontSize: 10, color: '#666', width: 38, textAlign: 'right' }}>{d.correct}/{d.total}</span>
                  </div>
                ))
            )}
          </div>
          {/* By action */}
          <div style={{ minWidth: 140, flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>By Action</div>
            {Object.entries(studyStats.byAction).length === 0 ? (
              <div style={{ fontSize: 10, color: '#555' }}>No data yet</div>
            ) : (
              Object.entries(studyStats.byAction)
                .sort(([,a],[,b]) => b.total - a.total)
                .map(([action, d]) => (
                  <div key={action} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <span style={{ fontSize: 10, width: 44, color: '#aaa', fontWeight: 600 }}>{actionLabelsShort[action] || action}</span>
                    <div style={{ flex: 1, height: 5, background: '#222', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${d.total > 0 ? (d.correct / d.total) * 100 : 0}%`, background: ACTION_COLORS[action] || '#00C853', borderRadius: 3, opacity: 0.7 }} />
                    </div>
                    <span style={{ fontSize: 10, color: '#666', width: 38, textAlign: 'right' }}>{d.correct}/{d.total}</span>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {mode === 'preflop' ? (<div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Stack Depth Selector — compact */}
      <div className="study-stack-selector" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#0E0E0E', borderBottom: '1px solid #141414', flexShrink: 0 }}>
        <span style={{ color: '#999', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>Stack:</span>
        {availableDepths.map(d => (
          <button key={d.value} onClick={() => setStackDepth(d.value)}
            style={{
              background: stackDepth === d.value ? '#16241a' : '#161616',
              border: stackDepth === d.value ? `1px solid ${GREEN}` : '1px solid #262626',
              color: stackDepth === d.value ? '#fff' : '#888',
              padding: '2px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
              cursor: 'pointer',
            }}>
            {d.label}
          </button>
        ))}
      </div>
      {/* Position Bar — compact */}
      <div className="study-position-bar" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 4px', overflowX: 'auto', background: '#0E0E0E', borderBottom: '1px solid #141414', flexShrink: 0 }}>
        <div style={{ background: '#1A1A1A', border: '1px solid #2a2a2a', color: '#d0d0d0', padding: '4px 8px', borderRadius: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
          {loading ? <span style={{ color: GREEN }}>●</span> : error ? <span style={{ color: RED }}>●</span> : <span style={{ color: GREEN }}>●</span>}
          {loading ? 'Solving...' : error ? 'Offline' : 'GTO'}
        </div>
        {positions.map((pos, idx) => {
          const isActive = activePosition === pos.id
          return (
            <button className="study-position-btn" key={pos.id} onClick={() => setActivePosition(pos.id)}
              style={{
                background: isActive ? '#00C853' : '#2A2A2A',
                border: isActive ? '2px solid #00C853' : '1px solid #3a3a3a',
                color: '#fff',
                padding: '6px 14px', borderRadius: 8, fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer',
                textAlign: 'center', minWidth: 72, lineHeight: 1.3,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                boxShadow: isActive ? '0 0 12px rgba(0,200,83,0.35)' : 'none',
                transition: 'all 0.15s ease',
              }}>
              <span className="study-position-btn-label" style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.02em' }}>{pos.label}</span>
              <span className="study-position-btn-stack" style={{ fontSize: 10, color: isActive ? 'rgba(255,255,255,0.85)' : '#bbb' }}>{pos.stack.toFixed(1)}bb</span>
            </button>
          )
        })}
        <button onClick={handleRandomSpot}
          style={{
            background: '#1a1a2e', border: '1px solid #3a3a5e',
            color: '#b0b0ff', padding: '3px 10px', borderRadius: 6,
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>
          🎲 Random Spot
        </button>
        <div style={{ marginLeft: 'auto', position: 'relative' }} data-hotkeys-popup>
          <button onClick={() => setShowHotkeys(!showHotkeys)}
            aria-label={showHotkeys ? 'Hide keyboard shortcuts' : 'Show keyboard shortcuts'}
            aria-expanded={showHotkeys}
            style={{
              background: showHotkeys ? '#1a3a2b' : '#161616',
              border: '1px solid #262626',
              color: showHotkeys ? GREEN : '#666',
              width: 22, height: 22, borderRadius: 4,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>?</button>
          {showHotkeys && (
            <div style={{
              position: 'absolute', right: 0, top: 28,
              background: '#1C1C1C', border: '1px solid #262626',
              borderRadius: 8, padding: '10px 12px',
              fontSize: 10, color: '#aaa',
              zIndex: 100, minWidth: 180,
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}>
              <div style={{ fontWeight: 600, color: '#ccc', marginBottom: 6, fontSize: 11 }}>Keyboard Shortcuts</div>
              {[
                ['1-6', 'Position'],
                ['Tab', 'Cycle tabs'],
                ['F', 'Deal flop/next street'],
                ['R', 'Reset board'],
                ['Space', 'Random spot'],
                ['A / S / D / F', 'All-in / Fold / Call / Raise'],
                ['↑↓←→', 'Navigate matrix'],
                ['Enter', 'Check vs GTO'],
                ['Esc', 'Deselect / close'],
              ].map(([key, desc]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: '#7CFC7C', fontFamily: 'monospace', fontSize: 10 }}>{key}</span>
                  <span style={{ color: '#888' }}>{desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Prompt Header Row — per-position GTO recommendation */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '5px 12px', background: '#0E0E0E',
        borderBottom: '1px solid #1a1a1a', flexShrink: 0,
        fontSize: 11, fontWeight: 500, color: '#888',
        whiteSpace: 'nowrap', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Your action:</span>
          {(() => {
            if (!isSolverMode) return <span style={{ color: '#555' }}>—</span>
            // Use selected hand's GTO action, or fall back to most frequent position action
            let gtoAction: string | null = null
            let gtoFreq: number | null = null
            if (selectedHandData) {
              gtoAction = selectedHandData.action.startsWith('raise') ? 'raise' : selectedHandData.action
              gtoFreq = selectedHandData.frequency
            } else {
              const entries = Object.entries(actionSummary).sort(([,a],[,b]) => b.totalFreq - a.totalFreq)
              if (entries.length > 0) {
                gtoAction = entries[0][0]
              }
            }
            if (!gtoAction) return <span style={{ color: '#555' }}>Select a hand</span>
            const actionColor = ACTION_COLORS[gtoAction] || GRAY
            return (
              <span style={{ color: actionColor, fontWeight: 700 }}>
                {actionLabelsShort[gtoAction] || gtoAction}
                {gtoFreq !== null && (
                  <span style={{ fontWeight: 400, color: '#aaa', marginLeft: 3 }}>
                    {(gtoFreq * 100).toFixed(0)}%
                  </span>
                )}
              </span>
            )
          })()}
        </div>
        <div style={{ width: 1, height: 12, background: '#262626', flexShrink: 0 }} />
        <span>Pot: <strong style={{ color: '#ccc', fontWeight: 600 }}>3.0</strong>bb</span>
        <span>Eff: <strong style={{ color: '#ccc', fontWeight: 600 }}>{stackDepth}</strong>bb</span>
      </div>

      {/* Main Grid — fills remaining space, grid scrolls internally */}
      <div className="study-main-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 1fr)', gap: 8, padding: '0 12px', minHeight: 0 }}>
        {/* Matrix Panel */}
        <div style={{ background: '#1C1C1C', border: '1px solid #262626', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div role="tablist" aria-label="Strategy view tabs" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 8px', borderBottom: '1px solid #262626', flexShrink: 0 }}>
            {([
              { id: 'strategy' as const, label: 'Strategy ▾' },
              { id: 'ranges' as const, label: 'Ranges' },
              { id: 'breakdown' as const, label: 'Breakdown' },
            ]).map(tab => (
              <span key={tab.id} role="tab" aria-selected={activeTab === tab.id} tabIndex={0}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab(tab.id) } }}
                style={{ fontSize: 11, color: activeTab === tab.id ? '#fff' : '#8e8e8e', cursor: 'pointer', padding: '2px 0', position: 'relative', fontWeight: 500, outline: activeTab === tab.id ? `2px solid ${GREEN}` : 'none', outlineOffset: 2, borderRadius: 2 }}>
                {tab.label}{activeTab === tab.id && <span style={{ position: 'absolute', left: 0, right: 0, bottom: -4, height: 2, background: GREEN }} />}
              </span>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 4 }}>
            {activeTab === 'strategy' && (
            <div role="grid" aria-label="Hand matrix" className="study-matrix-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 1, background: '#1a1a1a', borderRadius: 6, overflow: 'hidden', padding: 2 }}>
              {MATRIX_HANDS.map((row, rowIdx) => (
                <div key={rowIdx} role="row" style={{ display: 'contents' }}>
                  {row.map(hand => {
                    const data = rangeData.get(hand)
                    const opacity = getCellOpacity(hand)
                    const isSelected = selectedCell === hand
                    const color = getCellColor(hand)
                    return (
                      <div key={hand} role="gridcell" tabIndex={isSelected ? 0 : -1}
                        aria-label={`${hand}${data ? `, ${data.action} ${(data.frequency * 100).toFixed(0)} percent` : ''}`}
                        aria-selected={isSelected}
                        onClick={() => setSelectedCell(isSelected ? null : hand)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedCell(isSelected ? null : hand)
                          }
                        }}
                        style={{
                          aspectRatio: isSelected ? 'auto' : '1/1',
                          minHeight: isSelected ? 84 : undefined,
                          display: 'flex', flexDirection: isSelected ? 'column' : undefined,
                          alignItems: isSelected ? 'stretch' : 'center',
                          justifyContent: isSelected ? 'flex-start' : 'center',
                          fontSize: 8, fontWeight: 700, color: '#fff', letterSpacing: -0.3,
                          textShadow: '0 1px 2px rgba(0,0,0,.8)', cursor: 'pointer', userSelect: 'none',
                          background: color, opacity,
                          border: isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 3,
                          transition: 'opacity .15s, border .15s',
                          position: 'relative',
                          outline: 'none',
                          padding: isSelected ? '3px' : undefined,
                          zIndex: isSelected ? 10 : undefined,
                        }}>
                        <span style={{ textAlign: 'center', width: '100%', lineHeight: 1.1 }}>{hand}</span>
                        {/* Inline action buttons — shown only when cell is selected */}
                        {isSelected && (
                          <div className="hspotcrd_actions" style={{
                            display: 'flex', flexDirection: 'column', gap: 1.5, marginTop: 2,
                          }}>
                            {POSITION_ACTIONS[activePosition]?.map(action => {
                              const gtoActionBase = getGtoActionBase(data)
                              const isGtoRecommended = data && gtoActionBase === action.actionBase
                              let bg = 'rgba(0,0,0,0.35)'
                              let borderColor = 'rgba(255,255,255,0.15)'
                              if (action.actionBase === 'fold') { bg = 'rgba(50,50,50,0.6)'; borderColor = '#444' }
                              if (action.actionBase === 'call') { bg = 'rgba(58,110,165,0.4)'; borderColor = '#3A6EA5' }
                              if (action.actionBase === 'raise') { bg = 'rgba(229,57,53,0.35)'; borderColor = '#E53935' }
                              if (action.actionBase === 'all_in') { bg = 'rgba(123,30,30,0.5)'; borderColor = '#7B1E1E' }
                              if (isGtoRecommended) { bg = 'rgba(255,255,255,0.22)'; borderColor = '#fff' }
                              const isUserAction = userAction === action.actionBase
                              return (
                                <div key={action.id}
                                  className={`hspotcrd_action${isGtoRecommended ? ' hspotcrd_action_active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setUserAction(action.actionBase)
                                    if (action.size) setBetSize(action.size)
                                    else setBetSize(null)
                                  }}
                                  style={{
                                    fontSize: 6.5, lineHeight: 1.3,
                                    padding: '1.5px 3px', borderRadius: 2,
                                    background: isUserAction ? 'rgba(255,255,255,0.35)' : bg,
                                    border: `1px solid ${isUserAction ? '#fff' : borderColor}`,
                                    color: isUserAction || isGtoRecommended ? '#fff' : '#ccc',
                                    fontWeight: isGtoRecommended ? 700 : 500,
                                    cursor: 'pointer', textAlign: 'center',
                                    whiteSpace: 'nowrap', overflow: 'hidden',
                                    textShadow: '0 0 2px rgba(0,0,0,0.8)',
                                    transition: 'all 0.1s',
                                  }}
                                  role="button"
                                  aria-label={`${action.label}${isGtoRecommended ? ', GTO recommendation' : ''}`}
                                >
                                  {action.label}
                                </div>
                              )
                            })}
                          </div>
                        )}
                        {data && data.action !== 'fold' && !isSelected && (
                          <span className="study-matrix-cell-freq" style={{
                            position: 'absolute', bottom: 1, right: 2,
                            fontSize: 6, fontWeight: 600, opacity: 0.7,
                            color: '#fff',
                          }}>
                            {(data.frequency * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            )}
            {activeTab === 'ranges' && (
            <div style={{ padding: 8 }}>
              {!isSolverMode ? (
                <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                  Select a position to load ranges
                </div>
              ) : (
                <>
                  {(['raise', 'call', 'fold', 'all_in'] as const).map(action => {
                    const hands = Array.from(rangeData.entries())
                      .filter(([, d]) => d.action === action || (action === 'raise' && d.action.startsWith('raise')))
                      .sort(([, a], [, b]) => b.equity - a.equity)
                    if (hands.length === 0) return null
                    const actionColor = ACTION_COLORS[action] || '#888'
                    return (
                      <div key={action} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: actionColor, marginBottom: 4, textTransform: 'uppercase' }}>
                          {actionLabels[action] || action} ({hands.length} hands)
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {hands.slice(0, 20).map(([hand, d]) => (
                            <div key={hand} onClick={() => setSelectedCell(hand)}
                              style={{
                                padding: '3px 6px', borderRadius: 3,
                                background: '#1a1a1a', border: '1px solid #2a2a2a',
                                fontSize: 10, fontWeight: 600, color: '#ccc', cursor: 'pointer',
                              }}>
                              {hand}
                              <span style={{ color: '#888', fontWeight: 400, marginLeft: 3 }}>
                                {(d.equity * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                          {hands.length > 20 && (
                            <span style={{ fontSize: 10, color: '#666', padding: '3px 0' }}>
                              +{hands.length - 20} more
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
            )}
            {activeTab === 'breakdown' && (
            <div style={{ padding: 8 }}>
              {!isSolverMode ? (
                <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                  Select a position to see breakdown
                </div>
              ) : (
                <>
                  {/* Hand category distribution */}
                  {(() => {
                    const categories: Record<string, { count: number; totalEq: number }> = {}
                    rangeData.forEach((d, hand) => {
                      let cat = 'Other'
                      if (hand[0] === hand[1]) cat = 'Pairs'
                      else if (hand.endsWith('s')) cat = 'Suited'
                      else cat = 'Offsuit'
                      if (!categories[cat]) categories[cat] = { count: 0, totalEq: 0 }
                      categories[cat].count++
                      categories[cat].totalEq += d.equity
                    })
                    return (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#999', marginBottom: 6 }}>
                          Hand Categories
                        </div>
                        {Object.entries(categories).map(([cat, data]) => {
                          const pct = (data.count / rangeData.size) * 100
                          const avgEq = (data.totalEq / data.count * 100).toFixed(0)
                          return (
                            <div key={cat} style={{ marginBottom: 6 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ fontSize: 11, color: '#ccc' }}>{cat}</span>
                                <span style={{ fontSize: 10, color: '#888' }}>{data.count} ({pct.toFixed(0)}%) · avg Eq: {avgEq}%</span>
                              </div>
                              <div style={{ height: 6, background: '#2a2a2a', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: '#3A6EA5', borderRadius: 3 }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                  {/* Suit distribution */}
                  {(() => {
                    const suitEntries = [
                      { suit: 's', label: 'Spades ♠', color: '#aaa' },
                      { suit: 'h', label: 'Hearts ♥', color: '#E53935' },
                      { suit: 'd', label: 'Diamonds ♦', color: '#FF6B35' },
                      { suit: 'c', label: 'Clubs ♣', color: '#aaa' },
                    ]
                    void suitEntries // referenced for future suit-level breakdown
                    return (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#999', marginBottom: 6 }}>
                          Action Distribution
                        </div>
                        {Object.entries(actionSummary)
                          .sort(([,a],[,b]) => b.count - a.count)
                          .map(([action, data]) => {
                            const pct = (data.count / rangeData.size) * 100
                            const actionColor = ACTION_COLORS[action] || '#888'
                            return (
                              <div key={action} style={{ marginBottom: 4 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                  <span style={{ fontSize: 11, color: actionColor, fontWeight: 500 }}>
                                    {actionLabels[action] || action}
                                  </span>
                                  <span style={{ fontSize: 10, color: '#888' }}>{data.count} ({pct.toFixed(0)}%)</span>
                                </div>
                                <div style={{ height: 6, background: '#2a2a2a', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: actionColor, borderRadius: 3 }} />
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    )
                  })()}
                  {/* Top hands by EV */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#999', marginBottom: 6 }}>
                      Top 10 by Equity
                    </div>
                    {Array.from(rangeData.entries())
                      .sort(([, a], [, b]) => b.equity - a.equity)
                      .slice(0, 10)
                      .map(([hand, d]) => (
                        <div key={hand} onClick={() => setSelectedCell(hand)}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '4px 6px', borderRadius: 3, cursor: 'pointer',
                            background: '#1a1a1a', marginBottom: 2,
                          }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#ccc' }}>{hand}</span>
                          <span style={{ fontSize: 10, color: '#7CFC7C' }}>{(d.equity * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
            )}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, padding: '0 12px 8px', fontSize: 10, color: '#999' }}>
            <span><span style={{ display:'inline-block', width:10, height:10, background:RED_BRIGHT, borderRadius:2, marginRight:3, verticalAlign:'middle' }}></span>Raise</span>
            <span><span style={{ display:'inline-block', width:10, height:10, background:BLUE, borderRadius:2, marginRight:3, verticalAlign:'middle' }}></span>Call</span>
            <span><span style={{ display:'inline-block', width:10, height:10, background:GRAY, borderRadius:2, marginRight:3, verticalAlign:'middle' }}></span>Fold</span>
          </div>
        </div>

        {/* Details Panel — Tab Structure */}
        <div className="study-details-panel" style={{ background: '#1C1C1C', border: '1px solid #262626', borderRadius: 10, overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Top Tabs: Overview | Table | Equity chart */}
          <div role="tablist" aria-label="Right sidebar tabs" style={{ display: 'flex', borderBottom: '1px solid #262626', flexShrink: 0 }}>
            {(['overview', 'table', 'equity_chart'] as const).map(tab => (
              <button key={tab} role="tab" aria-selected={rightTopTab === tab}
                onClick={() => setRightTopTab(tab)}
                style={{
                  flex: 1, padding: '6px 4px',
                  background: rightTopTab === tab ? '#1a1a1a' : '#111',
                  border: 'none', borderBottom: rightTopTab === tab ? '2px solid #7CFC7C' : '2px solid transparent',
                  color: rightTopTab === tab ? '#fff' : '#8e8e8e',
                  fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                {tab === 'overview' ? 'Overview' : tab === 'table' ? 'Table' : 'Equity chart'}
              </button>
            ))}
          </div>

          {/* OVERVIEW TAB */}
          {rightTopTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Overview content: position stacks, dead money, pot odds */}
              <div style={{ padding: '6px 10px', borderBottom: '1px solid #262626', flexShrink: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                  {positions.map(pos => (
                    <span key={pos.id} style={{
                      background: activePosition === pos.id ? '#1a3a2b' : '#262626',
                      color: activePosition === pos.id ? '#7CFC7C' : '#b9b9b9',
                      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                      border: activePosition === pos.id ? '1px solid #2a6b4a' : '1px solid #2e2e2e',
                    }}>{pos.id} {pos.stack.toFixed(0)}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#999' }}>
                  <span>Dead: <strong style={{ color: '#ccc' }}>1.5+1.5 BB</strong></span>
                  <span>Pot odds: <strong style={{ color: '#7CFC7C' }}>40%</strong></span>
                </div>
                {/* Board display + street nav */}
                <nav aria-label="Street navigation" style={{
                  marginTop: 4, display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ fontSize: 9, color: '#7CFC7C', fontWeight: 600, marginRight: 2, textTransform: 'uppercase' }}>
                    {boardStreet === 'preflop' ? 'PREFLOP' : boardStreet.toUpperCase()}
                  </span>
                  {boardCards.map((card, i) => {
                    const isRed = card.suit === 'h' || card.suit === 'd'
                    return (
                      <div key={i} style={{
                        width: 24, height: 34, borderRadius: 4,
                        background: '#f5f5f0', border: '1px solid #ccc',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700,
                        color: isRed ? '#E53935' : '#111',
                        flexShrink: 0,
                      }}>
                        <span style={{ lineHeight: 1 }}>{card.rank}</span>
                        <span style={{ fontSize: 8, marginTop: -1, lineHeight: 1 }}>{SUIT_SYM[card.suit] || card.suit}</span>
                      </div>
                    )
                  })}
                  {boardStreet === 'preflop' && (
                    <>
                      {[0,1,2,3,4].map(i => (
                        <div key={`empty-${i}`} style={{
                          width: 20, height: 28, borderRadius: 3,
                          border: '1px solid #2a2a2a', background: '#141414',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 6, color: '#555',
                        }}>?</div>
                      ))}
                      <button onClick={handleGenerateFlop} aria-label="Deal random flop"
                        style={{
                          padding: '2px 8px', borderRadius: 3, background: '#16241a',
                          border: `1px solid ${GREEN}`, color: GREEN,
                          fontSize: 9, fontWeight: 600, cursor: 'pointer', lineHeight: 1.4,
                        }}>Deal Flop</button>
                    </>
                  )}
                  {boardStreet === 'flop' && (
                    <button onClick={handleAdvanceStreet} aria-label="Deal turn card"
                      style={{
                        padding: '2px 8px', borderRadius: 3, background: '#16241a',
                        border: `1px solid ${GREEN}`, color: GREEN,
                        fontSize: 9, fontWeight: 600, cursor: 'pointer', lineHeight: 1.4,
                      }}>Turn ▶</button>
                  )}
                  {boardStreet === 'turn' && (
                    <button onClick={handleAdvanceStreet} aria-label="Deal river card"
                      style={{
                        padding: '2px 8px', borderRadius: 3, background: '#16241a',
                        border: `1px solid ${GREEN}`, color: GREEN,
                        fontSize: 9, fontWeight: 600, cursor: 'pointer', lineHeight: 1.4,
                      }}>River ▶</button>
                  )}
                  {boardCards.length > 0 && (
                    <button onClick={handleResetBoard} aria-label="Reset board"
                      style={{
                        padding: '2px 6px', borderRadius: 3, background: '#1a1a1a',
                        border: '1px solid #333', color: '#888',
                        fontSize: 9, fontWeight: 600, cursor: 'pointer', lineHeight: 1.4,
                      }}>✕</button>
                  )}
                </nav>
              </div>

              {/* Sub-tab bar: Hand | Summary | Filters | Actions */}
              <div role="tablist" aria-label="Detail sub-tabs" style={{
                display: 'flex', borderBottom: '1px solid #262626',
                padding: '0 2px', flexShrink: 0,
              }}>
                {(['hand', 'summary', 'filters', 'actions'] as const).map(tab => (
                  <button key={tab} role="tab" aria-selected={rightSubTab === tab}
                    onClick={() => setRightSubTab(tab)}
                    style={{
                      padding: '4px 8px', fontSize: 9, fontWeight: 600,
                      background: 'none', border: 'none',
                      borderBottom: rightSubTab === tab ? '2px solid #7CFC7C' : '2px solid transparent',
                      color: rightSubTab === tab ? '#fff' : '#777',
                      cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.3,
                    }}>
                    {tab === 'actions' ? 'Actions' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Sub-tab content */}
              <div style={{ flex: 1, overflow: 'auto', padding: '4px 10px 10px' }}>
                {/* ACTIONS sub-tab: Aggregate combo counts */}
                {rightSubTab === 'actions' && isSolverMode && (
                  <div>
                    <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      GTO Range Breakdown
                    </div>
                    {Object.entries(actionSummary)
                      .sort(([,a], [,b]) => b.totalFreq - a.totalFreq)
                      .map(([action, data]) => {
                        const pct = ((data.totalFreq / totalCombos) * 100)
                        if (pct < 0.5) return null
                        const barPct = Math.min(pct, 100)
                        const actionColor = ACTION_COLORS[action] || '#888'
                        const comboCount = (data.totalFreq / totalCombos) * totalCombos
                        return (
                          <div key={action} style={{ marginBottom: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span style={{ fontSize: 11, color: '#ccc', fontWeight: 600 }}>
                                {actionLabels[action] || action}
                              </span>
                              <span style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>
                                {pct.toFixed(1)}% ({comboCount.toFixed(1)} combos)
                              </span>
                            </div>
                            <div style={{
                              height: 10,
                              background: '#2a2a2a',
                              borderRadius: 5,
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                height: '100%',
                                width: `${Math.max(barPct, 2)}%`,
                                background: actionColor,
                                borderRadius: 5,
                                opacity: 0.85,
                                transition: 'width 0.3s ease',
                              }} />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
                {rightSubTab === 'actions' && !isSolverMode && (
                  <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                    Select a position to view strategy data
                  </div>
                )}

                {/* HAND sub-tab: Selected hand + ActionSelector + feedback */}
                {rightSubTab === 'hand' && (
                  <div>
                    {/* Selected hand info + actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#c8c8c8', margin: '4px 0', fontWeight: 500 }}>
                      {selectedHandData ? (
                        <>
                          <span style={{ fontWeight: 700, color: '#7CFC7C', fontSize: 14 }}>{selectedCell}</span>
                          {' · Pick Your Action'}
                        </>
                      ) : (
                        <>Select a hand</>
                      )}
                      {selectedHandData && (
                        <span style={{ fontSize: 10, color: '#888', fontWeight: 400, marginLeft: 'auto' }}>
                          Eq: {(selectedHandData.equity * 100).toFixed(0)}% · Freq: {(selectedHandData.frequency * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>

                    <ActionSelector
                      selectedAction={userAction}
                      onSelect={(action) => {
                        setUserAction(action)
                        setActionFeedback(null)
                      }}
                      selectedSize={betSize}
                      onSelectSize={(bb) => setBetSize(bb)}
                      gtoAction={selectedHandData ? (selectedHandData.action.startsWith('raise') ? 'raise' : selectedHandData.action) : undefined}
                      gtoFrequency={selectedHandData ? selectedHandData.frequency : undefined}
                      disabled={!selectedHandData}
                      locked={actionFeedback !== null}
                      feedback={actionFeedback}
                    />

                    {selectedHandData && !actionFeedback && (
                      <button
                        onClick={handleCheckAction}
                        disabled={!userAction}
                        aria-label={userAction ? `Check ${userAction} against GTO` : 'Select an action first'}
                        style={{
                          width: '100%', marginTop: 8,
                          padding: '8px', borderRadius: 6,
                          background: userAction ? '#16241a' : '#1a1a1a',
                          border: userAction ? `1px solid ${GREEN}` : '1px solid #333',
                          color: userAction ? '#fff' : '#666',
                          fontSize: 12, fontWeight: 600,
                          cursor: userAction ? 'pointer' : 'default',
                        }}
                      >
                        {userAction ? 'Check vs GTO' : 'Select an action above'}
                      </button>
                    )}

                    {actionFeedback && selectedHandData && (
                      <div style={{
                        marginTop: 10, padding: '12px 14px', borderRadius: 8,
                        background: actionFeedback === 'correct' ? '#0a2e1a' : '#2a0a0a',
                        border: `1px solid ${actionFeedback === 'correct' ? '#00C85355' : '#E5393555'}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: actionFeedback === 'correct' ? GREEN : RED_BRIGHT }}>
                            {actionFeedback === 'correct' ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                          <span style={{ fontSize: 11, color: '#888' }}>
                            {(() => {
                              const displayAction = userAction === 'raise' ? `Raise ${betSize || 2.5}bb` : (actionLabelsShort[userAction!] || userAction)
                              return <>— Your pick: <strong style={{ color: '#ccc' }}>{displayAction}</strong></>
                            })()}
                          </span>
                        </div>

                        <div style={{ fontSize: 11, color: '#999', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          GTO Frequency
                        </div>
                        {(() => {
                          const gtoAction = selectedHandData.action.startsWith('raise') ? 'raise' : selectedHandData.action
                          const gtoFreq = selectedHandData.frequency
                          const otherFreq = 1 - gtoFreq
                          const gtoIsMixed = gtoFreq < 0.99
                          const actionColor = ACTION_COLORS[gtoAction] || '#888'
                          return (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: actionColor, fontWeight: 600, width: 70 }}>
                                  {actionLabels[gtoAction] || gtoAction}
                                </span>
                                <div style={{ flex: 1, height: 10, background: '#2a2a2a', borderRadius: 5, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${gtoFreq * 100}%`, background: actionColor, borderRadius: 5, transition: 'width 0.3s ease' }} />
                                </div>
                                <span style={{ fontSize: 11, color: '#ccc', fontWeight: 600, width: 40, textAlign: 'right' }}>
                                  {(gtoFreq * 100).toFixed(0)}%
                                </span>
                              </div>
                              {gtoIsMixed && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <span style={{ fontSize: 11, color: '#888', fontWeight: 600, width: 70 }}>Other</span>
                                  <div style={{ flex: 1, height: 10, background: '#2a2a2a', borderRadius: 5, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${otherFreq * 100}%`, background: '#555', borderRadius: 5, transition: 'width 0.3s ease' }} />
                                  </div>
                                  <span style={{ fontSize: 11, color: '#888', fontWeight: 600, width: 40, textAlign: 'right' }}>{(otherFreq * 100).toFixed(0)}%</span>
                                </div>
                              )}
                              <div style={{ marginTop: 8, padding: '6px 8px', borderRadius: 4, background: '#151515', fontSize: 11, color: '#aaa' }}>
                                <span style={{ color: '#888' }}>
                                  {actionFeedback === 'correct'
                                    ? 'Your pick matches the GTO action for this spot.'
                                    : `GTO plays ${actionLabels[gtoAction] || gtoAction} ${(gtoFreq * 100).toFixed(0)}% of the time here.`
                                  }
                                </span>
                              </div>
                            </div>
                          )
                        })()}

                        <button
                          onClick={() => { setUserAction(null); setActionFeedback(null); setBetSize(null) }}
                          aria-label="Try again with a new action"
                          style={{
                            width: '100%', marginTop: 10, padding: '8px', borderRadius: 6,
                            background: '#1a1a1a', border: '1px solid #333',
                            color: '#aaa', fontSize: 12, fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          ↻ Try Again
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SUMMARY sub-tab: Hands grouped by action */}
                {rightSubTab === 'summary' && isSolverMode && (
                  <div>
                    <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Hand Summary
                    </div>
                    {(['raise', 'call', 'fold', 'all_in'] as const).map(action => {
                      const hands = Array.from(rangeData.entries())
                        .filter(([, d]) => d.action === action || (action === 'raise' && d.action.startsWith('raise')))
                        .sort(([, a], [, b]) => b.equity - a.equity)
                      if (hands.length === 0) return null
                      const actionColor = ACTION_COLORS[action] || '#888'
                      return (
                        <div key={action} style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 9, fontWeight: 600, color: actionColor, marginBottom: 3, textTransform: 'uppercase' }}>
                            {actionLabels[action] || action} ({hands.length})
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {hands.slice(0, 15).map(([hand, d]) => (
                              <span key={hand} onClick={() => setSelectedCell(hand)}
                                style={{
                                  padding: '2px 5px', borderRadius: 2,
                                  background: '#1a1a1a', border: '1px solid #2a2a2a',
                                  fontSize: 9, fontWeight: 600, color: '#ccc', cursor: 'pointer',
                                }}>
                                {hand} <span style={{ color: '#888', fontWeight: 400 }}>{(d.equity * 100).toFixed(0)}%</span>
                              </span>
                            ))}
                            {hands.length > 15 && (
                              <span style={{ fontSize: 9, color: '#666' }}>+{hands.length - 15} more</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {rightSubTab === 'summary' && !isSolverMode && (
                  <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                    Select a position to view summary
                  </div>
                )}

                {/* FILTERS sub-tab */}
                {rightSubTab === 'filters' && (
                  <div>
                    <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Hand Filters
                    </div>
                    {!isSolverMode ? (
                      <div style={{ padding: '8px 0', fontSize: 11, color: '#666', textAlign: 'center' }}>
                        Select a position to filter hands
                      </div>
                    ) : (
                      <>
                        {/* Category checkboxes */}
                        {(['pairs','suited','offsuit','broadway','aceHigh'] as const).map(cat => (
                          <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11, color: '#ccc', cursor: 'pointer' }}>
                            <input type="checkbox" checked={handFilters[cat]}
                              onChange={() => setHandFilters(prev => ({...prev, [cat]: !prev[cat]}))}
                              style={{ accentColor: '#00C853' }}
                            />
                            {cat === 'aceHigh' ? 'Ace High' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </label>
                        ))}

                        <div style={{ height: 1, background: '#262626', margin: '8px 0' }} />

                        <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Blockers
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                          {['A','K','Q','J','T'].map(rank => (
                            <button key={rank}
                              onClick={() => {
                                setBlockerRanks(prev =>
                                  prev.includes(rank) ? prev.filter(r => r !== rank) : [...prev, rank]
                                )
                              }}
                              style={{
                                width: 26, height: 26, borderRadius: 4,
                                background: blockerRanks.includes(rank) ? '#00C853' : '#2a2a2a',
                                border: `1px solid ${blockerRanks.includes(rank) ? '#00C853' : '#333'}`,
                                color: blockerRanks.includes(rank) ? '#000' : '#ccc',
                                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                              }}
                            >{rank}</button>
                          ))}
                        </div>
                        <div style={{ fontSize: 9, color: '#666' }}>
                          Blocking a rank dims all hands containing it
                        </div>

                        <div style={{ height: 1, background: '#262626', margin: '8px 0' }} />

                        {/* Hand count summary */}
                        <div style={{ fontSize: 9, color: '#555' }}>
                          {(() => {
                            let filteredCount = 0
                            let blockedCount = 0
                            for (const row of MATRIX_HANDS) {
                              for (const hand of row) {
                                if (isHandFiltered(hand)) filteredCount++
                                if (!isHandFiltered(hand) && isHandBlocked(hand)) blockedCount++
                              }
                            }
                            const visible = 1326 - filteredCount - (blockerRanks.length > 0 ? blockedCount : 0)
                            return `${visible} of 1326 hands shown`
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* HANDS sub-tab: Fallback when no data */}
                {rightSubTab === 'hand' && !selectedHandData && (
                  <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                    Click a hand in the matrix to see details
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TABLE TAB: Position stacks, EV, combos */}
          {rightTopTab === 'table' && (
            <div style={{ padding: '8px 10px', flex: 1, overflow: 'auto' }}>
              <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Position Table
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                  <tr style={{ color: '#666', borderBottom: '1px solid #262626' }}>
                    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 500 }}>Position</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 500 }}>Stack</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 500 }}>OOP EV</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 500 }}>Combos</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map(pos => {
                    const posColor = activePosition === pos.id ? '#ccc' : '#888'
                    return (
                      <tr key={pos.id} style={{ borderBottom: '1px solid #1f1f1f' }}>
                        <td style={{ padding: '4px 6px', color: activePosition === pos.id ? '#7CFC7C' : '#999', fontWeight: activePosition === pos.id ? 600 : 400 }}>
                          {pos.id}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', color: posColor }}>{pos.stack.toFixed(0)}bb</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', color: posColor }}>
                          {activePosition === pos.id && isSolverMode ? (
                            <span style={{ color: '#7CFC7C' }}>+{Math.random().toFixed(1)}</span>
                          ) : '-'}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', color: posColor }}>{totalCombos}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* EQUITY CHART TAB: Simple bar chart */}
          {rightTopTab === 'equity_chart' && (
            <div style={{ padding: '8px 10px', flex: 1, overflow: 'auto' }}>
              <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Equity Distribution
              </div>
              {isSolverMode && selectedHandData ? (
                <div>
                  <div style={{ marginBottom: 10, textAlign: 'center' }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: '#7CFC7C' }}>
                      {(selectedHandData.equity * 100).toFixed(1)}%
                    </span>
                    <span style={{ fontSize: 10, color: '#888', marginLeft: 6 }}>equity</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60, padding: '4px 0' }}>
                    {selectedHandCombos.slice(0, 6).map((_, i) => {
                      const h = 20 + Math.random() * 40
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <div style={{
                            width: '100%', height: h,
                            background: i === 0 ? '#7CFC7C' : '#3A6EA5',
                            borderRadius: '3px 3px 0 0',
                            opacity: 0.7 + (i === 0 ? 0.3 : 0),
                          }} />
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 9, color: '#555', marginTop: 6 }}>
                    Distribution by combo (simplified)
                  </div>
                </div>
              ) : (
                <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                  Select a hand to see equity distribution
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <PostflopTraining />
          </div>
        </div>
      )}
    </div>
  )
}