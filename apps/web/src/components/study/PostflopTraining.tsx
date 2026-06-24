'use client'

import { useState, useCallback, useEffect } from 'react'

// ── Colours ──────────────────────────────────────────────
const RED = '#D32F2F'
const RED_BRIGHT = '#E53935'
const RED_DARK = '#7B1E1E'
const BLUE = '#3A6EA5'
const GREEN = '#00C853'
const YELLOW = '#FDD835'
const GRAY = '#2a2a2a'
const BG_CARD = '#1C1C1C'
const BORDER = '#262626'
const TEXT_DIM = '#999'
const TEXT_BRIGHT = '#ddd'

const SUIT_SYMBOL: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
const SUIT_COLOR: Record<string, string> = { s: '#fff', h: RED, d: RED, c: '#fff' }

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

// ── Types ────────────────────────────────────────────────
interface StrategyAction {
  action: string
  frequency: number
  ev: number
}

interface StrategyResponse {
  actions: StrategyAction[]
  source: string
  status: string
  error?: string
  message?: string
}

interface ActionHistory {
  position: string
  action: string
  amount?: number
}

interface StreetRecord {
  street: string
  action: string | null
  amount?: number
}

const POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
const STREET_NAMES = ['preflop', 'flop', 'turn', 'river'] as const

// Default actions for the breadcrumb on unplayed streets
const DEFAULT_PREFLOP: StreetRecord = {
  street: 'preflop',
  action: 'BTN raise 2.5, BB call',
}

// ── Helpers ──────────────────────────────────────────────
export function parseBoardCards(boardStr: string): { rank: string; suit: string }[] {
  const cards: { rank: string; suit: string }[] = []
  const cleaned = boardStr.replace(/[^2-9TJQKAtshdch]/gi, '')
  for (let i = 0; i < cleaned.length; i += 2) {
    if (i + 1 < cleaned.length) {
      const rank = cleaned[i].toUpperCase()
      const suit = cleaned[i + 1].toLowerCase()
      cards.push({ rank, suit })
    }
  }
  return cards
}

/** Generate a random 2-char card (rank+suit) not in the exclude set. */
function generateRandomCard(excludeCards: string[]): string {
  const ranks = ['2','3','4','5','6','7','8','9','T','J','Q','K','A']
  const suits = ['s', 'h', 'd', 'c']
  const exclude = new Set(excludeCards.map(c => c.toLowerCase()))
  for (let attempt = 0; attempt < 200; attempt++) {
    const rank = ranks[Math.floor(Math.random() * ranks.length)]
    const suit = suits[Math.floor(Math.random() * suits.length)]
    const card = rank + suit
    if (!exclude.has(card.toLowerCase())) return card
  }
  return 'Xx' // unreachable given 52-card deck
}

/** Flatten parsed cards back to a raw board string like "KsKc3s". */
function boardCardsToString(cards: { rank: string; suit: string }[]): string {
  return cards.map(c => c.rank + c.suit).join('')
}

export function formatActionButton(action: string, potSize: number, stackDepth: number): { label: string; amount?: number } {
  if (action === 'check') return { label: 'CHECK' }
  if (action === 'fold') return { label: 'FOLD' }
  if (action === 'call') return { label: 'CALL', amount: Math.round(potSize * 0.5) }
  if (action.startsWith('all_in')) {
    const amt = action.includes(':') ? parseFloat(action.split(':')[1]) : stackDepth
    return { label: `ALL IN ${amt.toFixed(1)}`, amount: amt }
  }
  if (action.startsWith('bet')) {
    const pct = action.includes(':') ? parseFloat(action.split(':')[1]) : 0.33
    return { label: `BET ${(pct * 100).toFixed(0)}%`, amount: Math.round(potSize * pct) }
  }
  if (action.startsWith('raise')) {
    const pct = action.includes(':') ? parseFloat(action.split(':')[1]) : 0.5
    return { label: `RAISE ${(pct * 100).toFixed(0)}%`, amount: Math.round(potSize * pct) }
  }
  return { label: action.toUpperCase() }
}

/** Extract the action type key from an action string (e.g. 'all_in:98.185' → 'all_in'). */
export function getActionKey(action: string): string {
  if (action.startsWith('bet')) return 'bet'
  if (action.startsWith('raise')) return 'raise'
  if (action.startsWith('all_in')) return 'all_in'
  return action
}

// Compute the new pot size after a given action is taken
export function computeNextPot(action: string, currentPot: number, stackDepth: number): number {
  if (action === 'check' || action === 'fold') return currentPot
  if (action === 'call') return currentPot * 2
  if (action.startsWith('bet:')) {
    const pct = parseFloat(action.split(':')[1])
    return currentPot + 2 * currentPot * pct
  }
  if (action.startsWith('raise:')) {
    const pct = parseFloat(action.split(':')[1])
    return currentPot + 2 * currentPot * pct
  }
  if (action.startsWith('all_in')) return stackDepth * 2
  return currentPot
}

