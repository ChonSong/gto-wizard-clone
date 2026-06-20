"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { EquityChart } from "@/components/equity";
import type { EquityEntry } from "@/components/equity";
import { cn } from "@/lib/utils";
import { gtoTheme } from "@/styles/gto-tokens";

// ============================================================================
// Types
// ============================================================================

interface EquityResult {
  hero: string;
  villain: string;
  heroEquity: number;
  villainEquity: number;
  heroWin: number;
  heroTie: number;
  villainWin: number;
  villainTie: number;
  totalCombos: number;
}

// ============================================================================
// Helpers
// ============================================================================

const SUIT_SYMBOLS: Record<string, string> = {
  h: "♥", d: "♦", c: "♣", s: "♠",
  "♥": "♥", "♦": "♦", "♣": "♣", "♠": "♠",
};

const SUIT_COLORS: Record<string, string> = {
  h: "text-red-400", d: "text-blue-400", c: "text-green-400", s: "text-gray-300",
  "♥": "text-red-400", "♦": "text-blue-400", "♣": "text-green-400", "♠": "text-gray-300",
};

function normalizeHand(input: string): string {
  return input.toUpperCase().replace(/\s+/g, "").replace(/[，、]/g, ",");
}

function isValidHand(hand: string): boolean {
  return /^[AKQJT2-9]{2}[so]?$/i.test(hand.trim());
}

function parseHands(input: string): string[] {
  return normalizeHand(input).split(",").map(h => h.trim()).filter(isValidHand);
}

function formatSuitSymbol(suit: string): string {
  return SUIT_SYMBOLS[suit] || suit;
}

function formatSuitColor(suit: string): string {
  return SUIT_COLORS[suit] || "text-white";
}

// ============================================================================
// Sub-components
// ============================================================================

function BoardCardView({ rank, suit }: { rank: string; suit: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-10 h-14 rounded-md bg-white flex flex-col items-center justify-center shadow-lg border border-gray-300">
        <span className="text-sm font-bold text-gray-900 leading-none">{rank}</span>
        <span className={cn("text-lg font-bold", formatSuitColor(suit))}>
          {formatSuitSymbol(suit)}
        </span>
      </div>
    </div>
  );
}

