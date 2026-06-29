'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import PostflopTraining from '@/components/study/PostflopTraining'

// ── Independent solver health polling ──
function useSolverHealth(pollMs = 10000): 'online' | 'offline' {
  const [status, setStatus] = useState<'online' | 'offline'>('online')
  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const res = await fetch(`${API_BASE}/solver/health`, { cache: 'no-store' })
        if (!cancelled) setStatus(res.ok ? 'online' : 'offline')
      } catch {
        if (!cancelled) setStatus('offline')
      }
    }
    check()
    const id = setInterval(check, pollMs)
    return () => { cancelled = true; clearInterval(id) }
  }, [pollMs])
  return status
}

import {
  RED, RED_BRIGHT, RED_DARK, BLUE, GREEN, GRAY,
  MATRIX_HANDS, ACTION_COLORS, ACTION_LABELS,
  API_BASE, ALL_POSITIONS, POSITION_ACTIONS, POSTFLOP_ACTIONS,
  TAB_ORDER, generateRandomCards, parseBoardString,
  isHandFiltered, isHandBlocked, getGtoActionBase,
  type HandData, type TreeAction, type BoardCard,
  type BoardStreet, type TreeNode, type ActiveTab,
  type RightTopTab, type RightSubTab, type ActionDef,
} from './constants'

import { StudyAggregateStrip, StudyActionPrompt, StudyHotkeyHelp, StudyHotkeyToast } from './components/StudyTopBar'
import { StudyPlayerTiles } from './components/StudyPlayerTiles'
import { StudyMatrixGrid } from './components/StudyMatrixGrid'
import { StudyDetailsPanel } from './components/StudyDetailsPanel'
import { BoardCardSelector } from './components/BoardCardSelector'

const totalCombos = 1326

