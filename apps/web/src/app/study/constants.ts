// Shared types for the study page
export type HandData = { hand: string; action: string; frequency: number; equity: number }
export type TreeAction = { position: string; action: string; label: string; size?: number }
export type BoardCard = { rank: string; suit: string }
export type RightSubTab =
  | 'hand' | 'summary' | 'filters' | 'actions'
  | 'actions_chart' | 'range_compare' | 'blockers' | 'equity_chart' | 'compare_ev'
export type RightTopTab = 'overview' | 'table' | 'equity_chart'
export type ActiveTab = 'strategy' | 'ranges' | 'breakdown'
export type PositionId = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB'
export type GameMode = 'preflop' | 'postflop'
export type BoardStreet = 'preflop' | 'flop' | 'turn' | 'river'
export type TreeNode = {
  acting_position: string
  available_actions: Array<{ id: string; label: string; actionBase: string; size?: number }>
  pot_size: number
  stack_remaining?: number
  context: string
  description: string
} | null

// ── Color Constants ──
export const RED = '#D32F2F'
export const RED_BRIGHT = '#E53935'
export const RED_DARK = '#7B1E1E'
export const BLUE = '#3A6EA5'
export const GREEN = '#00C853'
export const GRAY = '#2a2a2a'

// ── Action Colors ──
export const ACTION_COLORS: Record<string, string> = {
  raise: RED_BRIGHT,
  call: BLUE,
  fold: GRAY,
  all_in: RED_DARK,
}

// ── Hand Matrix (13×13) ──
export const MATRIX_HANDS: string[][] = [
  ['AA','AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s'],
  ['AKo','KK','KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s'],
  ['AQo','KQo','QQ','QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s','Q4s','Q3s','Q2s'],
  ['AJo','KJo','QJo','JJ','JTs','J9s','J8s','J7s','J6s','J5s','J4s','J3s','J2s'],
  ['ATo','KTo','QTo','JTo','TT','T9s','T8s','T7s','T6s','T5s','T4s','T3s','T2s'],
  ['A9o','K9o','Q9o','J9o','T9o','99','98s','97s','96s','95s','94s','93s','92s'],
  ['A8o','K8o','Q8o','J8o','T8o','98o','88','87s','86s','85s','84s','83s','82s'],
  ['A7o','K7o','Q7o','J7o','T7o','97o','87o','77','76s','75s','74s','73s','72s'],
  ['A6o','K6o','Q6o','J6o','T6o','96o','86o','76o','66','65s','64s','63s','62s'],
  ['A5o','K5o','Q5o','J5o','T5o','95o','85o','75o','65o','55','54s','53s','52s'],
  ['A4o','K4o','Q4o','J4o','T4o','94o','84o','74o','64o','54o','44','43s','42s'],
  ['A3o','K3o','Q3o','J3o','T3o','93o','83o','73o','63o','53o','43o','33','32s'],
  ['A2o','K2o','Q2o','J2o','T2o','92o','82o','72o','62o','52o','42o','32o','22'],
]

export const SUIT_SYM: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
export const SUIT_COLOR: Record<string, string> = { s: '#fff', h: '#E53935', d: '#E53935', c: '#fff' }

export const ACTION_LABELS: Record<string, string> = {
  raise: 'Raise 2.5',
  call: 'Call',
  fold: 'Fold',
  all_in: 'All In',
}

export const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'] as const
export const SUITS = ['s','h','d','c'] as const

