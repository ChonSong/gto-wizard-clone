'use client'

import { GREEN, GRAY, ACTION_COLORS, POSITION_ACTIONS, ALL_POSITIONS, type TreeNode, type ActionDef, type HandData } from '../constants'
import { useCallback } from 'react'

interface PositionInfo { id: string; label: string; stack: number }

function comboCount(hand: string): number {
  if (hand.length === 2 && hand[0] === hand[1]) return 6
  if (hand.endsWith('s')) return 4
  return 12
}

function computeRangePct(data: Map<string, HandData> | undefined): number {
  if (!data || data.size === 0) return 0
  let totalCombos = 0
  data.forEach((h) => {
    if (h.action !== 'fold') {
      totalCombos += comboCount(h.hand) * h.frequency
    }
  })
  return (totalCombos / 1326) * 100
}

export function StudyPlayerTiles({
  positions,
  activePosition,
  treePath,
  treeNode,
  solverStatus,
  actionFilter,
  allPositionData,
  onSelectPosition,
  onActionClick,
  onActionFilter,
  onActionFeedback,
  customActions,
}: {
  positions: PositionInfo[]
  activePosition: string
  treePath: Array<{ position: string }>
  treeNode: TreeNode
  solverStatus: 'online' | 'offline'
  actionFilter: string | null
  allPositionData?: Map<string, Map<string, HandData>>
  onSelectPosition: (pos: string) => void
  onActionClick: (actionBase: string) => void
  onActionFilter: (filter: string | null) => void
  onActionFeedback?: (actionBase: string) => void
  customActions?: Record<string, ActionDef[]>
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', gap: 4,
      padding: '4px 12px', overflowX: 'auto', overflowY: 'hidden',
      background: '#0E0E0E', borderBottom: '1px solid #141414',
      flexShrink: 0, minHeight: 50,
    }}>
      {/* Solver status pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        paddingRight: 6, flexShrink: 0,
      }}>
        <div style={{
          background: '#1A1A1A', border: '1px solid #2a2a2a',
          color: '#d0d0d0', padding: '4px 6px', borderRadius: 6,
          fontSize: 10, display: 'flex', alignItems: 'center',
          gap: 3, whiteSpace: 'nowrap',
        }}>
          <span style={{ color: solverStatus === 'online' ? GREEN : '#ff4444' }}>●</span>
          {solverStatus === 'online' ? 'GTO' : 'Offline'}
        </div>
      </div>

      {positions.map((pos) => {
        const isActive = activePosition === pos.id
        const isTreeMode = treePath.length > 0 && treeNode != null
        const posActions = (isActive && isTreeMode && treeNode?.available_actions)
          || (customActions?.[pos.id])
          || POSITION_ACTIONS[pos.id] || []
        const rangePct = computeRangePct(allPositionData?.get(pos.id))

        return (
          <div key={pos.id}
            onClick={() => { onSelectPosition(pos.id) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectPosition(pos.id) } }}
            role="button" tabIndex={0}
            aria-label={`${pos.label} position, ${rangePct > 0 ? `${rangePct.toFixed(1)}% range` : 'no range data'}, ${pos.stack > 0 ? `${pos.stack}bb stack` : 'no stack data'}${isActive ? ', active' : ''}`}
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
            }}
            className={`hspot-card ${isActive ? 'hspotcrd_active' : 'hspotcrd_minimized'}`}
          >
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 6,
              marginBottom: isActive ? 3 : 0,
            }}>
              <span style={{
                fontWeight: 700, fontSize: isActive ? 12 : 11,
                color: isActive ? '#fff' : '#aaa', letterSpacing: '0.02em',
              }}>{pos.label}</span>
              <span style={{
                fontSize: isActive ? 11 : 10, fontWeight: 600,
                color: isActive ? '#7CFC7C' : '#888', whiteSpace: 'nowrap',
              }}>
                {rangePct > 0 ? `${rangePct.toFixed(1)}%` : '\u2014'}
              </span>
            </div>
            {isActive && (
              <div style={{
                fontSize: 9, color: '#aaa', marginBottom: 2,
                display: 'flex', justifyContent: 'space-between', gap: 4,
              }}>
                <span>{pos.stack > 0 ? `${pos.stack}bb` : ''}</span>
              </div>
            )}

            {isActive && (
              <>
                <div style={{
                  fontSize: 8, color: GREEN, fontWeight: 600,
                  marginBottom: 3, letterSpacing: '0.02em',
                }}>
                  Take action ▶
                </div>
                <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {posActions.map(act => {
                    const actionColor = ACTION_COLORS[act.actionBase] || GRAY
                    const isActiveFilter = actionFilter === act.actionBase
                    return (
                      <div key={act.id}
                        onClick={(e) => { e.stopPropagation(); if (onActionFeedback) { onActionFeedback(act.actionBase) } else { onActionClick(act.actionBase) } }}
                        onMouseEnter={() => onActionFilter(act.actionBase)}
                        onMouseLeave={() => onActionFilter(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            // Keyboard: toggle filter instead of advancing position
                            onActionFilter(isActiveFilter ? null : act.actionBase)
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isActiveFilter}
                        aria-label={`${act.label} action — ${isActiveFilter ? 'filter active' : 'press Enter to filter matrix'}`}
                        style={{
                          fontSize: 8, padding: '1px 4px', lineHeight: '14px',
                          background: isActiveFilter ? actionColor : 'rgba(255,255,255,0.04)',
                          border: isActiveFilter ? `1px solid ${actionColor}` : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 3, color: isActiveFilter ? '#000' : '#999',
                          fontWeight: isActiveFilter ? 700 : 500, whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          outline: isActiveFilter ? `2px solid ${actionColor}` : 'none',
                          outlineOffset: 1,
                        }}
                        className={`hspotcrd_action${isActiveFilter ? ' hspotcrd_action_active' : ''}`}
                      >
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
  )
}
