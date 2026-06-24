import { describe, it, expect } from 'vitest'
import {
  parseBoardCards,
  formatActionButton,
  getActionKey,
  computeNextPot,
  streetActionLabel,
  actionColor,
} from '../PostflopTraining'

describe('parseBoardCards', () => {
  it('parses a standard 3-card flop string', () => {
    const result = parseBoardCards('KsKc3s')
    expect(result).toEqual([
      { rank: 'K', suit: 's' },
      { rank: 'K', suit: 'c' },
      { rank: '3', suit: 's' },
    ])
  })

  it('parses a 5-card river string', () => {
    const result = parseBoardCards('KsKc3s5h9d')
    expect(result).toHaveLength(5)
    expect(result[3]).toEqual({ rank: '5', suit: 'h' })
    expect(result[4]).toEqual({ rank: '9', suit: 'd' })
  })

  it('strips invalid characters gracefully', () => {
    const result = parseBoardCards('Ks Kc 3s !!')
    expect(result).toHaveLength(3)
    expect(result[0].rank).toBe('K')
  })

  it('returns empty array for empty string', () => {
    expect(parseBoardCards('')).toEqual([])
  })
})

describe('formatActionButton', () => {
  it('formats check action', () => {
    expect(formatActionButton('check', 10, 100)).toEqual({ label: 'CHECK' })
  })

  it('formats fold action', () => {
    expect(formatActionButton('fold', 10, 100)).toEqual({ label: 'FOLD' })
  })

  it('formats call action with half-pot amount', () => {
    const result = formatActionButton('call', 10, 100)
    expect(result.label).toBe('CALL')
    expect(result.amount).toBe(5)
  })

  it('formats bet action with percentage', () => {
    const result = formatActionButton('bet:0.33', 10, 100)
    expect(result.label).toBe('BET 33%')
    expect(result.amount).toBe(3)
  })

  it('formats bet:0.75 as 75%', () => {
    const result = formatActionButton('bet:0.75', 20, 100)
    expect(result.label).toBe('BET 75%')
    expect(result.amount).toBe(15)
  })

  it('formats all_in with specific amount', () => {
    const result = formatActionButton('all_in:98.185', 10, 100)
    expect(result.label).toBe('ALL IN 98.2')
    expect(result.amount).toBe(98.185)
  })

  it('formats all_in without amount uses stack depth', () => {
    const result = formatActionButton('all_in', 10, 100)
    expect(result.label).toBe('ALL IN 100.0')
    expect(result.amount).toBe(100)
  })

  it('formats raise action', () => {
    const result = formatActionButton('raise:0.5', 10, 100)
    expect(result.label).toBe('RAISE 50%')
    expect(result.amount).toBe(5)
  })
})

describe('getActionKey', () => {
  it('extracts bet from bet:0.33', () => {
    expect(getActionKey('bet:0.33')).toBe('bet')
  })

  it('extracts raise from raise:0.5', () => {
    expect(getActionKey('raise:0.5')).toBe('raise')
  })

  it('extracts all_in from all_in:98.185', () => {
    expect(getActionKey('all_in:98.185')).toBe('all_in')
  })

  it('returns action as-is for fold', () => {
    expect(getActionKey('fold')).toBe('fold')
  })

  it('returns action as-is for check', () => {
    expect(getActionKey('check')).toBe('check')
  })

  it('returns action as-is for call', () => {
    expect(getActionKey('call')).toBe('call')
  })
})

describe('computeNextPot', () => {
  it('check keeps pot unchanged', () => {
    expect(computeNextPot('check', 10, 100)).toBe(10)
  })

  it('fold keeps pot unchanged', () => {
    expect(computeNextPot('fold', 10, 100)).toBe(10)
  })

  it('call doubles the pot', () => {
    expect(computeNextPot('call', 10, 100)).toBe(20)
  })

  it('bet:0.33 adds 2x pot fraction', () => {
    const pot = 10
    const pct = 0.33
    const expected = pot + 2 * pot * pct // 10 + 6.6 = 16.6
    expect(computeNextPot('bet:0.33', pot, 100)).toBeCloseTo(16.6)
  })

  it('bet:0.75 adds 2x pot fraction', () => {
    const pot = 10
    const expected = pot + 2 * pot * 0.75 // 10 + 15 = 25
    expect(computeNextPot('bet:0.75', pot, 100)).toBe(25)
  })

  it('raise:0.5 adds 2x pot fraction', () => {
    const pot = 5.5
    const expected = pot + 2 * pot * 0.5 // 5.5 + 5.5 = 11
    expect(computeNextPot('raise:0.5', pot, 100)).toBe(11)
  })

  it('all_in returns stack_depth * 2', () => {
    expect(computeNextPot('all_in', 10, 100)).toBe(200)
  })
})

describe('streetActionLabel', () => {
  it('returns "Check" for check', () => {
    expect(streetActionLabel('check', 10, 100)).toBe('Check')
  })

  it('returns "Fold" for fold', () => {
    expect(streetActionLabel('fold', 10, 100)).toBe('Fold')
  })

  it('returns "Call" for call', () => {
    expect(streetActionLabel('call', 10, 100)).toBe('Call')
  })

  it('returns "Bet 33%" for bet:0.33', () => {
    expect(streetActionLabel('bet:0.33', 10, 100)).toBe('Bet 33%')
  })

  it('returns "Raise 50%" for raise:0.5', () => {
    expect(streetActionLabel('raise:0.5', 10, 100)).toBe('Raise 50%')
  })

  it('returns "All In" for all_in', () => {
    expect(streetActionLabel('all_in', 10, 100)).toBe('All In')
  })
})

describe('actionColor', () => {
  it('returns GRAY for fold', () => {
    expect(actionColor('fold')).toBe('#2a2a2a')
  })

  it('returns #555 for check', () => {
    expect(actionColor('check')).toBe('#555')
  })

  it('returns BLUE for call', () => {
    expect(actionColor('call')).toBe('#3A6EA5')
  })

  it('returns orange for bet', () => {
    expect(actionColor('bet')).toBe('#E65100')
  })

  it('returns orange for bet:0.33', () => {
    expect(actionColor('bet:0.33')).toBe('#E65100')
  })

  it('returns RED_BRIGHT for raise', () => {
    expect(actionColor('raise')).toBe('#E53935')
  })

  it('returns RED_DARK for all_in', () => {
    expect(actionColor('all_in')).toBe('#7B1E1E')
  })
})