export const ALL_POSITIONS: PositionId[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']

export const TAB_ORDER: ActiveTab[] = ['strategy', 'ranges', 'breakdown']

export const ACTION_TYPES = ['raise', 'call', 'fold', 'all_in'] as const

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

// ── Per-Position Action Sets ──
export type ActionDef = { id: string; label: string; actionBase: string; size?: number }
export const POSITION_ACTIONS: Record<string, ActionDef[]> = {
  UTG: [
    { id: 'fold', label: 'Fold', actionBase: 'fold' },
    { id: 'raise_2.5', label: 'Raise 2.5', actionBase: 'raise', size: 2.5 },
    { id: 'all_in', label: 'Allin 100', actionBase: 'all_in' },
  ],
  HJ: [
    { id: 'fold', label: 'Fold', actionBase: 'fold' },
    { id: 'raise_2.5', label: 'Raise 2.5', actionBase: 'raise', size: 2.5 },
    { id: 'all_in', label: 'Allin 100', actionBase: 'all_in' },
  ],
  CO: [
    { id: 'fold', label: 'Fold', actionBase: 'fold' },
    { id: 'raise_2.5', label: 'Raise 2.5', actionBase: 'raise', size: 2.5 },
    { id: 'all_in', label: 'Allin 100', actionBase: 'all_in' },
  ],
  BTN: [
    { id: 'fold', label: 'Fold', actionBase: 'fold' },
    { id: 'raise_2.5', label: 'Raise 2.5', actionBase: 'raise', size: 2.5 },
    { id: 'all_in', label: 'Allin 100', actionBase: 'all_in' },
  ],
  SB: [
    { id: 'fold', label: 'Fold', actionBase: 'fold' },
    { id: 'call', label: 'Call', actionBase: 'call' },
    { id: 'raise_3.5', label: 'Raise 3.5', actionBase: 'raise', size: 3.5 },
    { id: 'all_in', label: 'Allin 100', actionBase: 'all_in' },
  ],
  BB: [
    { id: 'fold', label: 'Fold', actionBase: 'fold' },
    { id: 'call', label: 'Call', actionBase: 'call' },
    { id: 'raise_3.5', label: 'Raise 3.5', actionBase: 'raise', size: 3.5 },
    { id: 'all_in', label: 'Allin 100', actionBase: 'all_in' },
  ],
}

// ── Hand utility helpers ──
const broadwayRanks = new Set(['T','J','Q','K','A'])
export function getGtoActionBase(action: string): string {
  return action.startsWith('raise') ? 'raise' : action
}
export function getHandCategories(hand: string): string[] {
  const cats: string[] = []
  const r1 = hand[0], r2 = hand[1]
  if (r1 === r2) cats.push('pair')
  else if (hand.endsWith('s')) cats.push('suited')
  else if (hand.endsWith('o') || hand.length === 2) cats.push('offsuit')
  if (broadwayRanks.has(r1) && broadwayRanks.has(r2)) cats.push('broadway')
  if (r1 === 'A') cats.push('aceHigh')
  return cats
}
export function isHandFiltered(hand: string, filters: Record<string, boolean>): boolean {
  const cats = getHandCategories(hand)
  if (!filters.pairs && cats.includes('pair')) return true
  if (!filters.suited && cats.includes('suited')) return true
  if (!filters.offsuit && cats.includes('offsuit')) return true
  if (!filters.broadway && cats.includes('broadway')) return true
  if (!filters.aceHigh && cats.includes('aceHigh')) return true
  return false
}
export function isHandBlocked(hand: string, blockers: string[]): boolean {
  if (blockers.length === 0) return false
  const r1 = hand[0], r2 = hand[1]
  return blockers.includes(r1) || blockers.includes(r2)
}
export function parseBoardString(boardStr: string): BoardCard[] {
  const cards: BoardCard[] = []
  const cleaned = boardStr.replace(/[^2-9TJQKAtshdch]/gi, '')
  for (let i = 0; i < cleaned.length; i += 2) {
    if (i + 1 < cleaned.length) {
      cards.push({ rank: cleaned[i].toUpperCase(), suit: cleaned[i + 1].toLowerCase() })
    }
  }
  return cards
}
export function boardCardsToString(cards: BoardCard[]): string {
  return cards.map(c => c.rank + c.suit).join('')
}
export function generateRandomCards(count: number, exclude: string[]): BoardCard[] {
  const used = new Set(exclude.map(c => c.toLowerCase()))
  const cards: BoardCard[] = []
  const available: BoardCard[] = []
  for (const r of RANKS) for (const s of SUITS) {
    const key = (r + s).toLowerCase()
    if (!used.has(key)) available.push({ rank: r, suit: s })
  }
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]]
  }
  for (let i = 0; i < Math.min(count, available.length); i++) cards.push(available[i])
  return cards
}