function GameSettingsSidebar() {
  const [selectedGameType, setSelectedGameType] = useState("Cash");
  const gameTypes = ["Cash", "Tournament", "Spin & Go"];
  const tableSizes = ["6max", "9max", "Heads-up"];
  const stakes = ["NL50", "NL100", "NL200", "NL500"];
  const scenarios = ["General", "3b Pot", "4b Pot", "SRP"];
  const stackDepths = ["100bb", "50bb", "75bb", "150bb"];

  const btnStyle = (isActive: boolean): React.CSSProperties => ({
    fontSize: "11px",
    padding: "4px 8px",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    fontWeight: isActive ? 600 : 400,
    backgroundColor: isActive ? "var(--green)" : "var(--panel)",
    color: isActive ? "#000" : "#9CA3AF",
    transition: "all 0.15s",
  });

  return (
    <div className="w-56 shrink-0 flex flex-col" style={{ backgroundColor: "var(--panel)", borderRight: "1px solid var(--border)" }}>
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          Game
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Type</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {gameTypes.map((gt) => (
              <button key={gt} onClick={() => setSelectedGameType(gt)} style={btnStyle(selectedGameType === gt)}>{gt}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Table Size</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {tableSizes.map((size) => (
              <button key={size} style={btnStyle(size === "6max")}>{size}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Stakes</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {stakes.map((stake) => (
              <button key={stake} style={btnStyle(stake === "NL50")}>{stake}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Scenario</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {scenarios.map((sc) => (
              <button key={sc} style={btnStyle(sc === "3b Pot")}>{sc}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Stack Depth</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {stackDepths.map((sd) => (
              <button key={sd} style={btnStyle(sd === "100bb")}>{sd}</button>
            ))}
          </div>
        </div>
        <div className="pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Active Solution</label>
          <div className="mt-1 p-2 rounded" style={{ backgroundColor: "rgba(170, 251, 178, 0.1)", border: "1px solid var(--green)" }}>
            <span className="text-xs font-semibold" style={{ color: "var(--green)" }}>3b GTO</span>
            <span className="text-[10px] block" style={{ color: "var(--muted)" }}>BTN vs BB · Q♥J♦4♠</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function EquityPage() {
  const [heroInput, setHeroInput] = useState("AKs");
  const [villainInput, setVillainInput] = useState("QQ");
  const [boardInput, setBoardInput] = useState("QdJh4s");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EquityResult | null>(null);

  const heroHands = useMemo(() => parseHands(heroInput), [heroInput]);
  const villainHands = useMemo(() => parseHands(villainInput), [villainInput]);
  const isInputValid = heroHands.length > 0 && villainHands.length > 0;

  const handleCalculate = useCallback(async () => {
    if (!isInputValid) return;
    setIsLoading(true);
    setError(null);

    try {
      const hero = heroHands[0];
      const villain = villainHands[0];
      const res = await fetch("/api/v1/equity/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hero, villain, board: boardInput || undefined, iterations: 50000 }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail?.[0]?.msg || errData?.detail || `API error (${res.status})`);
      }

      const data = await res.json();
      const heroEq = data.equity !== undefined ? data.equity * 100 : 50;
      const villainEq = 100 - heroEq;
      const heroWin = data.win_probability !== undefined ? data.win_probability * 100 : heroEq * 0.9;
      const heroTie = data.tie_probability !== undefined ? data.tie_probability * 100 : Math.max(0, 100 - heroEq - heroWin);

      setResult({
        hero: hero,
        villain: villain,
        heroEquity: Number(heroEq.toFixed(1)),
        villainEquity: Number(villainEq.toFixed(1)),
        heroWin: Number(heroWin.toFixed(1)),
        heroTie: Number(heroTie.toFixed(1)),
        villainWin: Number(villainEq.toFixed(1)),
        villainTie: Number(heroTie.toFixed(1)),
        totalCombos: data.total_combos || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation failed");
    } finally {
      setIsLoading(false);
    }
  }, [heroInput, villainInput, boardInput, heroHands, villainHands, isInputValid]);

  // Auto-calculate on first render
  useEffect(() => {
    handleCalculate();
  }, []);

  // Chart data
  const chartResults: EquityEntry[] = useMemo(() => {
    if (!result) return [];
    return [{
      hand: `${result.hero} vs ${result.villain}`,
      heroEquity: result.heroEquity,
      heroWin: result.heroWin,
      heroTie: result.heroTie,
      villainEquity: result.villainEquity,
      villainWin: result.villainWin,
      villainTie: result.villainTie,
    }];
  }, [result]);

  // Stats
  const stats = useMemo(() => [
    { label: `${result?.hero || "HERO"} EQUITY`, value: result ? `${result.heroEquity}%` : "-", color: "var(--green)" },
    { label: `${result?.villain || "VILLAIN"} EQUITY`, value: result ? `${result.villainEquity}%` : "-", color: "var(--text)" },
    { label: "WINS", value: result ? `${result.heroWin}% / ${result.villainWin}%` : "-", color: "var(--text)" },
    { label: "TIES", value: result ? `${result.heroTie}%` : "-", color: "var(--muted)" },
  ], [result]);

  // Derived board cards from input text
  const boardCards = useMemo(() => {
    const cleaned = boardInput.trim();
    if (!cleaned) return [];
    const cards: { rank: string; suit: string }[] = [];
    for (let i = 0; i < cleaned.length; i += 2) {
      const rank = cleaned[i];
      const suit = cleaned[i + 1] || "";
      if (rank && suit) {
        cards.push({ rank: rank.toUpperCase(), suit: formatSuitSymbol(suit.toLowerCase()) });
      }
    }
    return cards;
  }, [boardInput]);

  return (
    <div className="flex" style={{ backgroundColor: "var(--bg)", color: "var(--text)", minHeight: "calc(100vh - 52px)" }}>
      {/* Left Sidebar */}
      <GameSettingsSidebar />

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        <h1 className="text-lg font-bold sr-only">Equity Calculator</h1>

        {/* Input Section */}
        <div className="rounded-lg p-4 space-y-3" style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Hero Hands */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                Hero Range
              </label>
              <input
                type="text"
                value={heroInput}
                onChange={(e) => setHeroInput(e.target.value)}
                placeholder="e.g. AA, KK, AKs"
                className="w-full px-3 py-2 rounded text-sm font-mono focus:outline-none"
                style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              {heroHands.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {heroHands.slice(0, 6).map((h) => (
                    <span key={h} className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: "var(--border)", color: "var(--muted)" }}>
                      {h}
                    </span>
                  ))}
                  {heroHands.length > 6 && (
                    <span className="text-[10px] text-gray-500">+{heroHands.length - 6} more</span>
                  )}
                </div>
              )}
            </div>

            {/* Villain Hands */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                Villain Range
              </label>
              <input
                type="text"
                value={villainInput}
                onChange={(e) => setVillainInput(e.target.value)}
                placeholder="e.g. QQ, AK, JJ"
                className="w-full px-3 py-2 rounded text-sm font-mono focus:outline-none"
                style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              {villainHands.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {villainHands.slice(0, 6).map((h) => (
                    <span key={h} className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: "var(--border)", color: "var(--muted)" }}>
                      {h}
                    </span>
                  ))}
                  {villainHands.length > 6 && (
                    <span className="text-[10px] text-gray-500">+{villainHands.length - 6} more</span>
                  )}
                </div>
              )}
            </div>

            {/* Board + Calculate */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                Board (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={boardInput}
                  onChange={(e) => setBoardInput(e.target.value)}
                  placeholder="e.g. AhKdQc"
                  className="flex-1 px-3 py-2 rounded text-sm font-mono focus:outline-none"
                  style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
                <button
                  onClick={handleCalculate}
                  disabled={!isInputValid || isLoading}
                  className="px-5 py-2 rounded font-semibold text-sm transition-all disabled:opacity-50"
                  style={{ backgroundColor: "var(--green)", color: "#000" }}
                >
                  {isLoading ? "..." : "Calculate"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Board Display */}
        {boardCards.length > 0 && (
          <div className="flex items-center gap-4 rounded-lg px-4 py-3" style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mr-1">
                {boardCards.length === 3 ? "FLOP" : boardCards.length === 4 ? "TURN" : boardCards.length === 5 ? "RIVER" : "BOARD"}
              </span>
              <span className="text-xs text-gray-500">|</span>
              <span className="text-xs text-gray-400">Stack</span>
              <span className="text-sm font-bold text-white ml-1">5.5</span>
            </div>
            <div className="flex items-center gap-2">
              {boardCards.map((card, i) => (
                <BoardCardView key={i} rank={card.rank} suit={card.suit} />
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", color: "#ef4444" }}>
            {error}
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-lg p-3" style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}>
                  <div className="text-lg font-bold font-mono" style={{ color: stat.color }}>
                    {stat.value}
                  </div>
                  <div className="text-[10px] font-medium uppercase tracking-wider mt-0.5" style={{ color: "var(--muted)" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Equity Chart — shows hero/villain equity with win/tie breakdown */}
            <div className="rounded-lg p-4" style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
                Equity Breakdown
              </h3>
              <EquityChart data={chartResults} heroLabel={result.hero} villainLabel={result.villain} />
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !result && (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm" style={{ color: "var(--muted)" }}>Calculating equity...</div>
          </div>
        )}

        {/* Empty State */}
        {!result && !isLoading && !error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-4xl mb-3">📊</div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>
                Enter hands and click Calculate to see equity results
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