export default function StudyPage() {
  const [mode, setMode] = useState<'preflop' | 'postflop'>('preflop')
  const [activePosition, setActivePosition] = useState('UTG')
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [feedbackState, setFeedbackState] = useState<{ isCorrect: boolean; selectedAction: string; gtoAction: string; evDiff: number } | null>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [rangeData, setRangeData] = useState<Map<string, HandData>>(new Map())
  const [isSolverMode, setIsSolverMode] = useState(false)
  const [stackDepth, setStackDepth] = useState(100)
  const [boardCards, setBoardCards] = useState<BoardCard[]>([])
  const [boardStreet, setBoardStreet] = useState<BoardStreet>('preflop')
  const [availableDepths, setAvailableDepths] = useState<{value: number; label: string}[]>([
    { value: 50, label: '50bb' },
    { value: 100, label: '100bb' },
    { value: 150, label: '150bb' },
    { value: 200, label: '200bb' },
  ])
  const [activeTab, setActiveTab] = useState<ActiveTab>('strategy')
  const [hotkeyToast, setHotkeyToast] = useState<string | null>(null)
  const [showHotkeys, setShowHotkeys] = useState(false)
  const [actionFilter, setActionFilter] = useState<string | null>(null)
  const [gameType, setGameType] = useState('Cash')
  const [rightTopTab, setRightTopTab] = useState<RightTopTab>('overview')
  const [rightSubTab, setRightSubTab] = useState<RightSubTab>('actions')
  const [handFilters, setHandFilters] = useState<Record<string, boolean>>({
    pairs: true, suited: true, offsuit: true, broadway: true, aceHigh: true,
  })
  const [blockerRanks, setBlockerRanks] = useState<string[]>([])
  const [allPositionData, setAllPositionData] = useState<Map<string, Map<string, HandData>>>(new Map())
  const [allPositionLoading, setAllPositionLoading] = useState(false)
  const [treePath, setTreePath] = useState<TreeAction[]>([])
  const [treeNode, setTreeNode] = useState<TreeNode>(null)
  const solverStatus = useSolverHealth()

  // ── Postflop state ──
  const [pfBoard, setPfBoard] = useState<BoardCard[]>([])
  const [pfPot, setPfPot] = useState(5.5)
  const [pfStreet, setPfStreet] = useState<'flop' | 'turn' | 'river'>('flop')
  const [pfActivePosition, setPfActivePosition] = useState('CO')
  const [pfBoardSelectorOpen, setPfBoardSelectorOpen] = useState(false)
  const [pfAction, setPfAction] = useState<string | null>(null)

  // ── Derived data ──
  const positions = useMemo(() => [
    { id: 'UTG', label: 'UTG', stack: stackDepth },
    { id: 'HJ', label: 'HJ', stack: stackDepth },
    { id: 'CO', label: 'CO', stack: stackDepth },
    { id: 'BTN', label: 'BTN', stack: stackDepth },
    { id: 'SB', label: 'SB', stack: Math.round(stackDepth - 0.5) },
    { id: 'BB', label: 'BB', stack: stackDepth - 1 },
  ], [stackDepth])

  const topBarDepths = useMemo(() => [
    { value: 30, label: '30bb' },
    { value: 50, label: '50bb' },
    { value: 75, label: '75bb' },
    { value: 100, label: '100bb' },
    { value: 150, label: '150bb' },
    { value: 200, label: '200bb' },
  ], [])

  // ── Fetch available stack depths ──
  useEffect(() => {
    async function fetchDepths() {
      try {
        const res = await fetch(`${API_BASE}/strategy-lookup/stack-depths`)
        if (res.ok) {
          const data = await res.json()
          if (data.stack_depths?.length) {
            setAvailableDepths(data.stack_depths)
            const values = data.stack_depths.map((d: any) => d.value)
            if (!values.includes(stackDepth)) {
              const closest = values.reduce((a: number, b: number) =>
                Math.abs(b - stackDepth) < Math.abs(a - stackDepth) ? b : a
              )
              setStackDepth(closest)
            }
          }
        }
      } catch { /* keep defaults */ }
    }
    fetchDepths()
  }, [])

  // ── Fetch solver data on position/depth/treePath change ──
  useEffect(() => {
    async function fetchRange() {
      try {
        const body: any = {
          position: activePosition,
          stack_depth: positions.find(p => p.id === activePosition)?.stack || stackDepth,
          game_type: 'nlh',
        }
        if (treePath.length > 0) {
          body.tree_path = treePath.map(t => ({ position: t.position, action: t.action, size: t.size || null }))
        }
        const res = await fetch(`${API_BASE}/solver/preflop-range`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const map = new Map<string, HandData>()
        for (const h of data.hands || []) map.set(h.hand, h)
        setRangeData(map)
        if (data.tree_node) {
          setTreeNode(data.tree_node)
          if (data.tree_node.acting_position && data.tree_node.acting_position !== activePosition) {
            setActivePosition(data.tree_node.acting_position)
          }
        }
        setIsSolverMode(true)
        const firstActionable = data.hands?.find((h: any) => h.action !== 'fold')
        if (firstActionable) setSelectedCell(firstActionable.hand)
        else setSelectedCell(null)
      } catch {
        setIsSolverMode(false)
      }
    }
    fetchRange()
  }, [activePosition, stackDepth, treePath])

  // Reset tree on depth change
  useEffect(() => { setTreePath([]); setTreeNode(null) }, [stackDepth])

  // ── Fetch all 6 positions in parallel ──
  useEffect(() => {
    if (mode !== 'preflop') return
    let cancelled = false
    async function fetchAll() {
      setAllPositionLoading(true)
      try {
        const results = await Promise.all(
          ALL_POSITIONS.map(async (pos) => {
            const stackForPos = pos === 'SB' ? Math.round(stackDepth - 0.5)
              : pos === 'BB' ? stackDepth - 1 : stackDepth
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
      } catch { /* silent */ }
      finally { if (!cancelled) setAllPositionLoading(false) }
    }
    fetchAll()
    return () => { cancelled = true }
  }, [stackDepth, mode])

  // ── Action click ──
  function handleActionClick(actionBase: string) {
    const actions = treeNode?.available_actions || POSITION_ACTIONS[activePosition] || []
    const matchingAct = actions.find(a => a.actionBase === actionBase)
    if (!matchingAct) {
      const order = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
      const idx = order.indexOf(activePosition)
      if (idx >= 0 && idx < order.length - 1) setActivePosition(order[idx + 1])
      setActionFilter(null)
      return
    }
    setTreePath(prev => [...prev, {
      position: activePosition,
      action: matchingAct.actionBase,
      label: matchingAct.label,
      size: (matchingAct as any).size,
    }])
    setActionFilter(null)
  }

  // ── GTO feedback action handler ──
  function handleActionWithFeedback(actionBase: string) {
    if (selectedCell && rangeData.size > 0) {
      const handData = rangeData.get(selectedCell)
      if (handData) {
        const gtoBase = getGtoActionBase(handData.action)
        const clickedBase = (actionBase.startsWith('raise') || actionBase === 'all_in') ? 'raise' : actionBase
        const isCorrect = clickedBase === gtoBase
        const evDiff = isCorrect ? 0 : -(handData.equity * 3)
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
        setFeedbackState({ isCorrect, selectedAction: actionBase, gtoAction: handData.action, evDiff })
        feedbackTimerRef.current = setTimeout(() => setFeedbackState(null), 2000)
      }
    }
    handleActionClick(actionBase)
  }

  // ── Postflop action handler ──
  function handlePfActionClick(actionBase: string) {
    // For postflop, action clicks go to PostflopTraining via a callback
    // We'll mount PostflopTraining with the action as its selected user choice
    if (actionBase === 'fold' || actionBase === 'check' || actionBase === 'call') {
      setPfAction(actionBase)
    } else if (actionBase === 'bet') {
      setPfAction('bet:0.5')
    } else if (actionBase === 'raise') {
      setPfAction('raise:0.5')
    } else if (actionBase === 'all_in') {
      setPfAction('all_in')
    }
  }

  function handlePfSelectPosition(pos: string) {
    setPfActivePosition(pos)
  }

  // ── Computed values ──
  const positionAggregates = useMemo(() => {
    const agg: Record<string, { fold: number; call: number; raise: number; total: number }> = {}
    for (const pos of ALL_POSITIONS) {
      const data = allPositionData.get(pos)
      if (!data || data.size === 0) {
        agg[pos] = { fold: 0, call: 0, raise: 0, total: 0 }; continue
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

  const oopEV = useMemo((): number | null => {
    if (!isSolverMode || rangeData.size === 0) return null
    let weightedSum = 0, weightSum = 0
    rangeData.forEach((h) => { weightedSum += h.equity * h.frequency; weightSum += h.frequency })
    if (weightSum === 0) return null
    return ((weightedSum / weightSum) - 0.5) * 3
  }, [rangeData, isSolverMode])

  const selectedHandData = useMemo(() => {
    if (!selectedCell) return null
    return rangeData.get(selectedCell) || null
  }, [selectedCell, rangeData])

  // ── Cell visual helpers ──
  function getCellColor(hand: string): string {
    if (isSolverMode) {
      const data = rangeData.get(hand)
      if (!data || data.action === 'fold') return GRAY
      return ACTION_COLORS[data.action.startsWith('raise') ? 'raise' : data.action] || RED
    }
    const redSet = new Set([
      'AA','AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
      'AKo','KK','KQs','KJs','KTs','K9s','K8s','K7s','AQo','KQo','QQ','QJs','QTs',
      'AJo','KJo','JJ','JTs','ATo','TT','99','98s','88','87s',
    ])
    return redSet.has(hand) ? RED : GRAY
  }

  function getCellOpacity(hand: string): number {
    if (isHandFiltered(hand, handFilters)) return 0.08
    if (isHandBlocked(hand, blockerRanks)) return 0.15
    if (actionFilter) {
      const data = rangeData.get(hand)
      const handAction = data ? (data.action.startsWith('raise') ? 'raise' : data.action) : null
      if (handAction !== actionFilter) return 0.08
    }
    if (!isSolverMode) return 1.0
    const data = rangeData.get(hand)
    if (!data) return 0.3
    return data.action === 'fold' ? 0.3 : 0.5 + data.frequency * 0.5
  }

  // ── URL param parsing ──
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const pos = params.get('position')
    const stack = params.get('stack')
    const board = params.get('board')
    const street = params.get('street')
    if (pos && ALL_POSITIONS.includes(pos as any)) setActivePosition(pos)
    if (stack) {
      const s = parseFloat(stack)
      if (!isNaN(s) && s >= 10 && s <= 500) setStackDepth(Math.round(s))
    }
    if (board) {
      const parsed = parseBoardString(board)
      if (parsed.length >= 3) {
        setBoardCards(parsed)
        setMode('postflop')
        setBoardStreet(street && ['preflop','flop','turn','river'].includes(street) ? street as BoardStreet : 'flop')
      }
    }
  }, [])

  // ── Board handlers ──
  const handleGenerateFlop = useCallback(() => {
    setBoardCards(generateRandomCards(3, []))
    setBoardStreet('flop')
  }, [])

  const handleAdvanceStreet = useCallback(() => {
    if (boardStreet === 'river') return
    const nextCard = generateRandomCards(1, boardCards.map(c => c.rank + c.suit))
    if (nextCard.length === 0) return
    setBoardCards(prev => [...prev, nextCard[0]])
    setBoardStreet(prev => prev === 'flop' ? 'turn' : 'river')
  }, [boardCards, boardStreet])

  const handleResetBoard = useCallback(() => {
    setBoardCards([])
    setBoardStreet('preflop')
  }, [])

  // ── Hotkey handler ──
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
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const key = e.key.toLowerCase()
      if (key === 'tab' && mode === 'preflop') {
        e.preventDefault()
        setActiveTab(prev => TAB_ORDER[(TAB_ORDER.indexOf(prev) + 1) % TAB_ORDER.length])
        return
      }
      if (key === 'f' && mode === 'preflop') {
        e.preventDefault()
        if (boardStreet === 'preflop') handleGenerateFlop()
        else if (boardStreet !== 'river') handleAdvanceStreet()
        return
      }
      if (key === 'r' && mode === 'preflop' && boardCards.length > 0) {
        e.preventDefault(); handleResetBoard(); return
      }
      if (key === 'escape') { e.preventDefault(); if (selectedCell) setSelectedCell(null); return }
      if (key === '?' || key === '/') { e.preventDefault(); setShowHotkeys(prev => !prev); return }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key) && selectedCell) {
        e.preventDefault(); navigateMatrix(key); return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, boardStreet, boardCards.length, selectedCell, selectedHandData, activeTab, activePosition, handleGenerateFlop, handleAdvanceStreet, handleResetBoard])

  // Close hotkey popup on outside click
  useEffect(() => {
    if (!showHotkeys) return
    function handleClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-hotkeys-popup]')) setShowHotkeys(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [showHotkeys])

  // ── Hand filter handler ──
  const handleHandFilterChange = useCallback((key: string, value: boolean) => {
    setHandFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  // ── Position selection handler for PlayerTiles / AggregateStrip ──
  const handleSelectPosition = useCallback((pos: string) => {
    setActivePosition(pos)
    setActionFilter(null)
    setTreePath([])
    setTreeNode(null)
  }, [])

  // ── Render ──
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0E0E0E', overflow: 'hidden' }}>
      <style>{`
        @media (max-width: 768px) {
          .study-main-grid { grid-template-columns: 1fr !important; gap: 4px !important; padding: 0 4px !important; }
          .study-matrix-grid { grid-template-columns: repeat(13, 1fr) !important; }
          .study-matrix-wrap { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
          .study-matrix-wrap::-webkit-scrollbar { height: 4px !important; }
          .study-matrix-wrap::-webkit-scrollbar-thumb { background: #333 !important; border-radius: 2px !important; }
          .study-matrix-cell { font-size: 12px !important; letter-spacing: 0 !important; }
          .study-spot-card-bar { gap: 3px !important; padding: 3px 4px !important; min-height: 44px !important; }
          .study-spot-card-bar .hspotcrd_title { font-size: 10px !important; }
          .study-action-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 6px !important; }
          .study-action-btn { padding: 14px 6px !important; min-height: 48px !important; }
          .study-stack-selector { gap: 3px !important; padding: 3px 4px !important; flex-wrap: wrap !important; }
          .study-details-panel { min-height: 300px !important; overflow-y: auto !important; -webkit-overflow-scrolling: touch !important; }
          .study-details-panel-table { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
          .study-top-bar { flex-wrap: wrap !important; gap: 6px !important; padding: 6px 8px !important; }
          .study-mode-toggle { flex-wrap: wrap !important; gap: 4px !important; }
          .study-stats-bar { flex-wrap: wrap !important; gap: 4px !important; padding: 3px 8px !important; }
          .study-panel-header { flex-wrap: wrap !important; gap: 4px !important; }
          .study-sub-tab-bar { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
          .study-street-nav { flex-wrap: wrap !important; gap: 3px !important; }
        }
        @media (max-width: 480px) {
          .study-matrix-cell { font-size: 11px !important; letter-spacing: 0 !important; }
          .study-matrix-cell-freq { display: block !important; font-size: 10px !important; }
          .study-spot-card-bar { min-height: 38px !important; }
          .study-spot-card-bar .hspotcrd_title { font-size: 9px !important; }
        }
        @media (max-width: 375px) {
          .study-top-bar { gap: 4px !important; padding: 4px 6px !important; }
          .study-top-bar > * { font-size: 10px !important; }
          .study-action-btn { padding: 10px 4px !important; min-height: 44px !important; }
          .study-details-panel { min-height: 250px !important; }
        }
        *:focus-visible { outline: 2px solid #7CFC7C !important; outline-offset: 1px !important; }
        [role="gridcell"]:focus-visible { outline: 2px solid #fff !important; outline-offset: 1px !important; z-index: 10 !important; }
      `}</style>

      <StudyHotkeyToast message={hotkeyToast} />

      {/* ── Top Bar ── */}
      <div className="study-top-bar" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 12px', background: '#1A1A1A',
        borderBottom: '1px solid #333', flexShrink: 0,
      }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <select value={gameType} onChange={(e) => setGameType(e.target.value)}
            aria-label="Select game type"
            style={{
              background: '#0E0E0E', color: '#e0e0e0',
              border: '1px solid #333', borderRadius: 4,
              padding: '2px 20px 2px 8px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
              lineHeight: 1.6, minWidth: 66,
            }}>
            <option value="Cash">Cash</option>
            <option value="MTT">MTT</option>
          </select>
          <span style={{
            position: 'absolute', right: 6, top: '50%', marginTop: -5,
            color: '#666', fontSize: 8, pointerEvents: 'none',
          }}>▾</span>
        </div>
        <div style={{ width: 1, height: 16, background: '#333', flexShrink: 0 }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <select value={stackDepth} onChange={(e) => setStackDepth(Number(e.target.value))}
            aria-label="Select stack depth"
            style={{
              background: '#0E0E0E', color: '#e0e0e0',
              border: '1px solid #333', borderRadius: 4,
              padding: '2px 20px 2px 8px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
              lineHeight: 1.6, minWidth: 66,
            }}>
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
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          color: '#888', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
        }}>
          <span style={{ color: '#aaa', fontWeight: 600 }}>2,000+</span>
          <span>spots</span>
        </div>
        <div style={{ flex: 1 }} />
      </div>

      {/* ── Mode Toggle / Hotkey Help ── */}
      <div className="study-mode-toggle" style={{
        display: 'flex', gap: 8, padding: '6px 12px',
        borderBottom: '1px solid #141414', background: '#0E0E0E', flexShrink: 0,
      }}>
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
        <StudyHotkeyHelp showHotkeys={showHotkeys} onToggle={() => setShowHotkeys(prev => !prev)} />
      </div>

      {/* ── Action Prompt ── */}
      <StudyActionPrompt
        treePath={treePath}
        treeNode={treeNode}
        activePosition={mode === 'preflop' ? activePosition : pfActivePosition}
        selectedCell={selectedCell}
      />

      {/* ── Player Tiles (shared between preflop and postflop) ── */}
      {mode === 'preflop' ? (
        <StudyPlayerTiles
          positions={positions}
          activePosition={activePosition}
          treePath={treePath}
          treeNode={treeNode}
          solverStatus={solverStatus}
          actionFilter={actionFilter}
          allPositionData={allPositionData}
          onSelectPosition={handleSelectPosition}
          onActionClick={handleActionClick}
          onActionFilter={setActionFilter}
          onActionFeedback={handleActionWithFeedback}
        />
      ) : (
        <StudyPlayerTiles
          positions={positions}
          activePosition={pfActivePosition}
          treePath={[]}
          treeNode={null}
          solverStatus={solverStatus}
          actionFilter={null}
          allPositionData={allPositionData}
          onSelectPosition={handlePfSelectPosition}
          onActionClick={handlePfActionClick}
          onActionFilter={() => {}}
          customActions={POSTFLOP_ACTIONS}
        />
      )}

      {mode === 'preflop' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Stack selector */}
          <div className="study-stack-selector" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', background: '#0E0E0E',
            borderBottom: '1px solid #141414', flexShrink: 0,
          }}>
            <span style={{ color: '#999', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>Stack:</span>
            {availableDepths.map(d => (
              <button key={d.value} onClick={() => setStackDepth(d.value)}
                aria-pressed={stackDepth === d.value}
                aria-label={`${d.value}bb stack depth`}
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

          {/* Aggregate summary strip (preflop only) */}
          <StudyAggregateStrip
            positionAggregates={positionAggregates}
            activePosition={activePosition}
            allPositionLoading={allPositionLoading}
            onSelectPosition={handleSelectPosition}
          />

          {/* Main grid: Matrix + Details */}
          <div className="study-main-grid" style={{
            flex: 1, display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 1fr)',
            gap: 8, padding: '0 12px 8px', minHeight: 0,
          }}>
            <StudyMatrixGrid
              activeTab={activeTab}
              onTabChange={setActiveTab}
              rangeData={rangeData}
              isSolverMode={isSolverMode}
              selectedCell={selectedCell}
              onCellSelect={setSelectedCell}
              getCellColor={getCellColor}
              getCellOpacity={getCellOpacity}
              actionFilter={actionFilter}
            />
            <StudyDetailsPanel
              rightTopTab={rightTopTab}
              onRightTopTabChange={setRightTopTab}
              rightSubTab={rightSubTab}
              onRightSubTabChange={(tab: RightSubTab) => setRightSubTab(tab)}
              positions={positions}
              activePosition={activePosition}
              boardCards={boardCards}
              boardStreet={boardStreet}
              onGenerateFlop={handleGenerateFlop}
              onAdvanceStreet={handleAdvanceStreet}
              onResetBoard={handleResetBoard}
              isSolverMode={isSolverMode}
              rangeData={rangeData}
              actionSummary={actionSummary}
              totalCombos={totalCombos}
              selectedCell={selectedCell}
              selectedHandData={selectedHandData}
              handFilters={handFilters}
              onHandFilterChange={handleHandFilterChange}
              blockerRanks={blockerRanks}
              onBlockerRanksChange={setBlockerRanks}
              oopEV={oopEV}
              allPositionData={allPositionData}
              onCellSelect={setSelectedCell}
            />
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Board card area */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 12px', borderBottom: '1px solid #141414',
            background: '#0E0E0E', flexShrink: 0,
          }}>
            <span style={{ color: '#999', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>Board:</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {pfBoard.length === 0 ? (
                <span style={{ color: '#555', fontSize: 11, fontStyle: 'italic' }}>Select cards to begin</span>
              ) : (
                pfBoard.map((c, i) => (
                  <div key={i} style={{
                    width: 28, height: 36, borderRadius: 4,
                    background: c.suit === 'h' || c.suit === 'd' ? '#c1272d'
                      : c.suit === 's' ? '#3a3a3a'
                      : c.suit === 'c' ? '#15803d' : '#1e40af',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 900, fontSize: 13,
                    boxShadow: '0 1px 3px rgba(0,0,0,.5)',
                  }}>
                    {c.rank}
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setPfBoardSelectorOpen(true)}
              aria-label="Select board cards"
              style={{
                background: '#16241a', border: `1px solid ${GREEN}44`,
                color: GREEN, padding: '3px 10px', borderRadius: 6,
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>
              {pfBoard.length === 0 ? 'Select Cards' : 'Change'}
            </button>
          </div>

          {/* Postflop strategy area */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <PostflopTraining
              externalBoard={pfBoard}
              externalPosition={pfActivePosition}
              externalPot={pfPot}
              externalAction={pfAction}
              onActionConsumed={() => setPfAction(null)}
            />
          </div>
        </div>
      )}

      {/* ── Board Card Selector Popup ── */}
      <BoardCardSelector
        open={pfBoardSelectorOpen}
        onClose={() => setPfBoardSelectorOpen(false)}
        onConfirm={(cards) => {
          setPfBoard(cards)
          setPfBoard(cards.slice(0, 3))
          setPfStreet('flop')
          setPfPot(5.5)
          setPfActivePosition('CO')
          setPfAction(null)
        }}
        currentBoard={pfBoard}
      />

      {/* ── GTO Feedback Overlay ── */}
      {feedbackState && (
        <div role="status" aria-live="polite" style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 1000, background: 'rgba(0,0,0,0.9)', borderRadius: 16,
          padding: '20px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          border: `2px solid ${feedbackState.isCorrect ? '#00C853' : '#E53935'}`,
          boxShadow: `0 0 24px ${feedbackState.isCorrect ? '#00C85344' : '#E5393544'}`,
        }}>
          <span style={{ fontSize: 48, lineHeight: 1, color: feedbackState.isCorrect ? '#00C853' : '#E53935' }}>
            {feedbackState.isCorrect ? '✓' : '✗'}
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
            {feedbackState.isCorrect ? 'GTO Correct' : 'Not optimal'}
          </span>
          <span style={{ fontSize: 12, color: '#aaa' }}>
            {feedbackState.isCorrect
              ? `EV: +${(feedbackState.evDiff).toFixed(1)}bb`
              : `EV cost: ${Math.abs(feedbackState.evDiff).toFixed(1)}bb`}
          </span>
        </div>
      )}
    </div>
  )
}