// Get the display label and amount for a street's action
export function streetActionLabel(action: string, potSize: number, stackDepth: number): string {
  if (action === 'check') return 'Check'
  if (action === 'fold') return 'Fold'
  if (action === 'call') return 'Call'
  if (action.startsWith('bet:')) {
    const pct = parseFloat(action.split(':')[1])
    return `Bet ${(pct * 100).toFixed(0)}%`
  }
  if (action.startsWith('raise:')) {
    const pct = parseFloat(action.split(':')[1])
    return `Raise ${(pct * 100).toFixed(0)}%`
  }
  if (action.startsWith('all_in')) return 'All In'
  return action
}

// Button color based on action type
export function actionColor(action: string): string {
  if (action === 'fold') return GRAY
  if (action === 'check') return '#555'
  if (action === 'call') return BLUE
  if (action.startsWith('bet')) return '#E65100'
  if (action.startsWith('raise')) return RED_BRIGHT
  if (action.startsWith('all_in')) return RED_DARK
  return '#555'
}

// ── Card Display Component ───────────────────────────────
function CardDisplay({ rank, suit, small }: { rank: string; suit: string; small?: boolean }) {
  const size = small ? 32 : 40
  const h = small ? 44 : 56
  const isRed = suit === 'h' || suit === 'd'
  return (
    <div style={{
      width: size, height: h, borderRadius: 6,
      background: '#f5f5f0', border: '1px solid #ddd',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', fontSize: small ? 11 : 14,
      fontWeight: 700, color: isRed ? RED : '#111',
      boxShadow: '0 2px 8px rgba(0,0,0,.35)',
      flexShrink: 0,
    }}>
      <span style={{ lineHeight: 1 }}>{rank}</span>
      <span style={{ fontSize: small ? 12 : 16, lineHeight: 1, marginTop: 1, color: isRed ? RED : '#111' }}>{SUIT_SYMBOL[suit] || suit}</span>
    </div>
  )
}

