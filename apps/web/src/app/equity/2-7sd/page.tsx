"use client";

import { useState, useCallback } from "react";

// ============================================================================
// 2-7 Single Draw Hand Evaluator (client-side)
// ============================================================================

type Suit = "h" | "d" | "c" | "s";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";

const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const SUITS: Suit[] = ["h", "d", "c", "s"];

const RANK_VALUES: Record<Rank, number> = {
  A: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7,
  8: 8, 9: 9, T: 10, J: 11, Q: 12, K: 13,
};

const SUIT_SYMBOLS: Record<Suit, string> = { h: "♥", d: "♦", c: "♣", s: "♠" };
const SUIT_COLORS: Record<Suit, string> = {
  h: "text-red-400", d: "text-red-400", c: "text-gray-300", s: "text-gray-300",
};

interface Card {
  rank: Rank;
  suit: Suit;
}

function parseCard(str: string): Card | null {
  const s = str.trim().toLowerCase();
  if (s.length < 2) return null;
  const rank = s[0].toUpperCase() as Rank;
  const suit = s[1] as Suit;
  if (!RANKS.includes(rank) || !SUITS.includes(suit)) return null;
  return { rank, suit };
}

function cardToString(c: Card): string {
  return `${c.rank}${c.suit}`;
}

function parseHand(input: string): Card[] | null {
  const parts = input.split(/[,\s]+/).filter(Boolean);
  if (parts.length !== 5) return null;
  const cards: Card[] = [];
  for (const p of parts) {
    const c = parseCard(p);
    if (!c) return null;
    cards.push(c);
  }
  const seen = new Set<string>();
  for (const c of cards) {
    const key = cardToString(c);
    if (seen.has(key)) return null;
    seen.add(key);
  }
  return cards;
}

// 2-7 hand ranking: lower is better (like golf)
// In 2-7, straights and flushes COUNT AGAINST you.
// Best possible hand: 7-5-4-3-2 (unsuited, unpaired, no straight).

interface HandRank {
  category: number; // 0=best (7-5-4-3-2 no flush no straight), 8=worst (straight flush)
  tiebreakers: number[];
}

function evaluateHand(cards: Card[]): HandRank {
  const values = cards.map((c) => RANK_VALUES[c.rank]).sort((a, b) => a - b);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);

  const uniqueValues = [...new Set(values)].sort((a, b) => a - b);
  let isStraight = false;
  let straightHigh = 0;

  if (uniqueValues.length === 5) {
    if (uniqueValues[4] - uniqueValues[0] === 4) {
      isStraight = true;
      straightHigh = uniqueValues[4];
    }
    if (uniqueValues[0] === 1 && uniqueValues[1] === 2 && uniqueValues[2] === 3 && uniqueValues[3] === 4 && uniqueValues[4] === 5) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  const counts: Record<number, number> = {};
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1;
  }
  const countEntries = Object.entries(counts)
    .map(([v, c]) => ({ value: Number(v), count: c }))
    .sort((a, b) => b.count - a.count || a.value - b.value);

  // Categories (best to worst in 2-7):
  // 0: High card, 1: One pair, 2: Two pair, 3: Three of a kind,
  // 4: Straight, 5: Flush, 6: Full house, 7: Four of a kind, 8: Straight flush

  if (isFlush && isStraight) {
    return { category: 8, tiebreakers: [straightHigh] };
  }
  if (countEntries[0].count === 4) {
    return { category: 7, tiebreakers: [countEntries[0].value, countEntries[1].value] };
  }
  if (countEntries[0].count === 3 && countEntries[1].count === 2) {
    return { category: 6, tiebreakers: [countEntries[0].value, countEntries[1].value] };
  }
  if (isFlush) {
    const tb = [...values].sort((a, b) => b - a);
    return { category: 5, tiebreakers: tb };
  }
  if (isStraight) {
    return { category: 4, tiebreakers: [straightHigh] };
  }
  if (countEntries[0].count === 3) {
    const kickers = countEntries.slice(1).map((e) => e.value);
    return { category: 3, tiebreakers: [countEntries[0].value, ...kickers] };
  }
  if (countEntries[0].count === 2 && countEntries[1].count === 2) {
    const pairs = [countEntries[0].value, countEntries[1].value].sort((a, b) => a - b);
    const kicker = countEntries[2].value;
    return { category: 2, tiebreakers: [...pairs, kicker] };
  }
  if (countEntries[0].count === 2) {
    const kickers = countEntries.slice(1).map((e) => e.value);
    return { category: 1, tiebreakers: [countEntries[0].value, ...kickers] };
  }
  // High card — sort ascending (lower is better in 2-7)
  const tb = [...values].sort((a, b) => a - b);
  return { category: 0, tiebreakers: tb };
}

