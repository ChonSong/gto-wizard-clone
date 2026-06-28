'use client'

import { useState, useRef, useEffect } from 'react'
import { RANKS, SUITS, SUIT_SYM, SUIT_COLOR, GREEN } from '../constants'

const SUIT_BG: Record<string, string> = {
  s: '#3a3a3a',
  h: '#c1272d',
  d: '#1e40af',
  c: '#15803d',
}

const SUIT_FRAME: Record<string, string> = {
  s: '#fff', h: '#E53935', d: '#E53935', c: '#fff',
}

type BoardCard = { rank: string; suit: string }

export function BoardCardSelector({
  open,
  onClose,
  onConfirm,
  currentBoard,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (cards: BoardCard[]) => void
  currentBoard: BoardCard[]
}) {
  const [selected, setSelected] = useState<BoardCard[]>([])
  const popupRef = useRef<HTMLDivElement>(null)

  // Reset selected when opening
  useEffect(() => { if (open) setSelected([]) }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  const toggleCard = (rank: string, suit: string) => {
    const key = rank + suit
    const idx = selected.findIndex(c => c.rank + c.suit === key)
    if (idx > -1) {
      setSelected(prev => prev.filter((_, i) => i !== idx))
    } else if (selected.length < 3) {
      setSelected(prev => [...prev, { rank, suit }])
    }
  }

  const isSelected = (rank: string, suit: string) =>
    selected.some(c => c.rank === rank && c.suit === suit)

  const isUsed = (rank: string, suit: string) =>
    currentBoard.some(c => c.rank === rank && c.suit === suit)

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
    }}>
      <div ref={popupRef} style={{
        background: '#1a1a1a', borderRadius: 20,
        padding: 16, width: 360, maxWidth: '92vw',
        boxShadow: '0 25px 80px -20px #000',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {[0, 1, 2].map(i => {
              const card = selected[i]
              return (
                <div key={i} style={{
                  width: 46, height: 52, borderRadius: 6,
                  background: card ? SUIT_BG[card.suit] : '#151515',
                  border: card ? 'none' : '1px dashed #333',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'flex-end',
                  paddingBottom: 2,
                }}>
                  {card ? (
                    <>
                      <span style={{
                        color: '#fff', fontSize: 24, fontWeight: 900,
                        lineHeight: 1, letterSpacing: -0.5,
                      }}>{card.rank}</span>
                      <div style={{
                        width: '100%', height: 4,
                        background: GREEN, marginTop: 4,
                        borderRadius: 2,
                        boxShadow: `0 0 10px ${GREEN}66`,
                      }} />
                    </>
                  ) : (
                    <span style={{
                      color: '#333', fontSize: 30, fontWeight: 900,
                      lineHeight: 1,
                    }}>W</span>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setSelected([])}
              aria-label="Clear selection"
              style={{
                width: 36, height: 36, display: 'grid',
                placeItems: 'center', borderRadius: 12,
                color: '#8a8a8a', border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: 18,
              }}>
              🗑
            </button>
          </div>
        </div>

        {/* 4×13 Card Grid */}
        <div style={{
          background: '#0d0d0d', borderRadius: 14, padding: 6,
          border: '1px solid rgba(0,0,0,0.7)',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(13, 1fr)`,
            gap: 3,
          }}>
            {SUITS.map(suit => (
              RANKS.map(rank => {
                const sel = isSelected(rank, suit)
                const used = isUsed(rank, suit)
                return (
                  <button key={suit + rank} type="button"
                    onClick={() => !used && toggleCard(rank, suit)}
                    disabled={used}
                    style={{
                      position: 'relative', width: '100%',
                      aspectRatio: '26/32',
                      borderRadius: 5, border: 'none', padding: 0,
                      background: used ? '#222' : SUIT_BG[suit],
                      cursor: used ? 'not-allowed' : 'pointer',
                      opacity: used ? 0.3 : sel ? 1 : 0.85,
                      transition: 'all 0.15s',
                      transform: sel ? 'scale(1.05)' : 'scale(1)',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <span style={{
                      position: 'absolute', inset: 0, display: 'grid',
                      placeItems: 'center',
                      color: `rgba(255,255,255,0.12)`,
                      fontWeight: 900, fontSize: 22,
                      pointerEvents: 'none',
                    }}>
                      {SUIT_SYM[suit]}
                    </span>
                    <span style={{
                      position: 'relative', zIndex: 1,
                      color: '#fff', fontWeight: 900,
                      fontSize: 19, letterSpacing: -0.5,
                      textShadow: '0 1px 1px rgba(0,0,0,0.7)',
                    }}>
                      {rank}
                    </span>
                    <span style={{
                      position: 'absolute', inset: -2,
                      borderRadius: 6, border: `2px solid ${GREEN}`,
                      opacity: sel ? 1 : 0, transform: sel ? 'scale(1)' : 'scale(0.9)',
                      transition: 'all 0.2s', pointerEvents: 'none',
                      boxShadow: `0 0 0 3px ${GREEN}26, 0 0 18px ${GREEN}4D`,
                    }} />
                  </button>
                )
              })
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#bcbcbc', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              {selected.length}/3 Cards
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose}
              style={{
                height: 40, padding: '0 18px', borderRadius: 12,
                background: '#232323', color: '#ccc', border: 'none',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>
              Cancel
            </button>
            <button onClick={() => { if (selected.length === 3) { onConfirm(selected); onClose() } }}
              disabled={selected.length !== 3}
              style={{
                height: 40, padding: '0 18px', borderRadius: 12,
                background: selected.length === 3 ? '#2563eb' : '#262626',
                color: selected.length === 3 ? '#fff' : '#656565',
                cursor: selected.length === 3 ? 'pointer' : 'not-allowed',
                border: 'none', fontSize: 12, fontWeight: 700,
                boxShadow: selected.length === 3 ? '0 6px 20px rgba(37,99,235,0.35)' : 'none',
              }}>
              CONFIRM
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const RED = '#E53935'
