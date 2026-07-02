'use client'

import {
  BLUE, GREEN, GRAY,
  MATRIX_HANDS, ACTION_COLORS, ACTION_LABELS,
  type HandData, type ActiveTab,
} from '../constants'

/** Map a raw GTO action to its single-letter suffix for matrix display. */
function getActionLetter(action: string): string {
  if (action.startsWith('raise') || action === 'all_in' || action === 'bet') return 'R'
  if (action === 'call' || action === 'check') return 'C'
  return 'F'
}

// ── Matrix Grid ──
export function StudyMatrixGrid({
  activeTab,
  onTabChange,
  rangeData,
  isSolverMode,
  selectedCell,
  onCellSelect,
  getCellColor,
  getCellOpacity,
  actionFilter,
}: {
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
  rangeData: Map<string, HandData>
  isSolverMode: boolean
  selectedCell: string | null
  onCellSelect: (hand: string | null) => void
  getCellColor: (hand: string) => string
  getCellOpacity: (hand: string) => number
  actionFilter: string | null
}) {
  return (
    <div style={{
      background: '#1C1C1C', border: '1px solid #262626',
      borderRadius: 8, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', minHeight: 0,
    }}>
      {/* Tab bar */}
      <div role="tablist" aria-label="Strategy view tabs"
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '4px 8px', borderBottom: '1px solid #262626',
          flexShrink: 0,
        }}>
        {([
          { id: 'strategy' as ActiveTab, label: 'Strategy ▾' },
          { id: 'ranges' as ActiveTab, label: 'Ranges' },
          { id: 'breakdown' as ActiveTab, label: 'Breakdown' },
        ]).map(tab => (
          <span key={tab.id} role="tab" aria-selected={activeTab === tab.id} tabIndex={0}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTabChange(tab.id) } }}
            style={{
              fontSize: 11, color: activeTab === tab.id ? '#fff' : '#8e8e8e',
              cursor: 'pointer', padding: '2px 0',
              position: 'relative', fontWeight: 500,
              outline: activeTab === tab.id ? `2px solid #00C853` : 'none',
              outlineOffset: 2, borderRadius: 2,
            }}>
            {tab.label}
            {activeTab === tab.id && (
              <span style={{
                position: 'absolute', left: 0, right: 0,
                bottom: -4, height: 2, background: '#00C853',
              }} />
            )}
          </span>
        ))}
      </div>

      {/* Scrollable content area */}
      <div style={{ flex: 1, overflow: 'auto', padding: 4 }}>

        {/* ── Strategy Tab: Hand Matrix ── */}
        {activeTab === 'strategy' && (
          <div role="grid" aria-label="Hand matrix"
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)',
              gap: 0, background: '#1a1a1a',
              borderRadius: 6, overflow: 'hidden', padding: 1,
            }}>
            {MATRIX_HANDS.map((row, rowIdx) => (
              <div key={rowIdx} role="row" style={{ display: 'contents' }}>
                {row.map(hand => {
                  const data = rangeData.get(hand)
                  const opacity = getCellOpacity(hand)
                  const isSelected = selectedCell === hand
                  const color = getCellColor(hand)
                  const showFreqChip = data && data.action !== 'fold' && data.frequency < 1
                  const raisePct = showFreqChip
                    ? `${(data.frequency * 100).toFixed(0)}%`
                    : null
                  const actionLetter = data ? getActionLetter(data.action) : ''

                  return (
                    <div key={hand} role="gridcell"
                      tabIndex={isSelected ? 0 : -1}
                      aria-label={`${hand}${data ? `, ${data.action} ${(data.frequency * 100).toFixed(0)} percent` : ''}`}
                      aria-selected={isSelected}
                      onClick={() => onCellSelect(isSelected ? null : hand)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onCellSelect(isSelected ? null : hand)
                        }
                      }}
                      style={{
                        minHeight: isSelected ? 84 : undefined,
                        height: isSelected ? undefined : '21px',
                        boxSizing: 'border-box',
                        display: 'flex', flexDirection: 'column',
                        alignItems: isSelected ? 'stretch' : 'center',
                        justifyContent: 'center',
                        fontWeight: 700, color: '#fff', letterSpacing: -0.3,
                        fontSize: 9,
                        textShadow: '0 1px 2px rgba(0,0,0,.8)',
                        cursor: 'pointer', userSelect: 'none',
                        background: showFreqChip
                          ? `linear-gradient(to right, ${color} ${raisePct}, ${GRAY} ${raisePct})`
                          : color,
                        opacity,
                        border: isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 3,
                        transition: 'opacity .15s, border .15s',
                        outline: 'none',
                        padding: isSelected ? '3px' : '1px 2px',
                        zIndex: isSelected ? 10 : undefined,
                        gap: 0,
                      }}>
                      <span style={{ textAlign: 'center', width: '100%', lineHeight: 1, fontSize: 9 }}>{hand}</span>

                      {showFreqChip && !isSelected && (
                        <span style={{
                          fontSize: 8, fontWeight: 700, opacity: 1,
                          color: '#fff',
                          background: 'rgba(0,0,0,0.45)',
                          padding: '0px 2px', borderRadius: 2,
                          lineHeight: 1.1,
                        }}>
                          {(data.frequency * 100).toFixed(0)}% {actionLetter}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* ── Ranges Tab ── */}
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
                      <div style={{
                        fontSize: 11, fontWeight: 600, color: actionColor,
                        marginBottom: 4, textTransform: 'uppercase',
                      }}>
                        {ACTION_LABELS[action] || action} ({hands.length} hands)
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {hands.slice(0, 20).map(([hand, d]) => (
                          <div key={hand} onClick={() => onCellSelect(hand)}
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

        {/* ── Breakdown Tab ── */}
        {activeTab === 'breakdown' && (
          <div style={{ padding: 8 }}>
            {!isSolverMode ? (
              <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                Select a position to see breakdown
              </div>
            ) : (
              <>
                {/* Hand category distribution */}
                {(function () {
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
                              <span style={{ fontSize: 10, color: '#888' }}>
                                {data.count} ({pct.toFixed(0)}%) · avg Eq: {avgEq}%
                              </span>
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

                {/* Action Distribution */}
                {(function () {
                  const actionCounts: Record<string, { count: number; totalFreq: number }> = {}
                  rangeData.forEach((d) => {
                    const action = d.action.startsWith('raise') ? 'raise' : d.action
                    if (!actionCounts[action]) actionCounts[action] = { count: 0, totalFreq: 0 }
                    actionCounts[action].count++
                    actionCounts[action].totalFreq += d.frequency
                  })
                  return (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#999', marginBottom: 6 }}>
                        Action Distribution
                      </div>
                      {Object.entries(actionCounts)
                        .sort(([, a], [, b]) => b.count - a.count)
                        .map(([action, data]) => {
                          const pct = (data.count / rangeData.size) * 100
                          const actionColor = ACTION_COLORS[action] || '#888'
                          return (
                            <div key={action} style={{ marginBottom: 4 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ fontSize: 11, color: actionColor, fontWeight: 500 }}>
                                  {ACTION_LABELS[action] || action}
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

                {/* Top 10 by Equity */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#999', marginBottom: 6 }}>
                    Top 10 by Equity
                  </div>
                  {Array.from(rangeData.entries())
                    .sort(([, a], [, b]) => b.equity - a.equity)
                    .slice(0, 10)
                    .map(([hand, d]) => (
                      <div key={hand} onClick={() => onCellSelect(hand)}
                        style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center',
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
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: BLUE, borderRadius: 2, marginRight: 3, verticalAlign: 'middle' }} />
          Raise
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: GREEN, borderRadius: 2, marginRight: 3, verticalAlign: 'middle' }} />
          Call
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: GRAY, borderRadius: 2, marginRight: 3, verticalAlign: 'middle' }} />
          Fold
        </span>
      </div>
    </div>
  )
}
