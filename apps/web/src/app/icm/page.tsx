"use client";

import { useState, useEffect, useCallback } from "react";
import { PrizePoolPanel } from "@/components/icm/PrizePoolPanel";
import { ChipStackPanel } from "@/components/icm/ChipStackPanel";
import { BubblePressure } from "@/components/icm/BubblePressure";
import { SMPZone } from "@/components/icm/SMPZone";
import { useICMCalculator } from "@/hooks/useICMCalculator";
import dynamic from "next/dynamic";

// Dynamic import for heavy ICMResults component (uses Recharts)
const ICMResults = dynamic(
  () => import("@/components/icm/ICMResults").then((mod) => mod.ICMResults),
  {
    loading: () => (
      <div className="border border-[var(--border)] rounded-lg p-6 sm:p-8 bg-[var(--panel)] flex items-center justify-center min-h-[16rem]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--green)] border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-[var(--muted)] text-sm">Loading chart...</div>
        </div>
      </div>
    ),
    ssr: false,
  }
);

interface PrizePoolEntry {
  place: number;
  percentage: number;
}

interface PlayerStack {
  id: string;
  name: string;
  chips: number;
}

export default function ICMPage() {
  const [prizes, setPrizes] = useState<PrizePoolEntry[]>([
    { place: 1, percentage: 50 },
    { place: 2, percentage: 30 },
    { place: 3, percentage: 20 },
  ]);

  const [players, setPlayers] = useState<PlayerStack[]>([
    { id: "1", name: "Big Stack", chips: 3000 },
    { id: "2", name: "Mid Stack", chips: 1500 },
    { id: "3", name: "Short Stack", chips: 800 },
    { id: "4", name: "Micro Stack", chips: 500 },
  ]);

  const [totalPrize, setTotalPrize] = useState<number>(1000);
  const [totalChips, setTotalChips] = useState<number>(5800);

  const { calculateICM, results, totalPrizePool, totalChips: apiTotalChips, loading, error, clearError } = useICMCalculator();

  const performCalculation = useCallback(async () => {
    const stacks = players.map((p) => p.chips);
    const prizesList = prizes.map((p) => (p.percentage / 100) * totalPrize);
    const playersList = players.map((p) => p.name);

    await calculateICM({
      stacks,
      prizes: prizesList,
      players: playersList,
      n_simulations: 100000,
    });
  }, [players, prizes, totalPrize, calculateICM]);

  const handleCalculate = useCallback(async () => {
    clearError();
    await performCalculation();
  }, [clearError, performCalculation]);

  // Auto-calculate on initial load
  useEffect(() => {
    performCalculation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const playerChips = players.map((p) => ({ name: p.name, chips: p.chips }));

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="px-4 py-4 sm:px-6 sm:py-6 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-[var(--green)]">ICM Calculator</h1>
            <p className="text-sm sm:text-base text-[var(--muted)]">
              Calculate Independent Chip Model values for tournament situations
            </p>
          </div>

          {/* Quick Settings - Mobile responsive */}
          <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-3 sm:items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm text-[var(--muted)] whitespace-nowrap">Buy-in:</label>
              <input
                type="number"
                value={totalPrize}
                onChange={(e) => setTotalPrize(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 sm:w-28 px-2 sm:px-3 py-1.5 bg-[var(--panel)] border border-[var(--border)] rounded text-sm text-center text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm text-[var(--muted)] whitespace-nowrap">Total Chips:</label>
              <input
                type="number"
                value={totalChips}
                onChange={(e) => setTotalChips(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 sm:w-28 px-2 sm:px-3 py-1.5 bg-[var(--panel)] border border-[var(--border)] rounded text-sm text-center text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/50"
              />
            </div>
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-1.5 bg-[var(--green)] text-black font-semibold rounded text-sm hover:opacity-90 transition-opacity disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--green)]/50"
            >
              {loading ? "Calculating..." : "Calculate"}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 border border-[var(--red-dark)] rounded bg-[var(--red)]/10 text-[var(--red-bright)]">
              <div className="flex items-center justify-between">
                <span className="text-sm">{error}</span>
                <button
                  onClick={clearError}
                  className="text-sm hover:opacity-80 ml-2"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Main Grid Layout - Tablet/Mobile responsive column count */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {/* Prize Pool Panel */}
            <div className="md:col-span-1 xl:col-span-1">
              <PrizePoolPanel
                prizes={prizes}
                onPrizesChange={setPrizes}
                totalPrize={totalPrize}
              />
            </div>

            {/* Chip Stacks Panel */}
            <div className="md:col-span-1 xl:col-span-1">
              <ChipStackPanel
                players={players}
                onPlayersChange={setPlayers}
                totalChips={totalChips}
              />
            </div>

            {/* Bubble Pressure Panel */}
            <div className="md:col-span-1 xl:col-span-1">
              <BubblePressure
                bubbleData={results?.map((r) => ({
                  player: r.player,
                  bubbleFactor: r.bubble_factor,
                  chips: playerChips.find((pc) => pc.name === r.player)?.chips ?? 0,
                }))}
              />
            </div>

            {/* SMP Zone Panel */}
            <div className="md:col-span-1 xl:col-span-1">
              <SMPZone
                zoneData={playerChips.map((pc, index) => ({
                  player: pc.name,
                  stackSize: pc.chips,
                  zone: "caution" as const,
                }))}
                averageStack={totalChips / players.length}
              />
            </div>

            {/* Results Panel - Hidden on mobile when loading */}
            <div className="md:col-span-2 xl:col-span-1 hidden md:block">
              {loading ? (
                <div className="border border-[var(--border)] rounded-lg p-6 sm:p-8 bg-[var(--panel)] flex items-center justify-center min-h-[16rem]">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-[var(--green)] border-t-transparent rounded-full mx-auto mb-4" />
                    <div className="text-[var(--muted)] text-sm">Calculating ICM...</div>
                  </div>
                </div>
              ) : (
                <ICMResults
                  results={results ?? undefined}
                  playerChips={playerChips}
                  prizes={prizes}
                  totalPrizePool={totalPrizePool ?? totalPrize}
                />
              )}
            </div>
          </div>

          {/* Mobile-Only Results */}
          <div className="mt-4 md:hidden">
            {loading ? (
              <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--panel)] flex items-center justify-center min-h-[16rem]">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-[var(--green)] border-t-transparent rounded-full mx-auto mb-4" />
                  <div className="text-[var(--muted)] text-sm">Calculating ICM...</div>
                </div>
              </div>
            ) : (
              <ICMResults
                results={results ?? undefined}
                playerChips={playerChips}
                prizes={prizes}
                totalPrizePool={totalPrizePool ?? totalPrize}
              />
            )}
          </div>

          {/* Full Width Results for larger screens */}
          <div className="mt-6 sm:mt-8 hidden md:block">
            {loading ? (
              <div className="border border-[var(--border)] rounded-lg p-6 sm:p-8 bg-[var(--panel)] flex items-center justify-center min-h-[16rem]">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-[var(--green)] border-t-transparent rounded-full mx-auto mb-4" />
                  <div className="text-[var(--muted)] text-sm">Calculating ICM...</div>
                </div>
              </div>
            ) : (
              <ICMResults
                results={results ?? undefined}
                playerChips={playerChips}
                prizes={prizes}
                totalPrizePool={totalPrizePool ?? totalPrize}
                className="w-full"
              />
            )}
          </div>

          {/* Info Section */}
          <div className="mt-8 sm:mt-12 p-4 sm:p-6 border border-[var(--border)] rounded-lg bg-[var(--panel)]/50">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 text-[var(--green)]">About ICM</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-sm text-[var(--muted)]">
              <div>
                <h3 className="font-medium text-[var(--text)] mb-2">What is ICM?</h3>
                <p className="text-xs sm:text-sm">
                  The Independent Chip Model (ICM) is a mathematical model used in poker 
                  tournaments to calculate the equity of a player's stack based on 
                  their probability of finishing in each prize position.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-[var(--text)] mb-2">Why use ICM?</h3>
                <p className="text-xs sm:text-sm">
                  ICM helps players make better decisions in tournament situations by 
                  converting chip stacks into real money expected value. This is crucial 
                  for freezeouts and when prizepools are top-heavy.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-[var(--text)] mb-2">Bubble Factors</h3>
                <p className="text-xs sm:text-sm">
                  The bubble factor measures how much more valuable each chip becomes 
                  as the tournament progresses. A high bubble factor means saving chips 
                  is more important than accumulating them.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-[var(--text)] mb-2">Practical Applications</h3>
                <p className="text-xs sm:text-sm">
                  Use ICM calculations to determine optimal push/fold ranges, 
                  understand calling conventions, and make better bubble play decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
