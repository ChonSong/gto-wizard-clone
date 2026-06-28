'use client'

import { GREEN, GRAY, ACTION_COLORS, POSITION_ACTIONS, ALL_POSITIONS, type TreeNode, type ActionDef, type HandData, type BoardCard, type BoardStreet } from '../constants'

// ── Aggregate Strip ──
export function StudyAggregateStrip({
  positionAggregates,
  activePosition,
  allPositionLoading,
  onSelectPosition,
}: {
  positionAggregates: Record<string, { fold: number; call: number; raise: number; total: number }>
  activePosition: string
  allPositionLoading: boolean
  onSelectPosition: (pos: string) => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', gap: 0,
      padding: '4px 8px', background: '#0E0E0E',
      borderBottom: '1px solid #1a1a1a', flexShrink: 0,
      fontSize: 10, fontWeight: 500, color: '#888',
      overflow: 'hidden',
    }}>
      {ALL_POSITIONS.map((pos) => {
        const isActive = pos === activePosition
        const agg = positionAggregates[pos]
        const hasData = agg.total > 0
        const foldPct = hasData ? Math.round((agg.fold / 1326) * 100) : 0
        const callPct = hasData ? Math.round((agg.call / 1326) * 100) : 0
        const raisePct = hasData ? Math.round((agg.raise / 1326) * 100) : 0
        return (
          <div key={pos} onClick={() => onSelectPosition(pos)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 1, cursor: 'pointer',
              padding: '2px 4px',
              borderBottom: isActive ? `2px solid ${GREEN}` : '2px solid transparent',
              opacity: hasData ? 1 : 0.4,
            }}>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: isActive ? GREEN : '#666', letterSpacing: 0.3,
            }}>{pos}</span>
            {/* Stacked horizontal bar (F/C/R) */}
            <div style={{
              width: '100%', height: 8, borderRadius: 2,
              background: '#2a2a2a', overflow: 'hidden',
              display: 'flex', marginTop: 1,
            }}>
              {foldPct > 0 && (
                <div style={{
                  width: `${foldPct}%`, height: '100%',
                  background: '#2a2a2a',
                }} />
              )}
              {callPct > 0 && (
                <div style={{
                  width: `${callPct}%`, height: '100%',
                  background: '#3A6EA5',
                }} />
              )}
              {raisePct > 0 && (
                <div style={{
                  width: `${raisePct}%`, height: '100%',
                  background: '#E53935',
                }} />
              )}
            </div>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center', fontSize: 8, marginTop: 1 }}>
              <span style={{ color: '#666' }}>F:{foldPct}%</span>
              <span style={{ color: '#3A6EA5' }}>C:{callPct}%</span>
              <span style={{ color: '#E53935' }}>R:{raisePct}%</span>
            </div>
            <span style={{ fontSize: 8, color: '#555' }}>
              {hasData ? `${agg.fold + agg.call + agg.raise} combos` : (allPositionLoading ? '...' : '—')}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Action Prompt Header ──
export function StudyActionPrompt({
  treePath,
  treeNode,
  activePosition,
  selectedCell,
}: {
  treePath: Array<{ position: string; label: string }>
  treeNode: TreeNode
  activePosition: string
  selectedCell: string | null
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', background: '#111',
      borderBottom: '1px solid #1a1a1a', flexShrink: 0,
    }}>
      {treePath.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 10, color: '#666', flexWrap: 'nowrap',
          overflow: 'hidden', maxWidth: '40%',
        }}>
          {treePath.map((entry, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {i > 0 && <span style={{ color: '#444' }}>›</span>}
              <span style={{
                color: i === treePath.length - 1 ? GREEN : '#888',
                fontWeight: i === treePath.length - 1 ? 700 : 500
              }}>{entry.position}</span>
              <span style={{ color: '#999', fontWeight: 500 }}>
                {entry.label.replace(/\s*\d+bb?$/, '')}
              </span>
            </span>
          ))}
          <span style={{ color: '#444', marginLeft: 2 }}>|</span>
        </div>
      )}
      <span style={{ color: GREEN, fontSize: 12, fontWeight: 700, letterSpacing: '0.03em' }}>
        {activePosition}
      </span>
      <span style={{ color: '#666', fontSize: 11 }}>—</span>
      <span style={{ color: '#aaa', fontSize: 11, fontWeight: 500 }}>
        {treeNode?.context === 'vs_raise' ? 'Facing a raise' :
          treeNode?.context === 'vs_3bet' ? 'Facing a 3-bet' :
            treeNode?.context === 'vs_4bet' ? 'Facing a 4-bet' :
              treeNode?.context === 'rfi' ? 'Raise first in' : 'Enter your action'}
      </span>
      {treeNode && treeNode.pot_size > 0 && (
        <span style={{ color: '#666', fontSize: 10, fontFamily: 'monospace', marginLeft: 4 }}>
          Pot: {treeNode.pot_size}bb
        </span>
      )}
      {treeNode && treeNode.stack_remaining != null && treeNode.stack_remaining > 0 && (
        <span style={{ color: '#666', fontSize: 10, fontFamily: 'monospace' }}>
          Eff: {treeNode.stack_remaining}bb
        </span>
      )}
      <div style={{ flex: 1 }} />
      {selectedCell && (
        <span style={{ color: '#888', fontSize: 10, fontFamily: 'monospace' }}>{selectedCell}</span>
      )}
    </div>
  )
}

// ── Hotkey Help ──
export function StudyHotkeyHelp({
  showHotkeys,
  onToggle,
}: {
  showHotkeys: boolean
  onToggle: () => void
}) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 4 }} data-hotkeys-popup>
      <button onClick={onToggle}
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
          fontSize: 10, color: '#aaa', zIndex: 100,
          minWidth: 180, boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontWeight: 600, color: '#ccc', marginBottom: 6, fontSize: 11 }}>
            Keyboard Shortcuts
          </div>
          {[
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
  )
}

// ── Hotkey Toast ──
export function StudyHotkeyToast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div style={{
      position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
      background: '#1a3a2a', border: `1px solid ${GREEN}`,
      color: '#fff', padding: '6px 16px', borderRadius: 6,
      fontSize: 12, fontWeight: 600, zIndex: 1000,
      animation: 'fadeInOut 1.2s ease',
    }}>
      {message}
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          15% { opacity: 1; transform: translateX(-50%) translateY(0); }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
