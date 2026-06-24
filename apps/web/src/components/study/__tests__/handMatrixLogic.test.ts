import { describe, it, expect } from 'vitest'

// ── Color constants (mirrors study page) ──────────────────
const RED = '#D32F2F'
const GRAY = '#2a2a2a'
const BLUE = '#3A6EA5'
const GREEN = '#00C853'

const ACTION_COLORS: Record<string, string> = {
  fold: GRAY,
  check: GREEN,
  call: BLUE,
  raise: RED,
  all_in: '#7B1E1E',
  bet: '#E65100',
  default: RED,
}

// ── Cell color logic (extracted from study/page.tsx) ──────
function getCellColor(
  hand: string,
  isSolverMode: boolean,
  rangeData: Map<string, { action: string; frequency: number; equity: number }>,
): string {
  if (isSolverMode) {
    const data = rangeData.get(hand)
    if (!data || data.action === 'fold') return GRAY
    // Normalize action key: 'raise_2.5bb' → 'raise', etc.
    const actionKey = data.action.startsWith('raise') ? 'raise' : data.action
    return ACTION_COLORS[actionKey] || RED
  }
  // Fallback hardcoded red set
  const redSet = new Set([
    'AA', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s',
    'A4s', 'A3s', 'A2s', 'AKo', 'KK', 'KQs', 'KJs', 'KTs', 'K9s', 'K8s',
    'K7s', 'AQo', 'KQo', 'QQ', 'QJs', 'QTs', 'AJo', 'KJo', 'JJ', 'JTs',
    'ATo', 'TT', '99', '98s', '88', '87s',
  ])
  if (redSet.has(hand)) return RED
  return GRAY
}

describe('hand matrix cell color logic', () => {
  describe('solver mode', () => {
    it('returns GRAY when no data for hand', () => {
      const rangeData = new Map()
      expect(getCellColor('AA', true, rangeData)).toBe(GRAY)
    })

    it('returns GRAY when hand action is fold', () => {
      const rangeData = new Map([['AA', { action: 'fold', frequency: 0, equity: 0 }]])
      expect(getCellColor('AA', true, rangeData)).toBe(GRAY)
    })

    it('returns BLUE for call action', () => {
      const rangeData = new Map([['AA', { action: 'call', frequency: 0.3, equity: 0.85 }]])
      expect(getCellColor('AA', true, rangeData)).toBe(BLUE)
    })

    it('returns RED for raise action', () => {
      const rangeData = new Map([['AKs', { action: 'raise', frequency: 0.8, equity: 0.65 }]])
      expect(getCellColor('AKs', true, rangeData)).toBe(RED)
    })

    it('normalizes raise_2.5bb to raise color', () => {
      const rangeData = new Map([['AA', { action: 'raise_2.5bb', frequency: 1.0, equity: 0.85 }]])
      expect(getCellColor('AA', true, rangeData)).toBe(RED)
    })

    it('normalizes raise_3bb to raise color', () => {
      const rangeData = new Map([['KK', { action: 'raise_3bb', frequency: 0.9, equity: 0.82 }]])
      expect(getCellColor('KK', true, rangeData)).toBe(RED)
    })

    it('returns RED for all_in action', () => {
      const rangeData = new Map([['AA', { action: 'all_in', frequency: 0.5, equity: 0.9 }]])
      expect(getCellColor('AA', true, rangeData)).toBe('#7B1E1E')
    })

    it('returns GREEN for check action', () => {
      const rangeData = new Map([['AKs', { action: 'check', frequency: 0.2, equity: 0.6 }]])
      expect(getCellColor('AKs', true, rangeData)).toBe(GREEN)
    })

    it('returns RED default for unknown action key', () => {
      const rangeData = new Map([['72o', { action: 'unknown_xyz', frequency: 0.1, equity: 0.2 }]])
      expect(getCellColor('72o', true, rangeData)).toBe(RED)
    })
  })

  describe('non-solver mode (hardcoded ranges)', () => {
    it('returns RED for AA', () => {
      const rangeData = new Map()
      expect(getCellColor('AA', false, rangeData)).toBe(RED)
    })

    it('returns RED for AKs', () => {
      expect(getCellColor('AKs', false, new Map())).toBe(RED)
    })

    it('returns GRAY for 72o', () => {
      expect(getCellColor('72o', false, new Map())).toBe(GRAY)
    })

    it('returns GRAY for 32s', () => {
      expect(getCellColor('32s', false, new Map())).toBe(GRAY)
    })

    it('returns RED for KQs', () => {
      expect(getCellColor('KQs', false, new Map())).toBe(RED)
    })

    it('returns GRAY for 22', () => {
      expect(getCellColor('22', false, new Map())).toBe(GRAY)
    })
  })
})
