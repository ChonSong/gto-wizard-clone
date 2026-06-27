'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import PostflopTraining from '@/components/study/PostflopTraining'

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


const TAB_ORDER: Array<'strategy' | 'ranges' | 'breakdown'> = ['strategy', 'ranges', 'breakdown']

export default function StudyPage() {
  const [mode, setMode] = useState<'preflop' | 'postflop'>('preflop')
  const [activePosition, setActivePosition] = useState('UTG')
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [rangeData, setRangeData] = useState<Map<string, HandData>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSolverMode, setIsSolverMode] = useState(false)
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
  const [actionFilter, setActionFilter] = useState<string | null>(null)
  const [rightTopTab, setRightTopTab] = useState<'overview' | 'table' | 'equity_chart'>('overview')
  const [rightSubTab, setRightSubTab] = useState<'hand' | 'summary' | 'filters' | 'actions' | 'actions_chart' | 'range_compare' | 'blockers' | 'equity_chart' | 'compare_ev'>('actions')
  const [handFilters, setHandFilters] = useState<Record<string, boolean>>({ pairs: true, suited: true, offsuit: true, broadway: true, aceHigh: true })
  const [blockerRanks, setBlockerRanks] = useState<string[]>([])
  const [allPositionData, setAllPositionData] = useState<Map<string, Map<string, HandData>>>(new Map())
  const [allPositionLoading, setAllPositionLoading] = useState(false)

  const ALL_POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const

  const positions = useMemo(() => [
    { id: 'UTG', label: 'UTG', stack: stackDepth },
    { id: 'HJ', label: 'HJ', stack: stackDepth },
    { id: 'CO', label: 'CO', stack: stackDepth },
    { id: 'BTN', label: 'BTN', stack: stackDepth },
    { id: 'SB', label: 'SB', stack: Math.round(stackDepth - 0.5) },
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
        // Auto-select strongest non-fold hand so the range display is immediately usable
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

  // Fetch all 6 positions' data in parallel for the aggregate summary strip
  useEffect(() => {
    if (mode !== 'preflop') return
    let cancelled = false
    async function fetchAllPositions() {
      setAllPositionLoading(true)
      try {
        const results = await Promise.all(
          ALL_POSITIONS.map(async (pos) => {
            const stackForPos = pos === 'SB' ? Math.round(stackDepth - 0.5) : pos === 'BB' ? stackDepth - 1 : stackDepth
            const res = await fetch(`${API_BASE}/solver/preflop-range`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ position: pos, stack_depth: stackForPos }),
            })
            if (!res.ok) return { pos, data: new Map<string, HandData>() }
            const json = await res.json()
            const map = new Map<string, HandData>()
            for (const h of json.hands || []) map.set(h.hand, h)
            return { pos, data: map }
          })
        )
        if (cancelled) return
        const newMap = new Map<string, Map<string, HandData>>()
        for (const { pos, data } of results) newMap.set(pos, data)
        setAllPositionData(newMap)
      } catch {
        // Silently fail — summary strip will show "—"
      } finally {
        if (!cancelled) setAllPositionLoading(false)
      }
    }
    fetchAllPositions()
    return () => { cancelled = true }
  }, [stackDepth, mode])

  // Advance to next position when an action is clicked
  function handleActionClick(actionBase: string) {
    const order = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
    const idx = order.indexOf(activePosition)
    if (idx >= 0 && idx < order.length - 1) {
      setActivePosition(order[idx + 1])
      setActionFilter(null)
    }
  }

  // Compute per-position aggregate stats for the summary strip
  const positionAggregates = useMemo(() => {
    const agg: Record<string, { fold: number; call: number; raise: number; total: number }> = {}
    for (const pos of ALL_POSITIONS) {
      const data = allPositionData.get(pos)
      if (!data || data.size === 0) {
        agg[pos] = { fold: 0, call: 0, raise: 0, total: 0 }
        continue
      }
      let fold = 0, call = 0, raise = 0
      data.forEach((h) => {
        const action = h.action.startsWith('raise') ? 'raise' : h.action
        if (action === 'fold') fold++
        else if (action === 'call') call++
        else if (action === 'raise' || action === 'all_in') raise++
      })
      agg[pos] = { fold, call, raise, total: data.size }
    }
    return agg
  }, [allPositionData])

  const handCells = MATRIX_HANDS.flat()

  function getCellColor(hand: string): string {
    if (isSolverMode) {
      const data = rangeData.get(hand)
      if (!data || data.action === 'fold') return GRAY
      // Normalize action key: 'raise_2.5bb' → 'raise', 'raise_3bb' → 'raise', 'call' → 'call', 'all_in' → 'all_in'
      const actionKey = data.action.startsWith('raise') ? 'raise' : data.action
      return ACTION_COLORS[actionKey] || RED
    }
    // Fallback to hardcoded colors (used when solver API is unavailable)
    const redSet = new Set(['AA','AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s','AKo','KK','KQs','KJs','KTs','K9s','K8s','K7s','AQo','KQo','QQ','QJs','QTs','AJo','KJo','JJ','JTs','ATo','TT','99','98s','88','87s'])
    if (redSet.has(hand)) return RED
    return GRAY  // Default to fold-gray instead of blue when data isn't available
  }

  function getCellOpacity(hand: string): number {
    // Apply hand filters and blocker ranks first
    if (isHandFiltered(hand)) return 0.08
    if (isHandBlocked(hand)) return 0.15
    // Action filter: dim cells whose GTO action doesn't match
    if (actionFilter) {
      const data = rangeData.get(hand)
      const handAction = data ? (data.action.startsWith('raise') ? 'raise' : data.action) : null
      if (handAction !== actionFilter) return 0.08
    }
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

  // Compute weighted-average OOP EV from solver range data
  // Equity is per-hand win probability (0-1). Convert to bb EV:
  // EV = (avgEquity - 0.5) * potSize * 2  where potSize = 1.5bb for preflop
  const oopEV = useMemo((): number | null => {
    if (!isSolverMode || rangeData.size === 0) return null
    let weightedSum = 0
    let weightSum = 0
    rangeData.forEach((h) => {
      // Use frequency as weight — more frequently played hands contribute more
      weightedSum += h.equity * h.frequency
      weightSum += h.frequency
    })
    if (weightSum === 0) return null
    const avgEquity = weightedSum / weightSum
    // Preflop pot is typically 1.5bb (SB 0.5 + BB 1.0)
    // EV in bb = (equity - 0.5) * pot_amount * 2 (since equity is win% of total pot)
    return (avgEquity - 0.5) * 3
  }, [rangeData, isSolverMode])

  const totalCombos = 1326 // 52 choose 2

  const actionLabels: Record<string, string> = {
    raise: 'Raise 2.5',
    call: 'Call',
    fold: 'Fold',
    all_in: 'All In',
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

  // Auto-configure from URL params on mount (for cross-navigation from solutions/spots)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)

    const pos = params.get('position')
    const stack = params.get('stack')
    const board = params.get('board')
    const street = params.get('street')

    if (pos && ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'].includes(pos)) {
      setActivePosition(pos)
    }

    if (stack) {
      const s = parseFloat(stack)
      if (!isNaN(s) && s >= 10 && s <= 500) setStackDepth(Math.round(s))
    }

    if (board) {
      const parsed = parseBoardString(board)
      if (parsed.length >= 3) {
        setBoardCards(parsed)
        setMode('postflop')
        if (street && ['preflop', 'flop', 'turn', 'river'].includes(street)) {
          setBoardStreet(street as 'preflop' | 'flop' | 'turn' | 'river')
        } else {
          setBoardStreet('flop')
        }
      }
    }
  }, [])

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

    // Pick a random hand from the matrix
    const allHands = MATRIX_HANDS.flat()
    const randHand = allHands[Math.floor(Math.random() * allHands.length)]
    setSelectedCell(randHand)

    // 50% chance to also generate a random flop board (triggers postflop mode)
    if (Math.random() > 0.5) {
      const flop = generateRandomCards(3, [])
      setBoardCards(flop)
      setBoardStreet('flop')
    } else {
      setBoardCards([])
      setBoardStreet('preflop')
    }

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

      // Escape: deselect
      if (key === 'escape') {
        e.preventDefault()
        if (selectedCell) {
          setSelectedCell(null)
        }
        return
      }

      // ? key: toggle hotkeys overlay
      if (key === '?' || key === '/') {
        e.preventDefault()
        setShowHotkeys(prev => !prev)
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
  }, [mode, boardStreet, boardCards.length, selectedCell, selectedHandData, activeTab, activePosition, handleGenerateFlop, handleAdvanceStreet, handleResetBoard])

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
          .study-matrix-wrap {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .study-matrix-wrap::-webkit-scrollbar {
            height: 4px !important;
          }
          .study-matrix-wrap::-webkit-scrollbar-thumb {
            background: #333 !important;
            border-radius: 2px !important;
          }
          .study-matrix-cell {
            font-size: 12px !important;
            letter-spacing: 0 !important;
          }
          .study-spot-card-bar {
            gap: 3px !important;
            padding: 3px 4px !important;
            min-height: 44px !important;
          }
          .study-spot-card-bar .hspotcrd_title {
            font-size: 10px !important;
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
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .study-details-panel-table {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .study-top-bar {
            flex-wrap: wrap !important;
            gap: 6px !important;
            padding: 6px 8px !important;
          }
          .study-top-bar-upgrade {
            margin-left: auto !important;
          }
          .study-mode-toggle {
            flex-wrap: wrap !important;
            gap: 4px !important;
          }
          .study-stats-bar {
            flex-wrap: wrap !important;
            gap: 4px !important;
            padding: 3px 8px !important;
          }
          .study-panel-header {
            flex-wrap: wrap !important;
            gap: 4px !important;
          }
          .study-sub-tab-bar {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .study-street-nav {
            flex-wrap: wrap !important;
            gap: 3px !important;
          }
        }
        @media (max-width: 480px) {
          .study-matrix-cell {
            font-size: 11px !important;
            letter-spacing: 0 !important;
          }
          .study-matrix-cell-freq {
            display: block !important;
            font-size: 10px !important;
          }
          .study-spot-card-bar {
            min-height: 38px !important;
          }
          .study-spot-card-bar .hspotcrd_title {
            font-size: 9px !important;
          }
        }
        @media (max-width: 375px) {
          .study-top-bar {
            gap: 4px !important;
            padding: 4px 6px !important;
          }
          .study-top-bar > * {
            font-size: 10px !important;
          }
          .study-action-btn {
            padding: 10px 4px !important;
            min-height: 44px !important;
          }
          .study-details-panel {
            min-height: 250px !important;
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
        {/* Random Spot button */}
        <button onClick={handleRandomSpot}
          aria-label="Generate random training spot"
          style={{
            background: '#1a1a2e', border: '1px solid #3a3a5e',
            color: '#b0b0ff', padding: '3px 10px', borderRadius: 6,
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
            lineHeight: 1.5,
          }}>
          <span style={{ fontSize: 13 }}>🎲</span> Random Spot
        </button>
        <div style={{ width: 1, height: 16, background: '#333', flexShrink: 0 }} />
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
      <div className="study-mode-toggle" style={{ display: 'flex', gap: 8, padding: '6px 12px', borderBottom: '1px solid #141414', background: '#0E0E0E', flexShrink: 0 }}>
        <button onClick={() => setMode('preflop')}
          aria-pressed={mode === 'preflop'}
          aria-label="Preflop ranges mode"
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
          aria-pressed={mode === 'postflop'}
          aria-label="Postflop training mode"
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
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 4 }} data-hotkeys-popup>
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
                ['1-6', 'Postflop: Check/Bet/Fold/Call/Raise/Allin'],
                ['1-6', 'Postflop: Check/Bet/Fold/Call/Raise/Allin'],
                                ['↑↓←→', 'Navigate matrix'],
                ['Tab', 'Cycle tabs'],
                ['F', 'Deal flop / next street'],
                ['R', 'Reset board'],
                ['Esc', 'Deselect / close'],
                ['?', 'Toggle shortcuts'],
              ].map(([key, desc]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: '#7CFC7C', fontFamily: 'monospace', fontSize: 10 }}>{key}</span>
                  <span style={{ color: '#888' }}>{desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Action Prompt Header Row — contextual prompt showing active position */}
      <div className="study-action-prompt-bar" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: '#111', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
        <span style={{ color: GREEN, fontSize: 12, fontWeight: 700, letterSpacing: '0.03em' }}>{activePosition}</span>
        <span style={{ color: '#666', fontSize: 11 }}>—</span>
        <span style={{ color: '#aaa', fontSize: 11, fontWeight: 500 }}>Enter your action</span>
        <div style={{ flex: 1 }} />
        {mode === 'preflop' && selectedCell && (
          <span style={{ color: '#888', fontSize: 10, fontFamily: 'monospace' }}>{selectedCell}</span>
        )}
      </div>

      {mode === 'preflop' ? (<div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Stack Depth Selector — compact */}
      <div className="study-stack-selector" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#0E0E0E', borderBottom: '1px solid #141414', flexShrink: 0 }}>
        <span style={{ color: '#999', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>Stack:</span>
        {availableDepths.map(d => (
          <button key={d.value} onClick={() => setStackDepth(d.value)}
            aria-pressed={stackDepth === d.value}
            aria-label={`${d.label} stack depth${stackDepth === d.value ? ', selected' : ''}`}
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
      {/* Player Tiles — compact position tiles (active = green glow + actions, inactive = name + stack only) */}
      <div className="study-spot-card-bar" style={{ display: 'flex', alignItems: 'stretch', gap: 4, padding: '4px 12px', overflowX: 'auto', overflowY: 'hidden', background: '#0E0E0E', borderBottom: '1px solid #141414', flexShrink: 0, minHeight: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingRight: 6, flexShrink: 0 }}>
          <div style={{ background: '#1A1A1A', border: '1px solid #2a2a2a', color: '#d0d0d0', padding: '4px 6px', borderRadius: 6, fontSize: 10, display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
            {loading ? <span style={{ color: GREEN }}>●</span> : error ? <span style={{ color: RED }}>●</span> : <span style={{ color: GREEN }}>●</span>}
            {loading ? 'Solving...' : error ? 'Offline' : 'GTO'}
          </div>
        </div>
        {positions.map((pos) => {
          const isActive = activePosition === pos.id
          const posActions = POSITION_ACTIONS[pos.id] || []
          return (
            <div key={pos.id} onClick={() => { setActivePosition(pos.id); setActionFilter(null) }}
              className={`hspot-card ${isActive ? 'hspotcrd_active' : 'hspotcrd_minimized'}`}
              role="button" tabIndex={0}
              aria-label={`${pos.label} position, ${pos.stack != null && pos.stack > 0 ? `${pos.stack}bb stack` : 'no stack data'}${isActive ? ', active' : ''}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePosition(pos.id) } }}
              style={{
                cursor: 'pointer', borderRadius: 8,
                background: isActive ? '#1A2A1A' : '#161616',
                border: isActive ? `2px solid ${GREEN}` : '1px solid #222',
                display: 'flex', flexDirection: 'column',
                flexShrink: 0,
                minWidth: isActive ? 128 : 56,
                padding: isActive ? '4px 6px 6px' : '6px 10px',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? `0 0 8px ${GREEN}44` : 'none',
              }}>
              {/* Tile header: position name + stack in bb */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: isActive ? 3 : 0 }}>
                <span className="hspotcrd_title" style={{ fontWeight: 700, fontSize: isActive ? 12 : 11, color: isActive ? '#fff' : '#aaa', letterSpacing: '0.02em' }}>{pos.label}</span>
                <span style={{ fontSize: 9, color: isActive ? '#ccc' : '#666', whiteSpace: 'nowrap' }}>
                  {pos.stack != null && pos.stack > 0 ? `${pos.stack}bb` : '\u2014'}
                </span>
              </div>
              {/* Active only: "Take action" prompt + action buttons */}
              {isActive && (
                <>
                  <div className="hspotcrd_action_prompt" style={{ fontSize: 8, color: GREEN, fontWeight: 600, marginBottom: 3, letterSpacing: '0.02em' }}>
                    Take action ▶
                  </div>
                  <div className="hspotcrd_actions" style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {posActions.map(act => {
                      const actionColor = ACTION_COLORS[act.actionBase] || GRAY
                      const isActiveFilter = actionFilter === act.actionBase
                      return (
                        <div key={act.id} className={`hspotcrd_action${isActiveFilter ? ' hspotcrd_action_active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); handleActionClick(act.actionBase) }}
                          onMouseEnter={() => setActionFilter(act.actionBase)}
                          onMouseLeave={() => setActionFilter(null)}
                          role="button" tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActionClick(act.actionBase) } }}
                          style={{
                            fontSize: 8, padding: '1px 4px', lineHeight: '14px',
                            background: isActiveFilter ? `${actionColor}` : 'rgba(255,255,255,0.04)',
                            border: isActiveFilter ? `1px solid ${actionColor}` : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 3, color: isActiveFilter ? '#000' : '#999',
                            fontWeight: isActiveFilter ? 700 : 500, whiteSpace: 'nowrap',
                            cursor: 'pointer',
                          }}>
                          {act.label}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Per-Position Aggregate Summary Strip */}
      <div style={{
        display: 'flex', alignItems: 'stretch', gap: 0,
        padding: '4px 8px', background: '#0E0E0E',
        borderBottom: '1px solid #1a1a1a', flexShrink: 0,
        fontSize: 10, fontWeight: 500, color: '#888',
        overflow: 'hidden',
      }}>
        {ALL_POSITIONS.map((pos) => {
          const agg = positionAggregates[pos]
          const isActive = pos === activePosition
          const hasData = agg.total > 0
          const foldPct = hasData ? Math.round((agg.fold / 1326) * 100) : 0
          const callPct = hasData ? Math.round((agg.call / 1326) * 100) : 0
          const raisePct = hasData ? Math.round((agg.raise / 1326) * 100) : 0
          return (
            <div key={pos} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 1,
              padding: '2px 4px',
              borderBottom: isActive ? `2px solid ${GREEN}` : '2px solid transparent',
              opacity: hasData ? 1 : 0.4,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: isActive ? GREEN : '#666',
                letterSpacing: 0.3,
              }}>{pos}</span>
              <div style={{ display: 'flex', gap: 3, alignItems: 'center', fontSize: 9 }}>
                <span style={{ color: GRAY }}>F:{foldPct}%</span>
                <span style={{ color: BLUE }}>C:{callPct}%</span>
                <span style={{ color: RED_BRIGHT }}>R:{raisePct}%</span>
              </div>
              <span style={{ fontSize: 8, color: '#555' }}>
                {hasData ? `${agg.fold + agg.call + agg.raise} combos` : (allPositionLoading ? '...' : '—')}
              </span>
            </div>
          )
        })}
      </div>

      {/* Main Grid — fills remaining space, grid scrolls internally */}
      <div className="study-main-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 1fr)', gap: 8, padding: '0 12px', minHeight: 0 }}>
        {/* Matrix Panel */}
        <div style={{ background: '#1C1C1C', border: '1px solid #262626', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div role="tablist" aria-label="Strategy view tabs" className="study-panel-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 8px', borderBottom: '1px solid #262626', flexShrink: 0 }}>
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
          <div className="study-matrix-wrap" style={{ flex: 1, overflow: 'auto', padding: 4 }}>
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
                      <div key={hand} role="gridcell" className="study-matrix-cell" tabIndex={isSelected ? 0 : -1}
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
                          display: 'flex', flexDirection: 'column',
                          alignItems: isSelected ? 'stretch' : 'center',
                          justifyContent: 'center',
                          fontWeight: 700, color: '#fff', letterSpacing: -0.3,
                          fontSize: 12,
                          textShadow: '0 1px 2px rgba(0,0,0,.8)', cursor: 'pointer', userSelect: 'none',
                          background: data && data.action !== 'fold' && data.frequency < 1
                            ? `linear-gradient(to right, ${color} ${(data.frequency * 100).toFixed(0)}%, ${GRAY} ${(data.frequency * 100).toFixed(0)}%)`
                            : color,
                          opacity,
                          border: isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 3,
                          transition: 'opacity .15s, border .15s',
                          outline: 'none',
                          padding: isSelected ? '3px' : '4px 2px',
                          zIndex: isSelected ? 10 : undefined,
                          gap: 2,
                        }}>
                        <span style={{ textAlign: 'center', width: '100%', lineHeight: 1.1 }}>{hand}</span>

                        {data && data.action !== 'fold' && !isSelected && (
                          <span className="study-matrix-cell-freq" style={{
                            fontSize: 11, fontWeight: 700, opacity: 1,
                            color: '#fff',
                            background: 'rgba(0,0,0,0.45)',
                            padding: '1px 4px',
                            borderRadius: 2,
                            lineHeight: 1.2,
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
                <nav aria-label="Street navigation" className="study-street-nav" style={{
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

              {/* Sub-tab bar: Hand | Summary | Filters | Actions | Actions chart | Range compare | Blockers | Equity chart | Compare EV */}
              <div role="tablist" aria-label="Detail sub-tabs" className="study-sub-tab-bar" style={{
                display: 'flex', borderBottom: '1px solid #262626',
                padding: '0 2px', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none',
              }}>
                {([
                  { id: 'hand', label: 'Hand' },
                  { id: 'summary', label: 'Summary' },
                  { id: 'filters', label: 'Filters' },
                  { id: 'actions', label: 'Actions' },
                  { id: 'actions_chart', label: 'Act chart' },
                  { id: 'range_compare', label: 'Range cmp' },
                  { id: 'blockers', label: 'Blockers' },
                  { id: 'equity_chart', label: 'Eq chart' },
                  { id: 'compare_ev', label: 'Cmp EV' },
                ] as const).map(({ id, label }) => (
                  <button key={id} role="tab" aria-selected={rightSubTab === id}
                    onClick={() => setRightSubTab(id as typeof rightSubTab)}
                    style={{
                      padding: '4px 6px', fontSize: 9, fontWeight: 600,
                      background: 'none', border: 'none', whiteSpace: 'nowrap',
                      borderBottom: rightSubTab === id ? '2px solid #7CFC7C' : '2px solid transparent',
                      color: rightSubTab === id ? '#fff' : '#777',
                      cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.3,
                    }}>
                    {label}
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

                {/* HAND sub-tab: Selected hand GTO data */}
                {rightSubTab === 'hand' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#c8c8c8', margin: '4px 0', fontWeight: 500 }}>
                      {selectedHandData ? (
                        <span style={{ fontWeight: 700, color: '#7CFC7C', fontSize: 14 }}>{selectedCell}</span>
                      ) : (
                        <>Select a hand</>
                      )}
                      {selectedHandData && (
                        <span style={{ fontSize: 10, color: '#888', fontWeight: 400, marginLeft: 'auto' }}>
                          Eq: {(selectedHandData.equity * 100).toFixed(0)}% &middot; Freq: {(selectedHandData.frequency * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>

                    {selectedHandData && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 6 }}>
                          {(['fold', 'call', 'raise'] as const).map(action => {
                            const gtoActionBase = selectedHandData.action.startsWith('raise') ? 'raise' : selectedHandData.action
                            const isGto = action === gtoActionBase
                            const freq = isGto ? selectedHandData.frequency : 0
                            const combos = isGto ? Math.round(freq * 6) : 0
                            const actionColor = ACTION_COLORS[action] || '#2a2a2a'
                            return (
                              <div key={action} style={{
                                borderRadius: 8, padding: '10px 8px', color: '#fff',
                                background: isGto ? actionColor : '#141414',
                                border: isGto ? 'none' : '1px solid #2a2a2a',
                                textAlign: 'center',
                              }}>
                                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.9 }}>
                                  {actionLabels[action] || action}
                                  {isGto && <span style={{ fontSize: 8, marginLeft: 4, opacity: 0.7, fontWeight: 400 }}>GTO</span>}
                                </div>
                                <div style={{ fontSize: 22, fontWeight: 750, lineHeight: 1.2, marginTop: 2 }}>
                                  {isGto ? `${(freq * 100).toFixed(0)}%` : '-'}
                                </div>
                                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                                  {isGto ? `${combos} combo${combos !== 1 ? 's' : ''}` : ''}
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {selectedHandData.action === 'all_in' && (
                          <div style={{ marginTop: 6, borderRadius: 8, padding: '10px 8px', color: '#fff', background: RED_DARK, textAlign: 'center' }}>
                            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.9 }}>
                              All In <span style={{ fontSize: 8, marginLeft: 4, opacity: 0.7, fontWeight: 400 }}>GTO</span>
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 750, lineHeight: 1.2, marginTop: 2 }}>{(selectedHandData.frequency * 100).toFixed(0)}%</div>
                            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{Math.round(selectedHandData.frequency * 6)} combos</div>
                          </div>
                        )}

                        {selectedHandData.action.startsWith('raise') && (
                          <div style={{ marginTop: 8, fontSize: 11, color: '#aaa', textAlign: 'center', padding: '4px 8px', background: '#151515', borderRadius: 6 }}>
                            GTO sizing: <strong style={{ color: RED_BRIGHT }}>{selectedHandData.action.replace('raise_', '').replace('bb', '')}bb</strong> &middot; {(selectedHandData.frequency * 100).toFixed(0)}% frequency
                          </div>
                        )}

                        <div style={{ marginTop: 6, padding: '6px 8px', borderRadius: 4, background: '#111', fontSize: 10, color: '#777', lineHeight: 1.4 }}>
                          The GTO solution for this spot{' '}
                          {selectedHandData.frequency >= 0.9
                            ? 'always plays this action with this hand.'
                            : selectedHandData.frequency >= 0.5
                              ? 'prefers this action most of the time with this hand.'
                              : 'mixes between actions, with this being the primary line.'}
                        </div>
                      </>
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
                              aria-pressed={blockerRanks.includes(rank)}
                              aria-label={`${rank} blocker${blockerRanks.includes(rank) ? ', active' : ''}`}
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

                {/* BLOCKERS sub-tab: Card removal analysis */}
                {rightSubTab === 'blockers' && (
                  <div>
                    <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Card Removal Analysis
                    </div>

                    {(() => {
                      // Collect blocked ranks from board cards (postflop) + manual blockerRanks
                      const boardRanks = new Set<string>()
                      for (const card of boardCards) {
                        boardRanks.add(card.rank)
                      }
                      const allBlockedRanks = new Set<string>([...boardRanks, ...blockerRanks])

                      // Combo counting helpers
                      function countCombos(hand: string, blocked: Set<string>): number {
                        const r1 = hand[0], r2 = hand[1]
                        const b1 = blocked.has(r1) ? 1 : 0
                        const b2 = blocked.has(r2) ? 1 : 0
                        if (r1 === r2) {
                          // Pair: C(4,2)=6, C(3,2)=3, C(2,2)=1, else 0
                          const avail = 4 - b1
                          if (avail < 2) return 0
                          return avail * (avail - 1) / 2
                        }
                        const isSuited = hand.length === 3 && hand[2] === 's'
                        const totalRaw = (4 - b1) * (4 - b2)
                        if (isSuited) {
                          // Suited: one combo per suit pair, reduced by blocked cards
                          const suited = Math.max(0, 4 - b1 - b2)
                          return suited
                        }
                        // Offsuit: total minus suited
                        const suited = Math.max(0, 4 - b1 - b2)
                        return Math.max(0, totalRaw - suited)
                      }

                      // Count total combos
                      let totalCombos = 0
                      const perClass: Record<string, number> = {
                        pairs: 0, suited: 0, offsuit: 0, broadway: 0, aceHigh: 0,
                      }
                      for (const row of MATRIX_HANDS) {
                        for (const hand of row) {
                          const combos = countCombos(hand, allBlockedRanks)
                          totalCombos += combos
                          const cats = getHandCategories(hand)
                          if (cats.includes('pair')) perClass.pairs += combos
                          if (cats.includes('suited')) perClass.suited += combos
                          if (cats.includes('offsuit')) perClass.offsuit += combos
                          if (cats.includes('broadway')) perClass.broadway += combos
                          if (cats.includes('aceHigh')) perClass.aceHigh += combos
                        }
                      }

                      return (
                        <>
                          {/* Blocked cards section */}
                          <div style={{ marginBottom: 10 }}>
                            {boardCards.length > 0 && (
                              <div style={{ marginBottom: 6 }}>
                                <div style={{ fontSize: 9, color: '#aaa', marginBottom: 3 }}>
                                  Board cards blocking:
                                </div>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {boardCards.map((card, i) => (
                                    <span key={i} style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 2,
                                      padding: '2px 6px', borderRadius: 4,
                                      background: '#2a2a2a', fontSize: 10, fontWeight: 700,
                                      color: card.suit === 'h' || card.suit === 'd' ? '#E53935' : '#fff',
                                    }}>
                                      {card.rank}{card.suit === 'h' ? '♥' : card.suit === 'd' ? '♦' : card.suit === 'c' ? '♣' : '♠'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {allBlockedRanks.size > 0 && (
                              <div style={{ fontSize: 9, color: '#777' }}>
                                Blocked ranks: {Array.from(allBlockedRanks).sort().join(', ')}
                              </div>
                            )}
                            {allBlockedRanks.size === 0 && (
                              <div style={{ fontSize: 10, color: '#666', fontStyle: 'italic' }}>
                                No blockers active. Postflop board cards will appear here.
                              </div>
                            )}
                          </div>

                          <div style={{ height: 1, background: '#262626', margin: '8px 0' }} />

                          {/* Total combos */}
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '6px 8px', borderRadius: 4,
                            background: '#1a1a1a', marginBottom: 8,
                          }}>
                            <span style={{ fontSize: 10, color: '#aaa', fontWeight: 600 }}>Total Combos</span>
                            <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>
                              {totalCombos}
                              <span style={{ fontSize: 9, color: '#666', fontWeight: 400, marginLeft: 3 }}>
                                / 1326
                              </span>
                            </span>
                          </div>

                          {/* Per-class breakdown */}
                          <div style={{ fontSize: 9, color: '#aaa', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            By Hand Class
                          </div>
                          {([
                            { key: 'pairs', label: 'Pairs' },
                            { key: 'suited', label: 'Suited' },
                            { key: 'offsuit', label: 'Offsuit' },
                            { key: 'broadway', label: 'Broadway' },
                            { key: 'aceHigh', label: 'Ace High' },
                          ] as const).map(({ key, label }) => {
                            const val = perClass[key]
                            const pct = totalCombos > 0 ? ((val / totalCombos) * 100) : 0
                            return (
                              <div key={key} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '4px 6px', fontSize: 10, color: '#ccc',
                                borderBottom: '1px solid #1e1e1e',
                              }}>
                                <span>{label}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ color: '#fff', fontWeight: 600 }}>{val}</span>
                                  <span style={{ color: '#666', fontSize: 9 }}>{pct.toFixed(1)}%</span>
                                </div>
                              </div>
                            )
                          })}

                          {/* Blocked info per rank */}
                          {allBlockedRanks.size > 0 && (
                            <>
                              <div style={{ height: 1, background: '#262626', margin: '8px 0' }} />
                              <div style={{ fontSize: 9, color: '#aaa', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Blocking Effect
                              </div>
                              {Array.from(allBlockedRanks).sort().reverse().map(rank => {
                                // Calculate combos removed by this rank
                                const withoutThis = new Set(Array.from(allBlockedRanks).filter(r => r !== rank))
                                let combosWith = 0, combosWithout = 0
                                for (const row of MATRIX_HANDS) {
                                  for (const hand of row) {
                                    combosWith += countCombos(hand, allBlockedRanks)
                                    combosWithout += countCombos(hand, withoutThis)
                                  }
                                }
                                const removed = combosWithout - combosWith
                                return (
                                  <div key={rank} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '3px 6px', fontSize: 10, color: '#ccc',
                                    borderBottom: '1px solid #1e1e1e',
                                  }}>
                                    <span style={{ fontWeight: 700 }}>{rank}</span>
                                    <span style={{ color: '#E53935' }}>
                                      -{removed} combos
                                    </span>
                                  </div>
                                )
                              })}
                            </>
                          )}
                        </>
                      )
                    })()}
                  </div>
                )}

                {/* ACTIONS CHART sub-tab: Visual horizontal bar chart of action frequencies */}
                {rightSubTab === 'actions_chart' && (
                  <div>
                    <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Actions Chart
                    </div>
                    {!isSolverMode ? (
                      <div style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>
                        Select a position to view action distribution
                      </div>
                    ) : (
                      <>
                        {Object.entries(actionSummary)
                          .sort(([,a], [,b]) => b.totalFreq - a.totalFreq)
                          .map(([action, data]) => {
                            const pct = totalCombos > 0 ? ((data.totalFreq / totalCombos) * 100) : 0
                            if (pct < 0.5) return null
                            const barPct = Math.min(pct, 100)
                            const actionColor = ACTION_COLORS[action] || '#888'
                            const comboCount = (data.totalFreq / totalCombos) * totalCombos
                            const labelInside = barPct > 15
                            return (
                              <div key={action} style={{ marginBottom: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <span style={{ fontSize: 11, color: '#ccc', fontWeight: 600 }}>
                                    {actionLabels[action] || action}
                                  </span>
                                  <span style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>
                                    {pct.toFixed(1)}% ({comboCount.toFixed(1)}c)
                                  </span>
                                </div>
                                <div style={{
                                  height: 22,
                                  background: '#1a1a1a',
                                  borderRadius: 4,
                                  overflow: 'hidden',
                                  position: 'relative',
                                }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${Math.max(barPct, 3)}%`,
                                    background: `linear-gradient(90deg, ${actionColor}, ${actionColor}dd)`,
                                    borderRadius: 4,
                                    transition: 'width 0.3s ease',
                                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                                    paddingRight: 6,
                                  }}>
                                    {labelInside && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{pct.toFixed(0)}%</span>}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        <div style={{ height: 1, background: '#262626', margin: '8px 0' }} />
                        <div style={{ fontSize: 9, color: '#666', textAlign: 'center' }}>
                          Horizontal bar chart — GTO frequency distribution
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* RANGE COMPARE sub-tab: Side-by-side position range comparison */}
                {rightSubTab === 'range_compare' && (
                  <div>
                    <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Range Compare
                    </div>
                    <div style={{ fontSize: 9, color: '#777', marginBottom: 8 }}>
                      Compare raise frequency across positions
                    </div>
                    {!isSolverMode ? (
                      <div style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>
                        Select a position to compare ranges
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {ALL_POSITIONS.map(pos => {
                          const posData = allPositionData.get(pos)
                          const posRangeData = posData || rangeData
                          const posActionSummary: Record<string, number> = {}
                          posRangeData.forEach((h) => {
                            const a = h.action.startsWith('raise') ? 'raise' : h.action
                            posActionSummary[a] = (posActionSummary[a] || 0) + h.frequency
                          })
                          const raiseFreq = posRangeData.size > 0 ? (posActionSummary['raise'] || 0) / posRangeData.size * 100 : 0
                          const isActive = activePosition === pos
                          return (
                            <div key={pos} style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '4px 6px', borderRadius: 4,
                              background: isActive ? '#1a3a2b' : '#1a1a1a',
                              border: isActive ? '1px solid #2a6b4a' : '1px solid #262626',
                            }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700, width: 30,
                                color: isActive ? '#7CFC7C' : '#999',
                              }}>{pos}</span>
                              <div style={{
                                flex: 1, height: 14,
                                background: '#0e0e0e', borderRadius: 3, overflow: 'hidden',
                              }}>
                                <div style={{
                                  height: '100%', width: `${Math.min(raiseFreq, 100)}%`,
                                  background: isActive ? '#7CFC7C' : '#3A6EA5',
                                  borderRadius: 3, transition: 'width 0.3s ease',
                                }} />
                              </div>
                              <span style={{ fontSize: 9, color: '#888', width: 35, textAlign: 'right' }}>
                                {raiseFreq.toFixed(1)}%
                              </span>
                            </div>
                          )
                        })}
                        <div style={{ fontSize: 8, color: '#555', textAlign: 'center', marginTop: 4 }}>
                          Raise frequency by position — green = active
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* EQUITY CHART SUB-TAB: Equity distribution histogram */}
                {rightSubTab === 'equity_chart' && (
                  <div>
                    <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Equity Chart
                    </div>
                    {!isSolverMode ? (
                      <div style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>
                        Select a position to view equity distribution
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, padding: '8px 0' }}>
                          {(() => {
                            const buckets = [
                              { label: '0-20%', min: 0, max: 0.2, color: '#555' },
                              { label: '20-40%', min: 0.2, max: 0.4, color: '#3A6EA5' },
                              { label: '40-60%', min: 0.4, max: 0.6, color: '#7CFC7C' },
                              { label: '60-80%', min: 0.6, max: 0.8, color: '#3A6EA5' },
                              { label: '80-100%', min: 0.8, max: 1.0, color: '#E53935' },
                            ]
                            let maxCount = 1
                            const counts = buckets.map(b => {
                              let count = 0
                              rangeData.forEach(h => {
                                if (h.equity >= b.min && h.equity < b.max) count++
                              })
                              if (count > maxCount) maxCount = count
                              return { ...b, count }
                            })
                            return counts.map((bucket, i) => {
                              const h = (bucket.count / maxCount) * 70
                              return (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                  <div style={{
                                    width: '100%', height: Math.max(h, 2),
                                    background: bucket.color, borderRadius: '3px 3px 0 0',
                                    opacity: 0.85,
                                  }} />
                                  <span style={{ fontSize: 7, color: '#777', textAlign: 'center' }}>{bucket.label}</span>
                                </div>
                              )
                            })
                          })()}
                        </div>
                        <div style={{ height: 1, background: '#262626', margin: '4px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#888' }}>
                          <span>Avg equity: <strong style={{ color: '#ccc' }}>
                            {rangeData.size > 0
                              ? (Array.from(rangeData.values()).reduce((s, h) => s + h.equity, 0) / rangeData.size * 100).toFixed(1)
                              : '0'
                            }%
                          </strong></span>
                          <span>{rangeData.size} hands</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* COMPARE EV sub-tab: EV comparison across positions */}
                {rightSubTab === 'compare_ev' && (
                  <div>
                    <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Compare EV
                    </div>
                    <div style={{ fontSize: 9, color: '#777', marginBottom: 8 }}>
                      Expected value by position (bb)
                    </div>
                    {!isSolverMode ? (
                      <div style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>
                        Select a position to compare EV
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {ALL_POSITIONS.map(pos => {
                          const posData = allPositionData.get(pos)
                          const posRangeData = posData || rangeData
                          let avgEquity = 0.5
                          if (posRangeData.size > 0) {
                            let weightedSum = 0, weightSum = 0
                            posRangeData.forEach(h => { weightedSum += h.equity * h.frequency; weightSum += h.frequency })
                            avgEquity = weightSum > 0 ? weightedSum / weightSum : 0.5
                          }
                          const ev = (avgEquity - 0.5) * 3
                          const isActive = activePosition === pos
                          const barWidth = Math.min(Math.abs(ev) * 20, 100)
                          return (
                            <div key={pos} style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '3px 6px', borderRadius: 4,
                              background: isActive ? '#1a3a2b' : '#1a1a1a',
                              border: isActive ? '1px solid #2a6b4a' : '1px solid #262626',
                            }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700, width: 30,
                                color: isActive ? '#7CFC7C' : '#999',
                              }}>{pos}</span>
                              <div style={{
                                flex: 1, height: 12,
                                background: '#0e0e0e', borderRadius: 3, overflow: 'hidden',
                              }}>
                                <div style={{
                                  height: '100%', width: `${barWidth}%`,
                                  background: ev >= 0 ? '#2a6b4a' : '#6b2a2a',
                                  borderRadius: 3,
                                }} />
                              </div>
                              <span style={{
                                fontSize: 10, fontWeight: 600, width: 40, textAlign: 'right',
                                color: ev >= 0 ? '#7CFC7C' : '#E53935',
                              }}>
                                {ev >= 0 ? '+' : ''}{ev.toFixed(1)}
                              </span>
                            </div>
                          )
                        })}
                        <div style={{ fontSize: 8, color: '#555', textAlign: 'center', marginTop: 4 }}>
                          EV in bb — green = +EV, red = -EV
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Hand combo grid — individual card combos with styled suits */}
                {rightSubTab === 'hand' && selectedCell && (
                  <div style={{ marginTop: 8, borderTop: '1px solid #262626', paddingTop: 8 }}>
                    <div style={{ fontSize: 9, color: '#999', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Combos
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(() => {
                        if (!selectedCell) return null
                        const suitSymbols: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
                        const suitColors: Record<string, string> = { s: '#fff', h: '#E53935', d: '#E53935', c: '#fff' }
                        const suits = ['s', 'h', 'd', 'c']
                        const hand = selectedCell
                        const r1 = hand[0], r2 = hand[1]
                        const isPair = r1 === r2
                        const isSuited = hand.length === 3 && hand[2] === 's'
                        const isOffsuit = hand.length === 3 && hand[2] === 'o'
                        const combos: { s1: string; s2: string }[] = []

                        if (isPair) {
                          // Pair: C(4,2) = 6 combos — all unique suit pairs
                          for (let i = 0; i < suits.length; i++) {
                            for (let j = i + 1; j < suits.length; j++) {
                              combos.push({ s1: suits[i], s2: suits[j] })
                            }
                          }
                        } else if (isSuited) {
                          // Suited: 4 combos — same suit
                          for (const s of suits) combos.push({ s1: s, s2: s })
                        } else {
                          // Offsuit: 12 combos — different suits
                          for (const s1 of suits) {
                            for (const s2 of suits) {
                              if (s1 !== s2) combos.push({ s1, s2 })
                            }
                          }
                        }

                        return combos.map((c, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 2,
                            padding: '3px 5px', borderRadius: 4,
                            background: '#161616', border: '1px solid #262626',
                            fontSize: 9, fontWeight: 700,
                          }}>
                            <span style={{ color: '#fff' }}>{r1}</span>
                            <span style={{ color: suitColors[c.s1], fontSize: 8 }}>{suitSymbols[c.s1]}</span>
                            <span style={{ color: '#fff' }}>{r2}</span>
                            <span style={{ color: suitColors[c.s2], fontSize: 8 }}>{suitSymbols[c.s2]}</span>
                          </div>
                        ))
                      })()}
                    </div>
                    <div style={{ fontSize: 8, color: '#555', marginTop: 3, textAlign: 'right' }}>
                      {(() => {
                        if (!selectedCell) return ''
                        const hand = selectedCell
                        const r1 = hand[0], r2 = hand[1]
                        if (r1 === r2) return '6 combos'
                        if (hand.length === 3 && hand[2] === 's') return '4 combos'
                        return '12 combos'
                      })()}
                    </div>
                  </div>
                )}

                {/* HANDS sub-tab: Fallback when no data and no cell selected */}
                {rightSubTab === 'hand' && !selectedHandData && !selectedCell && (
                  <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                    Click a hand in the matrix to see details
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TABLE TAB: Position stacks, EV, combos */}
          {rightTopTab === 'table' && (
            <div className="study-details-panel-table" style={{ padding: '8px 10px', flex: 1, overflow: 'auto' }}>
              <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Position Table
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                  <tr style={{ color: '#666', borderBottom: '1px solid #262626' }}>
                    <th scope="col" style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 500 }}>Position</th>
                    <th scope="col" style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 500 }}>Stack</th>
                    <th scope="col" style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 500 }}>OOP EV</th>
                    <th scope="col" style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 500 }}>Combos</th>
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
                          {activePosition === pos.id && oopEV !== null ? (
                            <span style={{ color: oopEV >= 0 ? '#7CFC7C' : '#E53935' }}>
                              {oopEV >= 0 ? '+' : ''}{oopEV.toFixed(1)}
                            </span>
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
                      const h = Math.max(4, selectedHandData.equity * 55)
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