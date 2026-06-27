'use client'

import {
  GREEN, RED, RED_DARK, GRAY, RED_BRIGHT, BLUE,
  SUIT_SYM, ALL_POSITIONS, ACTION_COLORS, ACTION_LABELS, MATRIX_HANDS,
  type HandData, type BoardCard, type RightTopTab, type RightSubTab,
  type BoardStreet, type PositionId,
} from '../constants'

// ── Board section for overview tab ──
function BoardSection({
  boardCards,
  boardStreet,
  onGenerateFlop,
  onAdvanceStreet,
  onResetBoard,
}: {
  boardCards: BoardCard[]
  boardStreet: BoardStreet
  onGenerateFlop: () => void
  onAdvanceStreet: () => void
  onResetBoard: () => void
}) {
  return (
    <nav aria-label="Street navigation"
      style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{
        fontSize: 9, color: GREEN, fontWeight: 600, marginRight: 2,
        textTransform: 'uppercase',
      }}>
        {boardStreet === 'preflop' ? 'PREFLOP' : boardStreet.toUpperCase()}
      </span>
      {boardCards.map((card, i) => {
        const isRed = card.suit === 'h' || card.suit === 'd'
        return (
          <div key={i} style={{
            width: 24, height: 34, borderRadius: 4,
            background: '#f5f5f0', border: '1px solid #ccc',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700,
            color: isRed ? '#E53935' : '#111', flexShrink: 0,
          }}>
            <span style={{ lineHeight: 1 }}>{card.rank}</span>
            <span style={{ fontSize: 8, marginTop: -1, lineHeight: 1 }}>
              {SUIT_SYM[card.suit] || card.suit}
            </span>
          </div>
        )
      })}
      {boardStreet === 'preflop' && (
        <>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={`empty-${i}`} style={{
              width: 20, height: 28, borderRadius: 3,
              border: '1px solid #2a2a2a', background: '#141414',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 6, color: '#555',
            }}>?</div>
          ))}
          <button onClick={onGenerateFlop} aria-label="Deal random flop"
            style={{
              padding: '2px 8px', borderRadius: 3, background: '#16241a',
              border: `1px solid ${GREEN}`, color: GREEN,
              fontSize: 9, fontWeight: 600, cursor: 'pointer', lineHeight: 1.4,
            }}>Deal Flop</button>
        </>
      )}
      {boardStreet === 'flop' && (
        <button onClick={onAdvanceStreet} aria-label="Deal turn card"
          style={{
            padding: '2px 8px', borderRadius: 3, background: '#16241a',
            border: `1px solid ${GREEN}`, color: GREEN,
            fontSize: 9, fontWeight: 600, cursor: 'pointer', lineHeight: 1.4,
          }}>Turn ▶</button>
      )}
      {boardStreet === 'turn' && (
        <button onClick={onAdvanceStreet} aria-label="Deal river card"
          style={{
            padding: '2px 8px', borderRadius: 3, background: '#16241a',
            border: `1px solid ${GREEN}`, color: GREEN,
            fontSize: 9, fontWeight: 600, cursor: 'pointer', lineHeight: 1.4,
          }}>River ▶</button>
      )}
      {boardCards.length > 0 && (
        <button onClick={onResetBoard} aria-label="Reset board"
          style={{
            padding: '2px 6px', borderRadius: 3, background: '#1a1a1a',
            border: '1px solid #333', color: '#888',
            fontSize: 9, fontWeight: 600, cursor: 'pointer', lineHeight: 1.4,
          }}>✕</button>
      )}
    </nav>
  )
}

