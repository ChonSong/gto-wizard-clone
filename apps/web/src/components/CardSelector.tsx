"use client";

import { useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface CardSelection {
  rank: string;
  suit: string;
}

interface CardSelectorProps {
  /** Maximum number of cards the user can select */
  maxCards: number;
  /** Currently selected cards */
  selected: CardSelection[];
  /** Called when selection changes */
  onChange: (cards: CardSelection[]) => void;
  /** Label for this selector */
  label?: string;
  /** Number of cards that must be face-down / shown as back (stud style) */
  downCount?: number;
  /** Whether to render face-up/face-down slots instead of a grid */
  slotMode?: "stud" | "badugi" | "razz" | "grid";
}

// ============================================================================
// Constants
// ============================================================================

const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUITS: Array<{ key: string; sym: string; color: string }> = [
  { key: "s", sym: "♠", color: "text-white" },
  { key: "h", sym: "♥", color: "text-red-400" },
  { key: "d", sym: "♦", color: "text-red-400" },
  { key: "c", sym: "♣", color: "text-white" },
];

const SUIT_MAP: Record<string, string> = {
  s: "♠", h: "♥", d: "♦", c: "♣",
};

function cardKey(c: CardSelection) {
  return `${c.rank}${c.suit}`;
}

function isSameCard(a: CardSelection, b: CardSelection) {
  return a.rank === b.rank && a.suit === b.suit;
}

function cardsToRangeString(cards: CardSelection[]): string {
  // Convert selected cards to a range string like "AhKhQh" or "AsKs,AhKh"
  if (cards.length === 0) return "";
  // Group cards by rank for range notation
  const byRank: Record<string, CardSelection[]> = {};
  for (const c of cards) {
    if (!byRank[c.rank]) byRank[c.rank] = [];
    byRank[c.rank].push(c);
  }
  // For specific cards, use explicit card notation
  return cards.map((c) => `${c.rank}${c.suit}`).join(",");
}

// ============================================================================
// Card Grid Selector (compact 52-card grid)
// ============================================================================

export function CardSelectorGrid({
  maxCards,
  selected,
  onChange,
  label,
}: CardSelectorProps) {
  const selectedSet = useMemo(() => new Set(selected.map(cardKey)), [selected]);

  const toggleCard = useCallback(
    (rank: string, suit: string) => {
      const existing = selected.find((c) => c.rank === rank && c.suit === suit);
      if (existing) {
        onChange(selected.filter((c) => !isSameCard(c, existing)));
      } else if (selected.length < maxCards) {
        onChange([...selected, { rank, suit }]);
      }
    },
    [selected, maxCards, onChange]
  );

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
            {label}
          </span>
          <span className="text-[10px] text-gray-500">
            {selected.length}/{maxCards}
          </span>
        </div>
      )}
      <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-2">
        {SUITS.map((suit) => (
          <div key={suit.key} className="flex items-center gap-0.5 mb-0.5 last:mb-0">
            <span className={cn("w-5 text-center text-xs font-bold shrink-0", suit.color)}>
              {suit.sym}
            </span>
            {RANKS.map((rank) => {
              const key = `${rank}${suit.key}`;
              const isSelected = selectedSet.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleCard(rank, suit.key)}
                  className={cn(
                    "w-7 h-7 rounded text-[10px] font-bold transition-all flex items-center justify-center",
                    isSelected
                      ? "bg-green-600 text-white shadow-sm scale-105"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                  )}
                  title={`${rank}${suit.sym}`}
                >
                  {rank}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Slot-based Card Selector (for stud: 7 slots, 3 down + 4 up)
// ============================================================================

interface SlotSelectorProps {
  maxCards: number;
  selected: CardSelection[];
  onChange: (cards: CardSelection[]) => void;
  label?: string;
  downCount?: number;
  variantName: string;
}

export function SlotSelector({
  maxCards,
  selected,
  onChange,
  label,
  downCount = 0,
  variantName,
}: SlotSelectorProps) {
  const openCards = useMemo(() => {
    const set = new Set<string>();
    return {
      has: (r: string, s: string) => set.has(`${r}${s}`),
      add: (r: string, s: string) => set.add(`${r}${s}`),
    };
  }, []); // stable ref

  // All 52 cards for the picker
  const allCards = useMemo(() => {
    const cards: CardSelection[] = [];
    for (const s of SUITS) {
      for (const r of RANKS) {
        cards.push({ rank: r, suit: s.key });
      }
    }
    return cards;
  }, []);

  const toggleSlot = useCallback(
    (index: number) => {
      // If this slot has a card, remove it
      if (index < selected.length) {
        const newSel = [...selected];
        newSel.splice(index, 1);
        onChange(newSel);
      }
    },
    [selected, onChange]
  );

  const addCardToSlot = useCallback(
    (card: CardSelection) => {
      if (selected.length >= maxCards) return;
      if (selected.some((c) => isSameCard(c, card))) return;
      onChange([...selected, card]);
    },
    [selected, maxCards, onChange]
  );

  const availableCards = useMemo(() => {
    const selectedKeys = new Set(selected.map(cardKey));
    return allCards.filter((c) => !selectedKeys.has(cardKey(c)));
  }, [allCards, selected]);

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
            {label}
          </span>
          <span className="text-[10px] text-gray-500">
            {selected.length}/{maxCards}
          </span>
        </div>
      )}

      {/* Card slot display */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-3">
        <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider font-semibold">
          {variantName} Cards
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {Array.from({ length: maxCards }).map((_, i) => {
            const card = i < selected.length ? selected[i] : null;
            const isDown = i < downCount;

            return (
              <button
                key={i}
                onClick={() => card && toggleSlot(i)}
                className={cn(
                  "w-12 h-16 rounded-lg border text-xs font-bold transition-all flex items-center justify-center",
                  card
                    ? isDown
                      ? "bg-gray-700 border-gray-600 text-gray-400 cursor-pointer hover:bg-gray-600"
                      : card.suit === "h" || card.suit === "d"
                        ? "bg-white border-gray-300 text-red-600 cursor-pointer hover:bg-red-50"
                        : "bg-white border-gray-300 text-gray-900 cursor-pointer hover:bg-gray-100"
                    : "border-dashed border-gray-600 bg-gray-800/50 text-gray-500 hover:border-gray-500"
                )}
                title={card ? `${card.rank}${SUIT_MAP[card.suit]}${isDown ? " (down)" : " (up)"}` : `Slot ${i + 1}`}
              >
                {card ? (
                  isDown ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="12" cy="10" r="2" />
                      <path d="M8 18c0-2 2-4 4-4s4 2 4 4" />
                    </svg>
                  ) : (
                    <div className="flex flex-col items-center leading-none">
                      <span className="text-sm font-bold">{card.rank}</span>
                      <span className="text-xs">{SUIT_MAP[card.suit]}</span>
                    </div>
                  )
                ) : (
                  <span className="text-lg opacity-40">+</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Card picker below slots */}
        {selected.length < maxCards && (
          <div>
            <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">
              Pick a card
            </div>
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {SUITS.map((suit) => (
                <div key={suit.key} className="flex items-center gap-0.5">
                  <span className={cn("w-4 text-center text-xs font-bold shrink-0", suit.color)}>
                    {suit.sym}
                  </span>
                  {RANKS.map((rank) => {
                    const key = `${rank}${suit.key}`;
                    const used = selected.some((c) => c.rank === rank && c.suit === suit.key);
                    return (
                      <button
                        key={key}
                        onClick={() => !used && addCardToSlot({ rank, suit: suit.key })}
                        disabled={used}
                        className={cn(
                          "w-6 h-6 rounded text-[9px] font-bold transition-all flex items-center justify-center",
                          used
                            ? "bg-gray-800/50 text-gray-700 cursor-not-allowed"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                        )}
                      >
                        {rank}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Exported helpers
// ============================================================================

/** Convert a CardSelection array to a range string for the API */
export function selectedCardsToRange(cards: CardSelection[]): string {
  return cardsToRangeString(cards);
}

/** Convert a CardSelection array to a hand display array for components */
export function cardsToHandDisplay(cards: CardSelection[]): Array<{ rank: string; suit: string }> {
  return cards.map((c) => ({ rank: c.rank, suit: c.suit }));
}