// ── Street Breadcrumb Component ──────────────────────────
function StreetBreadcrumb({
  streetIndex,
  streetActions,
  potSize,
  stackDepth,
}: {
  streetIndex: number
  streetActions: (string | null)[]
  potSize: number
  stackDepth: number
}) {
  const allStreets = ['Preflop', 'Flop', 'Turn', 'River']
  const actionLabels = ['BTN raise 2.5, BB call', ...streetActions.map((a, i) =>
    a ? streetActionLabel(a, potSize, stackDepth) : null
  )]

  return (
    <div role="navigation" aria-label="Street progression" style={{
      display: 'flex', alignItems: 'center', gap: 4,
      marginBottom: 12, flexWrap: 'wrap',
    }}>
      {allStreets.map((name, i) => {
        // streetIndex 0=flop, so street i=1=flop, i=2=turn, i=3=river
        // preflop (i=0) is always completed
        const isPreflop = i === 0
        const isPast = isPreflop || i - 1 < streetIndex
        const isCurrent = !isPreflop && i - 1 === streetIndex
        const isFuture = !isPreflop && i - 1 > streetIndex
        const hasAction = isPreflop || (streetActions[i - 1] != null)

        return (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: isCurrent ? '#16241a' : isPast ? '#151515' : '#111',
              border: isCurrent ? `1px solid ${GREEN}55` : isPast ? '1px solid #2a2a2a' : '1px solid #1a1a1a',
              borderRadius: 6, padding: '5px 10px',
              opacity: isFuture ? 0.4 : 1,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: isCurrent ? GREEN : isPast ? '#555' : '#222',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: isCurrent ? GREEN : isPast ? TEXT_BRIGHT : TEXT_DIM,
                textTransform: 'uppercase', letterSpacing: 0.3,
              }}>
                {name}
              </span>
              {hasAction && (
                <span style={{
                  fontSize: 10, color: TEXT_DIM, marginLeft: 2,
                  maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {actionLabels[i]}
                </span>
              )}
              {isFuture && (
                <span style={{ fontSize: 10, color: '#444', marginLeft: 2 }}>
                  🔒
                </span>
              )}
            </div>
            {i < allStreets.length - 1 && (
              <span style={{ color: '#333', fontSize: 12, margin: '0 2px' }}>→</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────
interface PostflopTrainingProps {
  onToggle?: () => void
}

export default function PostflopTraining({ onToggle }: PostflopTrainingProps) {
  const [boardStr, setBoardStr] = useState('KsKc3s5h9d')
  const [potSize, setPotSize] = useState(5.5)
  const [stackDepth, setStackDepth] = useState(100)
  const [streetIndex, setStreetIndex] = useState(0) // 0=flop, 1=turn, 2=river
  const [activePosition, setActivePosition] = useState('BTN')
  const [handPositions, setHandPositions] = useState<string[]>(['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'])
  const [heroCards, setHeroCards] = useState('')
  const [configOpen, setConfigOpen] = useState(false)
  const [history] = useState<ActionHistory[]>([])
  const [strategy, setStrategy] = useState<StrategyResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [userChoice, setUserChoice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Track actions taken per street (index 0=flop, 1=turn, 2=river)
  const [streetActions, setStreetActions] = useState<(string | null)[]>([null, null, null])

  const allBoardCards = parseBoardCards(boardStr)

  // Reveal cards progressively based on street
  const cardsToShow = streetIndex === 0
    ? allBoardCards.slice(0, 3)       // Flop: first 3 cards
    : streetIndex === 1
      ? allBoardCards.slice(0, 4)     // Turn: first 4 cards
      : allBoardCards.slice(0, 5)     // River: all 5 cards

  const currentStreet = STREET_NAMES[streetIndex + 1] // +1 because index 0 in STREET_NAMES is preflop

  const fetchStrategy = useCallback(async () => {
    setLoading(true)
    setError(null)
    setUserChoice(null)
    try {
      const res = await fetch(`${API_BASE}/solver/postflop-strategy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board: boardStr,
          position: activePosition,
          street: currentStreet,
          pot_size: potSize,
          stack_depth: stackDepth,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: StrategyResponse = await res.json()
      setStrategy(data)
    } catch (err: any) {
      setError(err.message)
      setStrategy(null)
    } finally {
      setLoading(false)
    }
  }, [boardStr, activePosition, currentStreet, potSize, stackDepth])

  const handleRandomSpot = useCallback(() => {
    // Random common board textures
    const commonBoards = [
      'KsKc3s', 'Ah8h3h', 'QdJdTc', '7c6c5c', 'AdKdQc',
      'JsTs9s', '2h7hQh', 'KcQcJc', 'AsKs2s', 'Tc9c8c',
      'AhKhQh', 'KdJdTd', 'QhTh9h', 'Jc9c8c', 'Td9d8d',
    ]
    const randBoard = commonBoards[Math.floor(Math.random() * commonBoards.length)]

    // Random position
    const posIds = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
    const randPos = posIds[Math.floor(Math.random() * posIds.length)]

    // Random pot size (3-20bb)
    const randPot = Math.round((3 + Math.random() * 17) * 10) / 10

    // Random stack depth
    const depths = [50, 100, 150, 200]
    const randDepth = depths[Math.floor(Math.random() * depths.length)]

    // Random street (0=flop, 1=turn, 2=river)
    const randStreet = Math.floor(Math.random() * 3)

    // Update state
    setBoardStr(randBoard)
    setActivePosition(randPos)
    setPotSize(randPot)
    setStackDepth(randDepth)
    setStreetIndex(randStreet)
    setStreetActions([null, null, null])
    setUserChoice(null)
    setStrategy(null)
    setError(null)
  }, [])

  // Group strategy actions by type for display
  const groupedActions = strategy?.actions?.reduce((acc, a) => {
    const key = a.action.startsWith('bet') ? 'bet' :
                a.action.startsWith('raise') ? 'raise' :
                a.action.startsWith('all_in') ? 'all_in' : a.action
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {} as Record<string, StrategyAction[]>) ?? {}

  // Best action per type (highest frequency)
  const bestActions = Object.entries(groupedActions).map(([key, actions]) => {
    const best = actions.sort((a, b) => b.frequency - a.frequency)[0]
    return { key, ...best }
  }).sort((a, b) => b.frequency - a.frequency)

  const actionTaken = streetActions[streetIndex] != null
  const isLastStreet = streetIndex >= 2

  const handleAction = (action: string) => {
    setUserChoice(action)
    // Record the action for this street
    const updated = [...streetActions]
    updated[streetIndex] = action
    setStreetActions(updated)
    if (!strategy) {
      fetchStrategy()
    }
  }

  // Postflop hotkey handler: 1-6 for action types
  useEffect(() => {
    const POSTFLOP_KEY_MAP: Record<string, string> = {
      '1': 'check',
      '2': 'bet',
      '3': 'fold',
      '4': 'call',
      '5': 'raise',
      '6': 'all_in',
    }

    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const key = e.key.toLowerCase()
      const actionType = POSTFLOP_KEY_MAP[key]
      if (!actionType) return

      // Don't fire if already selected something or loading
      if (userChoice) return
      if (loading) return

      e.preventDefault()

      // Find the first button matching this action type
      const buttons = [
        { action: 'check', label: 'CHECK' },
        { action: 'bet:0.33', label: 'BET 33%' },
        { action: 'bet:0.5', label: 'BET 50%' },
        { action: 'bet:0.75', label: 'BET 75%' },
        { action: 'bet:1.25', label: 'BET 125%' },
        { action: 'fold', label: 'FOLD' },
        { action: 'call', label: 'CALL' },
        { action: 'raise:0.5', label: 'RAISE 50%' },
        { action: 'raise:1.0', label: 'RAISE 100%' },
        { action: 'all_in', label: `ALL IN ${stackDepth.toFixed(1)}` },
      ]

      const btn = buttons.find(b => getActionKey(b.action) === actionType)
      if (btn) {
        handleAction(btn.action)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [userChoice, loading, strategy, handleAction, stackDepth])

  const advanceToNextStreet = () => {
    if (isLastStreet) return

    // Calculate new pot based on the action taken
    const currentAction: string = streetActions[streetIndex] ?? 'check'
    const nextPot = computeNextPot(currentAction, potSize, stackDepth)
    setPotSize(nextPot)

    // Advance to next street
    const nextIndex = streetIndex + 1
    const nextStreet = STREET_NAMES[nextIndex + 1]
    const cardsNeeded = nextIndex === 1 ? 4 : 5 // 4 for turn, 5 for river

    // Auto-generate random cards if the board is too short for the next street
    const parsed = parseBoardCards(boardStr)
    let updatedBoard = boardStr
    if (parsed.length < cardsNeeded) {
      const existing = parsed.map(c => c.rank + c.suit)
      const hero = heroCards.trim()
      const heroParsed = hero ? parseBoardCards(hero) : []
      const used = [...existing, ...heroParsed.map(c => c.rank + c.suit)]
      for (let i = parsed.length; i < cardsNeeded; i++) {
        const card = generateRandomCard(used)
        updatedBoard += card
        used.push(card)
      }
      setBoardStr(updatedBoard)
    }

    setStreetIndex(nextIndex)
    setUserChoice(null)
    setStrategy(null)
    setError(null)

    // Fetch strategy for the new street on next render
    // Use setTimeout to let state settle
    setTimeout(() => {
      setLoading(true)
      fetch(`${API_BASE}/solver/postflop-strategy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board: updatedBoard,
          position: activePosition,
          street: nextStreet,
          pot_size: nextPot,
          stack_depth: stackDepth,
        }),
      })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
        .then((data: StrategyResponse) => {
          setStrategy(data)
          setLoading(false)
        })
        .catch((err: any) => {
          setError(err.message)
          setLoading(false)
        })
    }, 0)
  }

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Street breadcrumb */}
      <div style={{ flexShrink: 0 }}>
        <StreetBreadcrumb
          streetIndex={streetIndex}
          streetActions={streetActions}
          potSize={potSize}
          stackDepth={stackDepth}
        />
      </div>

      {/* Configure Spot Button & Panel */}
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <button onClick={() => setConfigOpen(!configOpen)}
          aria-expanded={configOpen}
          aria-label={configOpen ? 'Close configure spot panel' : 'Open configure spot panel'}
          style={{
            background: configOpen ? '#1a3a2b' : '#161616',
            border: configOpen ? `1px solid ${GREEN}` : '1px solid #262626',
            color: configOpen ? GREEN : '#ccc',
            padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', transition: 'all .1s', display: 'flex', alignItems: 'center', gap: 6,
          }}>
          <span style={{ fontSize: 14 }}>{configOpen ? '▾' : '▸'}</span>
          Configure Spot
        </button>

        {configOpen && (
          <div style={{
            marginTop: 8, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
            padding: '14px 16px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>

              {/* Position selection */}
              <div>
                <label style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Positions in Hand
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {POSITIONS.map(pos => (
                    <label key={pos} style={{
                      fontSize: 12, color: TEXT_BRIGHT, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: handPositions.includes(pos) ? '#1a3a2b' : '#151515',
                      border: `1px solid ${handPositions.includes(pos) ? GREEN + '44' : '#2a2a2a'}`,
                      borderRadius: 6, padding: '4px 8px',
                    }}>
                      <input type="checkbox" checked={handPositions.includes(pos)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setHandPositions([...handPositions, pos])
                          } else {
                            const next = handPositions.filter(p => p !== pos)
                            if (next.length > 0) {
                              setHandPositions(next)
                              if (activePosition === pos) setActivePosition(next[0])
                            }
                          }
                        }}
                        style={{ accentColor: GREEN, width: 14, height: 14 }} />
                      {pos}
                    </label>
                  ))}
                </div>
              </div>

              {/* Active position */}
              <div>
                <label style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Active Position
                </label>
                <select value={activePosition} onChange={(e) => setActivePosition(e.target.value)}
                  aria-label="Active position"
                  style={{
                    background: '#151515', border: `1px solid ${BORDER}`, borderRadius: 6,
                    color: TEXT_BRIGHT, padding: '6px 8px', fontSize: 12, width: '100%',
                  }}>
                  {handPositions.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>

              {/* Board cards */}
              <div>
                <label style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Board Cards (e.g. KsKc3s5h9d)
                </label>
                <input type="text" value={boardStr} onChange={(e) => {
                  setBoardStr(e.target.value)
                  // Reset street navigation when board changes
                  setStreetIndex(0)
                  setStreetActions([null, null, null])
                  setUserChoice(null)
                  setStrategy(null)
                  setError(null)
                }}
                  aria-label="Board cards"
                  placeholder="KsKc3s5h9d"
                  style={{
                    background: '#151515', border: `1px solid ${BORDER}`, borderRadius: 6,
                    color: TEXT_BRIGHT, padding: '6px 8px', fontSize: 12, width: '100%',
                  }} />
                <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 4 }}>
                  Enter up to 5 cards. First 3 = flop, 4th = turn, 5th = river.
                </div>
              </div>

              {/* Pot size */}
              <div>
                <label style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Pot Size (bb)
                </label>
                <input type="number" value={potSize} onChange={(e) => {
                  setPotSize(Number(e.target.value))
                  setStreetIndex(0)
                  setStreetActions([null, null, null])
                  setUserChoice(null)
                  setStrategy(null)
                }}
                  min={0} step={0.1}
                  aria-label="Pot size in big blinds"
                  style={{
                    background: '#151515', border: `1px solid ${BORDER}`, borderRadius: 6,
                    color: TEXT_BRIGHT, padding: '6px 8px', fontSize: 12, width: '100%',
                  }} />
              </div>

              {/* Stack depth */}
              <div>
                <label style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Stack Depth (bb)
                </label>
                <input type="number" value={stackDepth} onChange={(e) => {
                  setStackDepth(Number(e.target.value))
                  setStreetIndex(0)
                  setStreetActions([null, null, null])
                  setUserChoice(null)
                  setStrategy(null)
                }}
                  min={0} step={5}
                  aria-label="Stack depth in big blinds"
                  style={{
                    background: '#151515', border: `1px solid ${BORDER}`, borderRadius: 6,
                    color: TEXT_BRIGHT, padding: '6px 8px', fontSize: 12, width: '100%',
                  }} />
              </div>

              {/* Street (read-only indicator) */}
              <div>
                <label style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Starting Street
                </label>
                <div style={{
                  background: '#151515', border: `1px solid ${BORDER}`, borderRadius: 6,
                  color: GREEN, padding: '6px 8px', fontSize: 12, fontWeight: 600,
                }}>
                  Flop
                </div>
              </div>

              {/* Hero cards (optional) */}
              <div>
                <label style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Hero Cards (optional)
                </label>
                <input type="text" value={heroCards} onChange={(e) => {
                  setHeroCards(e.target.value)
                  setStreetIndex(0)
                  setStreetActions([null, null, null])
                  setStrategy(null)
                }}
                  aria-label="Hero cards (optional)"
                  placeholder="e.g. AhKh"
                  style={{
                    background: '#151515', border: `1px solid ${BORDER}`, borderRadius: 6,
                    color: TEXT_BRIGHT, padding: '6px 8px', fontSize: 12, width: '100%',
                  }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Board display */}
      <div style={{
        background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
        padding: '14px 16px', marginBottom: 12, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Board cards - progressive reveal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11, color: TEXT_DIM, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 1,
            }}>
              {currentStreet}
            </span>
            {cardsToShow.map((c, i) => (
              <CardDisplay key={i} {...c} />
            ))}
            {/* Show empty slots for unrevealed cards */}
            {streetIndex === 0 && allBoardCards.length >= 4 && (
              <>
                <div style={{
                  width: 36, height: 50, borderRadius: 6,
                  background: '#111', border: '1px dashed #2a2a2a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: '#444',
                }}>+1</div>
                {allBoardCards.length >= 5 && (
                  <div style={{
                    width: 36, height: 50, borderRadius: 6,
                    background: '#111', border: '1px dashed #2a2a2a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#444',
                  }}>+1</div>
                )}
              </>
            )}
            {streetIndex === 1 && allBoardCards.length >= 5 && (
              <div style={{
                width: 36, height: 50, borderRadius: 6,
                background: '#111', border: '1px dashed #2a2a2a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#444',
              }}>+1</div>
            )}
          </div>

          {/* Pot size */}
          <div style={{
            background: '#111', border: '1px solid #2a2a2a', borderRadius: 8,
            padding: '6px 14px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase' }}>Pot</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: TEXT_BRIGHT }}>{potSize.toFixed(1)}</div>
          </div>

          {/* Random Spot button */}
          <button onClick={() => { handleRandomSpot(); setTimeout(fetchStrategy, 50) }}
            disabled={loading}
            aria-label="Generate random postflop spot"
            style={{
              background: '#1a1a2e', border: '1px solid #3a3a5e',
              color: '#b0b0ff', padding: '8px 14px', borderRadius: 8,
              fontSize: 12, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
            <span style={{ fontSize: 14 }}>🎲</span> Random Spot
          </button>
          {/* Refresh strategy */}
          <button onClick={fetchStrategy} disabled={loading} aria-label={loading ? 'Solving' : strategy ? 'Refresh GTO strategy' : 'Get GTO strategy'}
            style={{
            background: '#16241a', border: `1px solid ${GREEN}33`, borderRadius: 8,
            color: GREEN, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            marginLeft: 'auto', opacity: loading ? 0.6 : 1,
          }}>
            {loading ? 'Solving...' : strategy ? '⟳ Refresh' : 'Get GTO Strategy'}
          </button>
        </div>

        {/* Position columns */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          {handPositions.map(pos => {
            const hist = history.find(h => h.position === pos)
            const isActive = pos === activePosition
            return (
              <div key={pos} style={{
                background: isActive ? '#16241a' : '#111',
                border: isActive ? `2px solid ${GREEN}` : '1px solid #222',
                borderRadius: 8, padding: '6px 12px', textAlign: 'center',
                minWidth: 70, flex: 1,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? GREEN : TEXT_BRIGHT }}>
                  {pos}
                </div>
                <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 2 }}>
                  {hist ? `${hist.action}${hist.amount ? ' ' + hist.amount.toFixed(1) : ''}` : isActive ? '◀ Acting' : '—'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
        padding: '14px 16px', marginBottom: 12, flexShrink: 0,
      }}>
        <div style={{ fontSize: 12, color: TEXT_DIM, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Your Action — {activePosition}
          {userChoice && <span style={{ marginLeft: 8, fontSize: 10, color: GREEN, textTransform: 'none' }}>✓ Action selected</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { action: 'check', label: 'CHECK', bg: '#555' },
            { action: 'bet:0.33', label: 'BET 33%', bg: '#E65100', amount: Math.round(potSize * 0.33) },
            { action: 'bet:0.5', label: 'BET 50%', bg: '#E65100', amount: Math.round(potSize * 0.5) },
            { action: 'bet:0.75', label: 'BET 75%', bg: '#E65100', amount: Math.round(potSize * 0.75) },
            { action: 'bet:1.25', label: 'BET 125%', bg: '#E65100', amount: Math.round(potSize * 1.25) },
            { action: 'fold', label: 'FOLD', bg: GRAY },
            { action: 'call', label: 'CALL', bg: BLUE, amount: Math.round(potSize * 0.5) },
            { action: 'raise:0.5', label: 'RAISE 50%', bg: RED_BRIGHT, amount: Math.round(potSize * 0.5) },
            { action: 'raise:1.0', label: 'RAISE 100%', bg: RED_BRIGHT, amount: Math.round(potSize) },
            { action: 'all_in', label: `ALL IN ${stackDepth.toFixed(1)}`, bg: RED_DARK, amount: stackDepth },
          ].map(btn => {
            const isSelected = userChoice === btn.action
            const isDisabled = loading || (userChoice !== null && !isSelected)
            // Find GTO frequency for this action
            const gtoAction = strategy?.actions?.find(a => getActionKey(a.action) === getActionKey(btn.action))
            const gtoFreq = gtoAction?.frequency ?? null
            const gtoEv = gtoAction?.ev ?? null
            // Determine if this action matches the top GTO recommendation
            const topGtoAction = bestActions[0]
            const isGtoRecommended = topGtoAction && getActionKey(btn.action) === getActionKey(topGtoAction.action)
            return (
              <div key={btn.action} style={{ position: 'relative' }}>
                <button onClick={() => !isDisabled && handleAction(btn.action)}
                  aria-label={`${btn.label}${isSelected ? ', selected' : ''}${isGtoRecommended ? ', GTO recommended' : ''}`}
                  aria-pressed={isSelected}
                  style={{
                    background: isSelected ? btn.bg : '#1a1a1a',
                    border: isSelected
                      ? `2px solid ${GREEN}`
                      : isGtoRecommended
                        ? `2px solid ${GREEN}88`
                        : `1px solid #333`,
                    color: isSelected ? '#fff' : btn.bg,
                    borderRadius: 8, padding: '10px 14px', cursor: isDisabled ? 'default' : 'pointer',
                    fontSize: 12, fontWeight: 600, transition: 'all .1s',
                    textAlign: 'center', minWidth: 80, minHeight: 52,
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                    opacity: isDisabled ? 0.5 : 1,
                    position: 'relative',
                    boxShadow: isSelected ? `0 0 12px ${GREEN}66` : 'none',
                  }}>
                  {/* GTO frequency chip */}
                  {gtoFreq !== null && (() => {
                    // Color by frequency threshold: green >20%, yellow 5-20%, gray <5%
                    const chipColor = gtoFreq > 0.2 ? GREEN : gtoFreq >= 0.05 ? YELLOW : '#444'
                    return (
                      <div style={{
                        position: 'absolute', top: -8, right: -6,
                        background: chipColor,
                        color: chipColor === YELLOW ? '#000' : '#fff',
                        fontSize: 9, fontWeight: 700, padding: '1px 5px',
                        borderRadius: 8, lineHeight: 1.3,
                        boxShadow: '0 1px 3px rgba(0,0,0,.5)',
                      }}>
                        {(gtoFreq * 100).toFixed(0)}%
                      </div>
                    )
                  })()}
                  {/* GTO-recommended checkmark badge */}
                  {isGtoRecommended && !isSelected && (
                    <div style={{
                      position: 'absolute', top: -8, left: -6,
                      background: GREEN, color: '#000',
                      fontSize: 9, fontWeight: 700, padding: '1px 5px',
                      borderRadius: 8, lineHeight: 1.3,
                      boxShadow: '0 1px 3px rgba(0,0,0,.5)',
                      display: 'flex', alignItems: 'center', gap: 2,
                    }}>
                      ✓ GTO
                    </div>
                  )}
                  {isSelected && isGtoRecommended && (
                    <div style={{
                      position: 'absolute', top: -8, left: -6,
                      background: GREEN, color: '#000',
                      fontSize: 9, fontWeight: 700, padding: '1px 5px',
                      borderRadius: 8, lineHeight: 1.3,
                      boxShadow: '0 1px 3px rgba(0,0,0,.5)',
                      display: 'flex', alignItems: 'center', gap: 2,
                    }}>
                      ✓ BEST
                    </div>
                  )}
                  <div>{btn.label}</div>
                  {btn.amount != null && (
                    <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>
                      {btn.amount.toFixed(1)} ({potSize > 0 ? ((btn.amount / potSize) * 100).toFixed(0) : '0'}%)
                    </div>
                  )}
                  {/* EV label on hover / when selected */}
                  {isSelected && gtoEv !== null && (
                    <div style={{ fontSize: 9, fontWeight: 400, opacity: 0.6, marginTop: 1 }}>
                      EV: {gtoEv.toFixed(2)}
                    </div>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Feedback text below action row — shown after user picks */}
        {userChoice && strategy && !loading && (() => {
          const topGto = bestActions[0]
          const userActionData = strategy.actions.find(a => getActionKey(a.action) === getActionKey(userChoice))
          const userEv = userActionData?.ev ?? null
          const gtoEv = topGto?.ev ?? null
          const evDiff = (userEv !== null && gtoEv !== null) ? (userEv - gtoEv) : null
          const userMatchesGto = topGto && getActionKey(userChoice) === getActionKey(topGto.action)
          return (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 8,
              background: userMatchesGto ? '#0a2e1a' : '#2a0a0a',
              border: `1px solid ${userMatchesGto ? '#00C85344' : '#E5393544'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 15, fontWeight: 700,
                  color: userMatchesGto ? GREEN : RED_BRIGHT,
                }}>
                  {userMatchesGto ? '✓ Correct!' : '✗ Suboptimal'}
                </span>
                {!userMatchesGto && evDiff !== null && (
                  <span style={{ fontSize: 12, color: '#aaa' }}>
                    EV gap: {Math.abs(evDiff).toFixed(2)} bb
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Try Again button */}
                <button onClick={() => {
                  setUserChoice(null)
                  const updated = [...streetActions]
                  updated[streetIndex] = null
                  setStreetActions(updated)
                }}
                  aria-label="Try a different action"
                  style={{
                    background: '#2a2a2a', border: '1px solid #444', borderRadius: 6,
                    color: '#ccc', padding: '6px 14px', fontSize: 11, fontWeight: 600,
                    cursor: 'pointer',
                  }}>
                  ↻ Try Again
                </button>

                {/* Continue to Next Street button */}
                {!isLastStreet && (
                  <button onClick={advanceToNextStreet}
                    aria-label={`Advance to ${streetIndex === 0 ? 'turn' : 'river'}`}
                    style={{
                      background: '#1a3a2b', border: `1px solid ${GREEN}66`, borderRadius: 6,
                      color: GREEN, padding: '6px 14px', fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                    <span>▶</span>
                    Advance to {streetIndex === 0 ? 'Turn' : 'River'}
                  </button>
                )}
              </div>
            </div>
          )
        })()}

        {/* Hand complete message on last street */}
        {userChoice && isLastStreet && strategy && !loading && (
          <div style={{ marginTop: 10, textAlign: 'center', color: GREEN, fontSize: 12, fontWeight: 600 }}>
            ✓ Hand complete — all streets played on river
          </div>
        )}
      </div>

      {/* GTO Comparison — always show when user has picked an action */}
      {(strategy || loading || error) && (
        <div style={{
          background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
          padding: '14px 16px', flex: 1, overflow: 'auto', minHeight: 0,
        }}>
          <div style={{ fontSize: 12, color: TEXT_DIM, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            GTO Strategy Breakdown — {currentStreet}
            {strategy && (
              <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 400, color: GREEN, textTransform: 'none' }}>
                ({strategy.source === 'cached' ? 'cached' : 'live-solver'})
              </span>
            )}
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: 20, color: TEXT_DIM }}>
              <span style={{ color: GREEN }}>●</span> Solving with MCCFR... (street: {currentStreet})
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: 20, color: RED }}>
              Error: {error}
            </div>
          )}

          {strategy && !loading && (
            <>
              {/* User's pick vs GTO recommendation comparison */}
              {userChoice && (() => {
                const userActionData = strategy.actions.find(a => getActionKey(a.action) === getActionKey(userChoice))
                const topGto = bestActions[0]
                const userEv = userActionData?.ev ?? null
                const gtoEv = topGto?.ev ?? null
                const evDiff = (userEv !== null && gtoEv !== null) ? (userEv - gtoEv) : null
                const userMatchesGto = topGto && getActionKey(userChoice) === getActionKey(topGto.action)
                const userActionLabel = formatActionButton(userChoice, potSize, stackDepth).label
                const gtoActionLabel = topGto ? formatActionButton(topGto.action, potSize, stackDepth).label : 'N/A'

                return (
                  <div style={{
                    marginBottom: 14, padding: '12px 14px', borderRadius: 8,
                    background: userMatchesGto ? '#0a2e1a' : '#2a0a0a',
                    border: `1px solid ${userMatchesGto ? '#00C85344' : '#E5393544'}`,
                  }}>
                    {/* Verdict row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{
                        fontSize: 15, fontWeight: 700,
                        color: userMatchesGto ? GREEN : RED_BRIGHT,
                      }}>
                        {userMatchesGto ? '✓ Correct' : '✗ Suboptimal'}
                      </span>
                      <span style={{ fontSize: 11, color: '#888' }}>
                        — Your pick: <strong style={{ color: '#ccc' }}>{userActionLabel}</strong>
                        {' · '}GTO: <strong style={{ color: GREEN }}>{gtoActionLabel}</strong>
                        {topGto && <span style={{ color: '#888' }}> ({(topGto.frequency * 100).toFixed(0)}%)</span>}
                      </span>
                    </div>

                    {/* EV comparison row */}
                    {evDiff !== null && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '6px 10px', borderRadius: 6,
                        background: '#151515', marginBottom: 10,
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', marginBottom: 2 }}>Your EV</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: userEv !== null && userEv >= 0 ? GREEN : RED_BRIGHT }}>
                            {userEv?.toFixed(2) ?? '—'}
                          </div>
                        </div>
                        <div style={{
                          fontSize: 14, fontWeight: 700,
                          color: evDiff >= 0 ? GREEN : RED_BRIGHT,
                          padding: '2px 10px', borderRadius: 4,
                          background: evDiff >= 0 ? '#0a2e1a' : '#2a0a0a',
                        }}>
                          {evDiff >= 0 ? '+' : ''}{evDiff.toFixed(2)}
                        </div>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', marginBottom: 2 }}>GTO EV</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: GREEN }}>
                            {gtoEv?.toFixed(2) ?? '—'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Frequency breakdown bars */}
                    <div style={{ fontSize: 10, color: '#888', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      GTO Frequency Distribution
                    </div>
                    {bestActions.map((a) => {
                      const isUserPickAction = userChoice === a.action
                      const isTopGto = a === bestActions[0]
                      return (
                        <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 600, width: 70,
                            color: isUserPickAction ? (userMatchesGto ? GREEN : RED_BRIGHT) : (isTopGto ? GREEN : '#888'),
                          }}>
                            {formatActionButton(a.action, potSize, stackDepth).label}
                            {isUserPickAction && <span style={{ marginLeft: 3, fontSize: 9 }}>◀ you</span>}
                            {isTopGto && !isUserPickAction && <span style={{ marginLeft: 3, fontSize: 9, color: GREEN }}>★</span>}
                          </span>
                          <div style={{ flex: 1, height: 8, background: '#2a2a2a', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${a.frequency * 100}%`,
                              background: isTopGto ? GREEN : isUserPickAction ? RED_BRIGHT : '#555',
                              borderRadius: 4, transition: 'width 0.3s ease',
                            }} />
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 600, width: 36, textAlign: 'right',
                            color: isTopGto ? GREEN : '#aaa',
                          }}>
                            {(a.frequency * 100).toFixed(0)}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Compact action cards */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {bestActions.map((a) => {
                  const btnInfo = formatActionButton(a.action, potSize, stackDepth)
                  const isUserPick = userChoice && (
                    userChoice === a.action ||
                    (userChoice.startsWith(a.action.split(/[:\\d+]/)[0]))
                  )
                  return (
                    <div key={a.key} style={{
                      borderRadius: 8, padding: '10px 12px', flex: '1 0 120px',
                      background: isUserPick ? (actionColor(a.action) + '33') : '#151515',
                      border: isUserPick ? `1px solid ${actionColor(a.action)}` : '1px solid #2a2a2a',
                      opacity: userChoice && !isUserPick ? 0.6 : 1,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_BRIGHT }}>
                        {btnInfo.label}
                        {isUserPick && <span style={{ color: GREEN, fontSize: 9, marginLeft: 4 }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 750, color: '#fff', marginTop: 2 }}>
                        {(a.frequency * 100).toFixed(0)}%
                      </div>
                      <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 1 }}>
                        EV: {a.ev.toFixed(2)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {strategy && !loading && strategy.actions.length === 0 && (
            <div style={{ textAlign: 'center', padding: 16, color: TEXT_DIM, fontSize: 13 }}>
              No actions returned from solver. Try a different board or position.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
