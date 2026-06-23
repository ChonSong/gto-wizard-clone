'use client'

type ActionOption = {
  id: string
  label: string
  shortLabel: string
  color: string
  description: string
}

const ACTIONS: ActionOption[] = [
  { id: 'fold', label: 'Fold', shortLabel: 'FOLD', color: '#2a2a2a', description: '0 EV' },
  { id: 'call', label: 'Call', shortLabel: 'CALL', color: '#3A6EA5', description: 'Call bet' },
  { id: 'raise', label: 'Raise', shortLabel: 'RAISE', color: '#E53935', description: 'Raise' },
  { id: 'all_in', label: 'All In', shortLabel: 'ALL IN', color: '#7B1E1E', description: 'All-in shove' },
]

// Preflop raise sizes (in big blinds)
const RAISE_SIZES = [
  { bb: 2.0, label: '2bb' },
  { bb: 2.5, label: '2.5bb' },
  { bb: 3.0, label: '3bb' },
  { bb: 4.0, label: '4bb' },
  { bb: 5.0, label: '5bb' },
  { bb: 7.0, label: '7bb' },
  { bb: 10.0, label: '10bb' },
]

interface ActionSelectorProps {
  selectedAction: string | null
  onSelect: (action: string) => void
  selectedSize?: number | null
  onSelectSize?: (bb: number) => void
  gtoAction?: string                          // GTO-recommended action for comparison
  gtoFrequency?: number                       // GTO frequency of that action (0-1)
  disabled?: boolean
  locked?: boolean                            // If true, show feedback mode (GTO comparison)
  feedback?: 'correct' | 'incorrect' | null   // Feedback after compare
}

export default function ActionSelector({
  selectedAction,
  onSelect,
  selectedSize,
  onSelectSize,
  gtoAction,
  gtoFrequency,
  disabled = false,
  locked = false,
  feedback,
}: ActionSelectorProps) {
  const showSizeSelector = selectedAction === 'raise' && !locked && !feedback

  return (
    <div>
      {/* GTO frequency micro-chips — shown when GTO data available (always during active state) */}
      {gtoAction && gtoFrequency !== undefined && !disabled && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
          {ACTIONS.map(a => {
            const isGto = gtoAction === a.id
            const isSelectable = !locked
            return (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '2px 8px', borderRadius: 10,
                background: isGto ? `${a.color}44` : '#1a1a1a',
                border: isGto ? `1px solid ${a.color}88` : '1px solid #2a2a2a',
                fontSize: 10, fontWeight: isGto ? 700 : 500,
                color: isGto ? '#fff' : '#888',
                cursor: isSelectable && !isGto ? 'pointer' : 'default',
                transition: 'all 0.12s',
              }}
                onClick={() => {
                  if (isSelectable && !locked) {
                    onSelect(a.id)
                    if (a.id !== 'raise') {
                      // Reset bet size when switching to non-raise action
                    }
                  }
                }}
              >
                <span>{a.shortLabel}</span>
                <span style={{ fontWeight: 700, color: isGto ? '#fff' : '#666' }}>
                  {isGto ? `${(gtoFrequency * 100).toFixed(0)}%` : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="study-action-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {ACTIONS.map(a => {
          const isGto = gtoAction === a.id
          const isSelected = selectedAction === a.id
          const isCorrect = feedback === 'correct' && isSelected
          const isWrong = feedback === 'incorrect' && isSelected

          let bg = isSelected ? a.color : '#161616'
          if (isCorrect) bg = '#00C853'
          if (isWrong) bg = '#D32F2F'

          const showGtoBadge = isGto && locked && !isSelected

          return (
            <button
              key={a.id}
              className="study-action-btn"
              onClick={() => !disabled && !locked && onSelect(a.id)}
              aria-label={`${a.label}${isSelected ? ', selected' : ''}${isGto && locked ? ', GTO recommended' : ''}`}
              aria-pressed={isSelected}
              title={a.description}
              style={{
                borderRadius: 10,
                padding: '12px 8px',
                background: bg,
                border: isSelected
                  ? `2px solid ${isCorrect ? '#00C853' : isWrong ? '#D32F2F' : '#fff'}`
                  : isGto && locked
                    ? '2px solid #FFD700'
                    : '1px solid #333',
                color: isSelected ? '#fff' : '#aaa',
                cursor: disabled || locked ? 'default' : 'pointer',
                transition: 'all .12s',
                position: 'relative',
                opacity: disabled ? 0.4 : 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {isSelected && selectedAction === 'raise' && selectedSize
                  ? `${a.shortLabel} ${selectedSize.toFixed(1)}bb`
                  : a.shortLabel}
              </div>
              {showGtoBadge && (
                <div style={{
                  position: 'absolute', top: -6, right: -6,
                  background: '#FFD700', color: '#000',
                  fontSize: 9, fontWeight: 700, padding: '1px 5px',
                  borderRadius: 8, lineHeight: 1.3,
                }}>
                  GTO
                </div>
              )}
              {isSelected && feedback && (
                <div style={{ fontSize: 10, marginTop: 2, opacity: 0.9, color: '#fff', fontWeight: 600 }}>
                  {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </div>
              )}
              {isGto && gtoFrequency !== undefined && locked && (
                <div style={{ fontSize: 10, opacity: 0.8, fontWeight: 600, color: '#FFD700' }}>
                  {(gtoFrequency * 100).toFixed(0)}%
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Raise sizing selector — appears below action buttons when RAISE is selected */}
      {showSizeSelector && onSelectSize && (
        <div style={{
          marginTop: 10,
          display: 'flex', flexWrap: 'wrap', gap: 4,
          padding: '8px 8px',
          background: '#141414',
          borderRadius: 8,
          border: '1px solid #2a2a2a',
        }}>
          <div style={{
            width: '100%', fontSize: 10, color: '#888',
            fontWeight: 500, marginBottom: 2,
          }}>
            Raise to:
          </div>
          {RAISE_SIZES.map(s => (
            <button
              key={s.bb}
              onClick={() => onSelectSize(s.bb)}
              aria-label={`Raise to ${s.label}`}
              aria-pressed={selectedSize === s.bb}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: selectedSize === s.bb ? 700 : 500,
                background: selectedSize === s.bb ? '#2a4a2a' : '#1e1e1e',
                border: selectedSize === s.bb
                  ? `1px solid ${'#7CFC7C'}`
                  : '1px solid #333',
                color: selectedSize === s.bb ? '#7CFC7C' : '#bbb',
                cursor: 'pointer',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