function compareHands(a: HandRank, b: HandRank): number {
  if (a.category !== b.category) return a.category - b.category;
  for (let i = 0; i < Math.min(a.tiebreakers.length, b.tiebreakers.length); i++) {
    if (a.tiebreakers[i] !== b.tiebreakers[i]) {
      return a.tiebreakers[i] - b.tiebreakers[i];
    }
  }
  return 0;
}

const CATEGORY_NAMES: Record<number, string> = {
  0: "High Card",
  1: "One Pair",
  2: "Two Pair",
  3: "Three of a Kind",
  4: "Straight",
  5: "Flush",
  6: "Full House",
  7: "Four of a Kind",
  8: "Straight Flush",
};

// ============================================================================
// Monte Carlo Equity Calculator
// ============================================================================

function buildDeck(exclude: Card[]): Card[] {
  const excludeSet = new Set(exclude.map(cardToString));
  const deck: Card[] = [];
  for (const r of RANKS) {
    for (const s of SUITS) {
      const c: Card = { rank: r, suit: s };
      if (!excludeSet.has(cardToString(c))) {
        deck.push(c);
      }
    }
  }
  return deck;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface EquityResult {
  equity1: number;
  equity2: number;
  ties: number;
  samples: number;
  hand1Name: string;
  hand2Name: string;
}

function calculateEquity(
  hand1: Card[],
  hand2: Card[],
  _samples: number
): EquityResult {
  const rank1 = evaluateHand(hand1);
  const rank2 = evaluateHand(hand2);
  const cmp = compareHands(rank1, rank2);

  return {
    equity1: cmp < 0 ? 100 : 0,
    equity2: cmp > 0 ? 100 : 0,
    ties: cmp === 0 ? 100 : 0,
    samples: 1,
    hand1Name: CATEGORY_NAMES[rank1.category],
    hand2Name: CATEGORY_NAMES[rank2.category],
  };
}

// ============================================================================
// Card Display Component
// ============================================================================

function CardDisplay({ card }: { card: Card }) {
  return (
    <span className="inline-flex items-center gap-0.5 font-mono font-bold">
      <span className="text-white">{card.rank}</span>
      <span className={SUIT_COLORS[card.suit]}>{SUIT_SYMBOLS[card.suit]}</span>
    </span>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function DeuceToSevenSingleDrawPage() {
  const [hand1, setHand1] = useState("");
  const [hand2, setHand2] = useState("");
  const [samples, setSamples] = useState(10000);
  const [result, setResult] = useState<EquityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parsedHand1, setParsedHand1] = useState<Card[] | null>(null);
  const [parsedHand2, setParsedHand2] = useState<Card[] | null>(null);

  const handleHand1Change = (val: string) => {
    setHand1(val);
    setParsedHand1(parseHand(val));
  };

  const handleHand2Change = (val: string) => {
    setHand2(val);
    setParsedHand2(parseHand(val));
  };

  const calculate = useCallback(() => {
    const h1 = parseHand(hand1);
    const h2 = parseHand(hand2);

    if (!h1) {
      setError("Hand 1: enter 5 valid cards (e.g. 7h, 5d, 4c, 3s, 2h)");
      return;
    }
    if (!h2) {
      setError("Hand 2: enter 5 valid cards (e.g. 7c, 6d, 5h, 4s, 3c)");
      return;
    }

    const allCards = new Set([...h1, ...h2].map(cardToString));
    if (allCards.size < 10) {
      setError("Hands cannot share cards");
      return;
    }

    setError("");
    setLoading(true);
    setResult(null);

    setTimeout(() => {
      try {
        const res = calculateEquity(h1, h2, samples);
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Calculation failed");
      } finally {
        setLoading(false);
      }
    }, 50);
  }, [hand1, hand2, samples]);

  const canCalculate = parsedHand1 !== null && parsedHand2 !== null && !loading;

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-poker-gold mb-1">
            2-7 Single Draw Equity
          </h1>
          <p className="text-gray-400 text-sm">
            Deuce-to-Single Draw equity calculator — enter two 5-card hands and compare.
            Lower hands win (straights and flushes count against you).
          </p>
        </div>

        {/* Hand Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-[#1C1C1C] border border-[#262626] rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
              Your Hand (5 cards)
            </h2>
            <input
              type="text"
              value={hand1}
              onChange={(e) => handleHand1Change(e.target.value)}
              placeholder="7h, 5d, 4c, 3s, 2h"
              className="w-full bg-[#0E0E0E] border border-[#333] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:border-poker-gold focus:outline-none font-mono text-sm"
            />
            {parsedHand1 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {parsedHand1.map((c, i) => (
                  <span
                    key={i}
                    className="bg-[#262626] rounded px-2 py-1 text-xs"
                  >
                    <CardDisplay card={c} />
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Format: rank + suit (h/d/c/s), comma-separated
            </p>
          </div>

          <div className="bg-[#1C1C1C] border border-[#262626] rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
              Opponent Hand (5 cards)
            </h2>
            <input
              type="text"
              value={hand2}
              onChange={(e) => handleHand2Change(e.target.value)}
              placeholder="7c, 6d, 5h, 4s, 3c"
              className="w-full bg-[#0E0E0E] border border-[#333] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:border-poker-gold focus:outline-none font-mono text-sm"
            />
            {parsedHand2 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {parsedHand2.map((c, i) => (
                  <span
                    key={i}
                    className="bg-[#262626] rounded px-2 py-1 text-xs"
                  >
                    <CardDisplay card={c} />
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Enter 5 cards, comma or space separated
            </p>
          </div>
        </div>

        {/* Samples */}
        <div className="bg-[#1C1C1C] border border-[#262626] rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Monte Carlo Samples
            </h2>
            <span className="text-lg font-mono text-poker-gold">
              {samples.toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min="1000"
            max="100000"
            step="1000"
            value={samples}
            onChange={(e) => setSamples(Number(e.target.value))}
            className="w-full accent-poker-gold"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1,000 (fast)</span>
            <span>100,000 (accurate)</span>
          </div>
        </div>

        {/* Calculate Button */}
        <button
          onClick={calculate}
          disabled={!canCalculate}
          className="w-full bg-poker-gold hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-900 font-bold py-3.5 px-6 rounded-lg transition-colors text-lg mb-8"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Calculating...
            </span>
          ) : (
            "Calculate Equity"
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-[#1C1C1C] border border-[#262626] rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 text-white">Results</h2>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Your Equity</p>
                <p className="text-4xl font-bold text-green-400 font-mono">
                  {result.equity1.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Current: {CATEGORY_NAMES[evaluateHand(parsedHand1!).category]}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Opponent Equity</p>
                <p className="text-4xl font-bold text-blue-400 font-mono">
                  {result.equity2.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Current: {CATEGORY_NAMES[evaluateHand(parsedHand2!).category]}
                </p>
              </div>
            </div>

            {/* Equity bar */}
            <div className="h-8 rounded-full overflow-hidden flex bg-[#0E0E0E] mb-4">
              <div
                className="bg-green-500 flex items-center justify-center transition-all duration-500"
                style={{ width: `${result.equity1}%` }}
              >
                {result.equity1 > 12 && (
                  <span className="text-xs font-bold text-gray-900">
                    {result.equity1.toFixed(0)}%
                  </span>
                )}
              </div>
              {result.ties > 0 && (
                <div
                  className="bg-yellow-500 flex items-center justify-center transition-all duration-500"
                  style={{ width: `${result.ties}%` }}
                >
                  {result.ties > 5 && (
                    <span className="text-xs font-bold text-gray-900">
                      {result.ties.toFixed(0)}%
                    </span>
                  )}
                </div>
              )}
              <div
                className="bg-blue-500 flex items-center justify-center transition-all duration-500"
                style={{ width: `${result.equity2}%` }}
              >
                {result.equity2 > 12 && (
                  <span className="text-xs font-bold text-white">
                    {result.equity2.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-between text-xs text-gray-500">
              <span>Samples: {result.samples.toLocaleString()}</span>
              {result.ties > 0 && <span>Ties: {result.ties.toFixed(1)}%</span>}
            </div>
          </div>
        )}

        {/* How 2-7 Single Draw Works */}
        <div className="bg-[#1C1C1C] border border-[#262626] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
            How 2-7 Single Draw Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
            <div>
              <h3 className="text-white font-medium mb-1">Hand Rankings (best → worst)</h3>
              <ol className="list-decimal list-inside space-y-0.5 text-xs">
                <li>High Card (7-5-4-3-2 is nuts)</li>
                <li>One Pair</li>
                <li>Two Pair</li>
                <li>Three of a Kind</li>
                <li>Straight <span className="text-red-400">(counts against you)</span></li>
                <li>Flush <span className="text-red-400">(counts against you)</span></li>
                <li>Full House</li>
                <li>Four of a Kind</li>
                <li>Straight Flush <span className="text-red-400">(worst possible)</span></li>
              </ol>
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">Key Rules</h3>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>Each player gets 5 cards, then 1 draw round</li>
                <li>Straights and flushes COUNT AGAINST you</li>
                <li>A-2-3-4-5 is the worst straight (5-high)</li>
                <li>Best possible hand: 7-5-4-3-2 (rainbow)</li>
                <li>Aces are always low in 2-7</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