// ── Actions sub-tab ──
function ActionsTab({
  actionSummary,
  totalCombos,
}: {
  actionSummary: Record<string, { count: number; totalFreq: number }>
  totalCombos: number
}) {
  return (
    <div>
      <div style={{
        fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 8,
        textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        GTO Range Breakdown
      </div>
      {Object.entries(actionSummary)
        .sort(([, a], [, b]) => b.totalFreq - a.totalFreq)
        .map(([action, data]) => {
          const pct = (data.totalFreq / totalCombos) * 100
          if (pct < 0.5) return null
          const barPct = Math.min(pct, 100)
          const actionColor = ACTION_COLORS[action] || '#888'
          const comboCount = (data.totalFreq / totalCombos) * totalCombos
          return (
            <div key={action} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: '#ccc', fontWeight: 600 }}>
                  {ACTION_LABELS[action] || action}
                </span>
                <span style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>
                  {pct.toFixed(1)}% ({comboCount.toFixed(1)} combos)
                </span>
              </div>
              <div style={{ height: 10, background: '#2a2a2a', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.max(barPct, 2)}%`,
                  background: actionColor, borderRadius: 5, opacity: 0.85,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          )
        })}
    </div>
  )
}

// ── Hand Details sub-tab ──
function HandDetailsTab({
  selectedCell,
  selectedHandData,
  onCellSelect,
}: {
  selectedCell: string | null
  selectedHandData: HandData | null
  onCellSelect: (hand: string | null) => void
}) {
  if (!selectedCell) {
    return <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
      Click a hand in the matrix to see details
    </div>
  }
  if (!selectedHandData) {
    return <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
      Select a hand to see GTO data
    </div>
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#c8c8c8', margin: '4px 0', fontWeight: 500 }}>
        <span style={{ fontWeight: 700, color: GREEN, fontSize: 14 }}>{selectedCell}</span>
        <span style={{ fontSize: 10, color: '#888', fontWeight: 400, marginLeft: 'auto' }}>
          Eq: {(selectedHandData.equity * 100).toFixed(0)}% · Freq: {(selectedHandData.frequency * 100).toFixed(0)}%
        </span>
      </div>

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
                {ACTION_LABELS[action] || action}
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
        <div style={{
          marginTop: 6, borderRadius: 8, padding: '10px 8px',
          color: '#fff', background: RED_DARK, textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.9 }}>
            All In <span style={{ fontSize: 8, marginLeft: 4, opacity: 0.7, fontWeight: 400 }}>GTO</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 750, lineHeight: 1.2, marginTop: 2 }}>
            {(selectedHandData.frequency * 100).toFixed(0)}%
          </div>
          <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
            {Math.round(selectedHandData.frequency * 6)} combos
          </div>
        </div>
      )}

      {selectedHandData.action.startsWith('raise') && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#aaa', textAlign: 'center', padding: '4px 8px', background: '#151515', borderRadius: 6 }}>
          GTO sizing: <strong style={{ color: RED_BRIGHT }}>{selectedHandData.action.replace('raise_', '').replace('bb', '')}bb</strong>
          {' · '}{(selectedHandData.frequency * 100).toFixed(0)}% frequency
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

      {/* Combo list */}
      <div style={{ marginTop: 8, borderTop: '1px solid #262626', paddingTop: 8 }}>
        <div style={{
          fontSize: 9, color: '#999', fontWeight: 600, marginBottom: 6,
          textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          Combos
        </div>
        <ComboGrid hand={selectedCell} />
      </div>
    </div>
  )
}

function ComboGrid({ hand }: { hand: string }) {
  const suitSymbols: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
  const suitColors: Record<string, string> = { s: '#fff', h: '#E53935', d: '#E53935', c: '#fff' }
  const suits = ['s', 'h', 'd', 'c']
  const r1 = hand[0], r2 = hand[1]
  const isPair = r1 === r2
  const isSuited = hand.length === 3 && hand[2] === 's'
  const combos: { s1: string; s2: string }[] = []

  if (isPair) {
    for (let i = 0; i < suits.length; i++)
      for (let j = i + 1; j < suits.length; j++)
        combos.push({ s1: suits[i], s2: suits[j] })
  } else if (isSuited) {
    for (const s of suits) combos.push({ s1: s, s2: s })
  } else {
    for (const s1 of suits)
      for (const s2 of suits)
        if (s1 !== s2) combos.push({ s1, s2 })
  }

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {combos.map((c, i) => (
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
        ))}
      </div>
      <div style={{ fontSize: 8, color: '#555', marginTop: 3, textAlign: 'right' }}>
        {isPair ? '6 combos' : isSuited ? '4 combos' : '12 combos'}
      </div>
    </>
  )
}

// ── Summary sub-tab ──
function SummaryTab({
  rangeData,
  isSolverMode,
  onCellSelect,
}: {
  rangeData: Map<string, HandData>
  isSolverMode: boolean
  onCellSelect: (hand: string | null) => void
}) {
  if (!isSolverMode) {
    return <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
      Select a position to view summary
    </div>
  }
  return (
    <div>
      <div style={{
        fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 6,
        textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
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
              {ACTION_LABELS[action] || action} ({hands.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {hands.slice(0, 15).map(([hand, d]) => (
                <span key={hand} onClick={() => onCellSelect(hand)}
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
  )
}

// ── Filters sub-tab ──
function FiltersTab({
  handFilters,
  onHandFilterChange,
  blockerRanks,
  onBlockerRanksChange,
  isSolverMode,
}: {
  handFilters: Record<string, boolean>
  onHandFilterChange: (key: string, value: boolean) => void
  blockerRanks: string[]
  onBlockerRanksChange: (ranks: string[]) => void
  isSolverMode: boolean
}) {
  return (
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
          {(['pairs', 'suited', 'offsuit', 'broadway', 'aceHigh'] as const).map(cat => (
            <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11, color: '#ccc', cursor: 'pointer' }}>
              <input type="checkbox" checked={handFilters[cat]}
                onChange={() => onHandFilterChange(cat, !handFilters[cat])}
                style={{ accentColor: GREEN }}
              />
              {cat === 'aceHigh' ? 'Ace High' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </label>
          ))}

          <div style={{ height: 1, background: '#262626', margin: '8px 0' }} />

          <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Blockers
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
            {['A', 'K', 'Q', 'J', 'T'].map(rank => (
              <button key={rank}
                onClick={() => {
                  onBlockerRanksChange(
                    blockerRanks.includes(rank)
                      ? blockerRanks.filter(r => r !== rank)
                      : [...blockerRanks, rank]
                  )
                }}
                aria-pressed={blockerRanks.includes(rank)}
                style={{
                  width: 26, height: 26, borderRadius: 4,
                  background: blockerRanks.includes(rank) ? GREEN : '#2a2a2a',
                  border: `1px solid ${blockerRanks.includes(rank) ? GREEN : '#333'}`,
                  color: blockerRanks.includes(rank) ? '#000' : '#ccc',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}
              >{rank}</button>
            ))}
          </div>
          <div style={{ fontSize: 9, color: '#666' }}>
            Blocking a rank dims all hands containing it
          </div>
        </>
      )}
    </div>
  )
}

// ── Blockers sub-tab ──
function BlockersTab({
  boardCards,
  blockerRanks,
}: {
  boardCards: BoardCard[]
  blockerRanks: string[]
}) {
  function countCombos(hand: string, blocked: Set<string>): number {
    const r1 = hand[0], r2 = hand[1]
    const b1 = blocked.has(r1) ? 1 : 0
    const b2 = blocked.has(r2) ? 1 : 0
    if (r1 === r2) {
      const avail = 4 - b1
      if (avail < 2) return 0
      return avail * (avail - 1) / 2
    }
    const isSuited = hand.length === 3 && hand[2] === 's'
    const totalRaw = (4 - b1) * (4 - b2)
    const suited = Math.max(0, 4 - b1 - b2)
    if (isSuited) return suited
    return Math.max(0, totalRaw - suited)
  }

  const boardRanks = new Set(boardCards.map(c => c.rank))
  const allBlockedRanks = new Set([...boardRanks, ...blockerRanks])

  let totalCombos = 0
  const perClass: Record<string, number> = { pairs: 0, suited: 0, offsuit: 0, broadway: 0, aceHigh: 0 }
  for (const row of MATRIX_HANDS) {
    for (const hand of row) {
      const combos = countCombos(hand, allBlockedRanks)
      totalCombos += combos
      const r1 = hand[0], r2 = hand[1]
      if (r1 === r2) perClass.pairs += combos
      else if (hand.endsWith('s')) perClass.suited += combos
      else perClass.offsuit += combos
      const broadway = new Set(['T', 'J', 'Q', 'K', 'A'])
      if (broadway.has(r1) && broadway.has(r2)) perClass.broadway += combos
      if (r1 === 'A') perClass.aceHigh += combos
    }
  }

  return (
    <div>
      <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Card Removal Analysis
      </div>

      {boardCards.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 9, color: '#aaa', marginBottom: 3 }}>Board cards blocking:</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {boardCards.map((card, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 2,
                padding: '2px 6px', borderRadius: 4,
                background: '#2a2a2a', fontSize: 10, fontWeight: 700,
                color: card.suit === 'h' || card.suit === 'd' ? '#E53935' : '#fff',
              }}>
                {card.rank}{SUIT_SYM[card.suit] || card.suit}
              </span>
            ))}
          </div>
        </div>
      )}

      {allBlockedRanks.size > 0 && (
        <div style={{ fontSize: 9, color: '#777', marginBottom: 8 }}>
          Blocked ranks: {Array.from(allBlockedRanks).sort().join(', ')}
        </div>
      )}

      {allBlockedRanks.size === 0 && (
        <div style={{ fontSize: 10, color: '#666', fontStyle: 'italic', marginBottom: 8 }}>
          No blockers active. Postflop board cards will appear here.
        </div>
      )}

      <div style={{ height: 1, background: '#262626', margin: '8px 0' }} />

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 8px', borderRadius: 4, background: '#1a1a1a', marginBottom: 8,
      }}>
        <span style={{ fontSize: 10, color: '#aaa', fontWeight: 600 }}>Total Combos</span>
        <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>
          {totalCombos}
          <span style={{ fontSize: 9, color: '#666', fontWeight: 400, marginLeft: 3 }}>/ 1326</span>
        </span>
      </div>

      <div style={{ fontSize: 9, color: '#aaa', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        By Hand Class
      </div>
      {([{ key: 'pairs', label: 'Pairs' }, { key: 'suited', label: 'Suited' }, { key: 'offsuit', label: 'Offsuit' }, { key: 'broadway', label: 'Broadway' }, { key: 'aceHigh', label: 'Ace High' }] as const).map(({ key, label }) => {
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

      {allBlockedRanks.size > 0 && (
        <>
          <div style={{ height: 1, background: '#262626', margin: '8px 0' }} />
          <div style={{ fontSize: 9, color: '#aaa', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Blocking Effect
          </div>
          {Array.from(allBlockedRanks).sort().reverse().map(rank => {
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
                <span style={{ color: '#E53935' }}>-{removed} combos</span>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// ── Actions Chart sub-tab ──
function ActionsChartTab({
  actionSummary,
  totalCombos,
  isSolverMode,
}: {
  actionSummary: Record<string, { count: number; totalFreq: number }>
  totalCombos: number
  isSolverMode: boolean
}) {
  if (!isSolverMode) {
    return <div style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>
      Select a position to view action distribution
    </div>
  }
  return (
    <div>
      <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Actions Chart
      </div>
      {Object.entries(actionSummary)
        .sort(([, a], [, b]) => b.totalFreq - a.totalFreq)
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
                  {ACTION_LABELS[action] || action}
                </span>
                <span style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>
                  {pct.toFixed(1)}% ({comboCount.toFixed(1)}c)
                </span>
              </div>
              <div style={{ height: 22, background: '#1a1a1a', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  height: '100%', width: `${Math.max(barPct, 3)}%`,
                  background: `linear-gradient(90deg, ${actionColor}, ${actionColor}dd)`,
                  borderRadius: 4, transition: 'width 0.3s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: 6,
                }}>
                  {labelInside && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{pct.toFixed(0)}%</span>}
                </div>
              </div>
            </div>
          )
        })}
    </div>
  )
}

// ── Overview Sub-tab Content ──
function OverviewSubTabs({
  rightSubTab,
  isSolverMode,
  rangeData,
  actionSummary,
  totalCombos,
  selectedCell,
  selectedHandData,
  handFilters,
  onHandFilterChange,
  blockerRanks,
  onBlockerRanksChange,
  boardCards,
  onCellSelect,
}: {
  rightSubTab: RightSubTab
  isSolverMode: boolean
  rangeData: Map<string, HandData>
  actionSummary: Record<string, { count: number; totalFreq: number }>
  totalCombos: number
  selectedCell: string | null
  selectedHandData: HandData | null
  handFilters: Record<string, boolean>
  onHandFilterChange: (key: string, value: boolean) => void
  blockerRanks: string[]
  onBlockerRanksChange: (ranks: string[]) => void
  boardCards: BoardCard[]
  onCellSelect: (hand: string | null) => void
}) {
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '4px 10px 10px' }}>
      {rightSubTab === 'actions' && (isSolverMode
        ? <ActionsTab actionSummary={actionSummary} totalCombos={totalCombos} />
        : <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Select a position to view strategy data</div>
      )}
      {rightSubTab === 'hand' && (
        <HandDetailsTab
          selectedCell={selectedCell}
          selectedHandData={selectedHandData}
          onCellSelect={onCellSelect}
        />
      )}
      {rightSubTab === 'summary' && (
        <SummaryTab rangeData={rangeData} isSolverMode={isSolverMode} onCellSelect={onCellSelect} />
      )}
      {rightSubTab === 'filters' && (
        <FiltersTab
          handFilters={handFilters}
          onHandFilterChange={onHandFilterChange}
          blockerRanks={blockerRanks}
          onBlockerRanksChange={onBlockerRanksChange}
          isSolverMode={isSolverMode}
        />
      )}
      {rightSubTab === 'blockers' && (
        <BlockersTab boardCards={boardCards} blockerRanks={blockerRanks} />
      )}
      {rightSubTab === 'actions_chart' && (
        <ActionsChartTab actionSummary={actionSummary} totalCombos={totalCombos} isSolverMode={isSolverMode} />
      )}
      {/* Range Compare tab */}
      {rightSubTab === 'range_compare' && (
        <RangeCompareTab allPositionData={undefined} activePosition={undefined as any} />
      )}
      {rightSubTab === 'equity_chart' && (
        <EquityChartTab rangeData={rangeData} isSolverMode={isSolverMode} />
      )}
      {rightSubTab === 'compare_ev' && (
        <CompareEVTab allPositionData={undefined} activePosition={undefined as any} />
      )}
    </div>
  )
}

// ── Range Compare sub-tab (placeholder) ──
function RangeCompareTab({ allPositionData, activePosition }: { allPositionData?: Map<string, Map<string, HandData>> | undefined; activePosition: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Range Compare
      </div>
      <div style={{ fontSize: 9, color: '#777', marginBottom: 8 }}>
        Compare raise frequency across positions
      </div>
      <div style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>
        Select a position to compare ranges
      </div>
    </div>
  )
}

// ── Equity Chart sub-tab ──
function EquityChartTab({ rangeData, isSolverMode }: { rangeData: Map<string, HandData>; isSolverMode: boolean }) {
  if (!isSolverMode) {
    return <div style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>
      Select a position to view equity distribution
    </div>
  }
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
    rangeData.forEach(h => { if (h.equity >= b.min && h.equity < b.max) count++ })
    if (count > maxCount) maxCount = count
    return { ...b, count }
  })
  const avgEquity = rangeData.size > 0
    ? (Array.from(rangeData.values()).reduce((s, h) => s + h.equity, 0) / rangeData.size * 100).toFixed(1)
    : '0'
  return (
    <div>
      <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Equity Chart
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, padding: '8px 0' }}>
        {counts.map((bucket, i) => {
          const h = (bucket.count / maxCount) * 70
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: '100%', height: Math.max(h, 2),
                background: bucket.color, borderRadius: '3px 3px 0 0', opacity: 0.85,
              }} />
              <span style={{ fontSize: 7, color: '#777', textAlign: 'center' }}>{bucket.label}</span>
            </div>
          )
        })}
      </div>
      <div style={{ height: 1, background: '#262626', margin: '4px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#888' }}>
        <span>Avg equity: <strong style={{ color: '#ccc' }}>{avgEquity}%</strong></span>
        <span>{rangeData.size} hands</span>
      </div>
    </div>
  )
}

// ── Compare EV sub-tab ──
function CompareEVTab({ allPositionData, activePosition, rangeData }: { allPositionData?: Map<string, Map<string, HandData>>; activePosition: string; rangeData?: Map<string, HandData> }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#999', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Compare EV
      </div>
      <div style={{ fontSize: 9, color: '#777', marginBottom: 8 }}>
        Expected value by position (bb)
      </div>
      <div style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>
        Select a position to compare EV
      </div>
    </div>
  )
}

// ── Main Details Panel ──
export function StudyDetailsPanel({
  rightTopTab,
  onRightTopTabChange,
  rightSubTab,
  onRightSubTabChange,
  positions,
  activePosition,
  boardCards,
  boardStreet,
  onGenerateFlop,
  onAdvanceStreet,
  onResetBoard,
  isSolverMode,
  rangeData,
  actionSummary,
  totalCombos,
  selectedCell,
  selectedHandData,
  handFilters,
  onHandFilterChange,
  blockerRanks,
  onBlockerRanksChange,
  oopEV,
  allPositionData,
  onCellSelect,
}: {
  rightTopTab: RightTopTab
  onRightTopTabChange: (tab: RightTopTab) => void
  rightSubTab: RightSubTab
  onRightSubTabChange: (tab: RightSubTab) => void
  positions: Array<{ id: string; label: string; stack: number }>
  activePosition: string
  boardCards: BoardCard[]
  boardStreet: BoardStreet
  onGenerateFlop: () => void
  onAdvanceStreet: () => void
  onResetBoard: () => void
  isSolverMode: boolean
  rangeData: Map<string, HandData>
  actionSummary: Record<string, { count: number; totalFreq: number }>
  totalCombos: number
  selectedCell: string | null
  selectedHandData: HandData | null
  handFilters: Record<string, boolean>
  onHandFilterChange: (key: string, value: boolean) => void
  blockerRanks: string[]
  onBlockerRanksChange: (ranks: string[]) => void
  oopEV: number | null
  allPositionData: Map<string, Map<string, HandData>>
  onCellSelect: (hand: string | null) => void
}) {
  const subTabs = [
    { id: 'hand' as RightSubTab, label: 'Hand' },
    { id: 'summary' as RightSubTab, label: 'Summary' },
    { id: 'filters' as RightSubTab, label: 'Filters' },
    { id: 'actions' as RightSubTab, label: 'Actions' },
    { id: 'actions_chart' as RightSubTab, label: 'Act chart' },
    { id: 'range_compare' as RightSubTab, label: 'Range cmp' },
    { id: 'blockers' as RightSubTab, label: 'Blockers' },
    { id: 'equity_chart' as RightSubTab, label: 'Eq chart' },
    { id: 'compare_ev' as RightSubTab, label: 'Cmp EV' },
  ]

  return (
    <div style={{
      background: '#1C1C1C', border: '1px solid #262626',
      borderRadius: 10, overflow: 'hidden', minHeight: 0,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top tabs */}
      <div role="tablist" aria-label="Right sidebar tabs"
        style={{ display: 'flex', borderBottom: '1px solid #262626', flexShrink: 0 }}>
        {(['overview', 'table', 'equity_chart'] as const).map(tab => (
          <button key={tab} role="tab" aria-selected={rightTopTab === tab}
            onClick={() => onRightTopTabChange(tab)}
            style={{
              flex: 1, padding: '6px 4px',
              background: rightTopTab === tab ? '#1a1a1a' : '#111',
              border: 'none',
              borderBottom: rightTopTab === tab ? '2px solid #7CFC7C' : '2px solid transparent',
              color: rightTopTab === tab ? '#fff' : '#8e8e8e',
              fontSize: 10, fontWeight: 600, cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
            {tab === 'overview' ? 'Overview' : tab === 'table' ? 'Table' : 'Equity chart'}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {rightTopTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Position stacks + board */}
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
            <BoardSection
              boardCards={boardCards}
              boardStreet={boardStreet}
              onGenerateFlop={onGenerateFlop}
              onAdvanceStreet={onAdvanceStreet}
              onResetBoard={onResetBoard}
            />
          </div>

          {/* Sub-tab bar */}
          <div role="tablist" aria-label="Detail sub-tabs"
            style={{
              display: 'flex', borderBottom: '1px solid #262626',
              padding: '0 2px', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none',
            }}>
            {subTabs.map(({ id, label }) => (
              <button key={id} role="tab" aria-selected={rightSubTab === id}
                onClick={() => onRightSubTabChange(id)}
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
          <OverviewSubTabs
            rightSubTab={rightSubTab}
            isSolverMode={isSolverMode}
            rangeData={rangeData}
            actionSummary={actionSummary}
            totalCombos={totalCombos}
            selectedCell={selectedCell}
            selectedHandData={selectedHandData}
            handFilters={handFilters}
            onHandFilterChange={onHandFilterChange}
            blockerRanks={blockerRanks}
            onBlockerRanksChange={onBlockerRanksChange}
            boardCards={boardCards}
            onCellSelect={onCellSelect}
          />
        </div>
      )}

      {/* ── Table Tab ── */}
      {rightTopTab === 'table' && (
        <div style={{ padding: '8px 10px', flex: 1, overflow: 'auto' }}>
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
                const isActiveRow = activePosition === pos.id
                return (
                  <tr key={pos.id} style={{ borderBottom: '1px solid #1f1f1f' }}>
                    <td style={{
                      padding: '4px 6px',
                      color: isActiveRow ? '#7CFC7C' : '#999',
                      fontWeight: isActiveRow ? 600 : 400,
                    }}>{pos.id}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', color: isActiveRow ? '#ccc' : '#888' }}>
                      {pos.stack.toFixed(0)}bb
                    </td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', color: isActiveRow ? '#ccc' : '#888' }}>
                      {isActiveRow && oopEV !== null ? (
                        <span style={{ color: oopEV >= 0 ? '#7CFC7C' : '#E53935' }}>
                          {oopEV >= 0 ? '+' : ''}{oopEV.toFixed(1)}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', color: isActiveRow ? '#ccc' : '#888' }}>
                      {totalCombos}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Equity Chart Tab ── */}
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
                {[0, 1, 2, 3, 4, 5].map((_, i) => {
                  const h = Math.max(4, selectedHandData.equity * 55)
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div style={{
                        width: '100%', height: Math.max(h, 2),
                        background: i === 0 ? '#7CFC7C' : '#3A6EA5',
                        borderRadius: '3px 3px 0 0', opacity: 0.7 + (i === 0 ? 0.3 : 0),
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
  )
}

export { RangeCompareTab, CompareEVTab }
