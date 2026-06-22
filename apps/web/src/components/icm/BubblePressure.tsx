"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface BubbleData {
  player: string;
  bubbleFactor: number;
  chips: number;
}

// Color scale based on bubble factor
function getBubbleColor(bubbleFactor: number): string {
  if (bubbleFactor < 1.2) return "bg-green-500";
  if (bubbleFactor < 1.5) return "bg-yellow-500";
  return "bg-red-500";
}

function getBubbleLabel(bubbleFactor: number): string {
  if (bubbleFactor < 1.2) return "Low Pressure";
  if (bubbleFactor < 1.5) return "Medium Pressure";
  return "High Pressure";
}

function getBubbleAdvice(bubbleFactor: number): string {
  if (bubbleFactor < 1.2) {
    return "Play normal ranges. Chips are relatively safe.";
  }
  if (bubbleFactor < 1.5) {
    return "Consider tightening slightly, especially near bubble.";
  }
  return "Play very tight. Each chip is extremely valuable.";
}

export interface BubblePressureProps {
  bubbleData?: BubbleData[];
  className?: string;
}

const MOCK_BUBBLE_DATA: BubbleData[] = [
  { player: "Big Stack", bubbleFactor: 1.1, chips: 3000 },
  { player: "Mid Stack", bubbleFactor: 1.3, chips: 1500 },
  { player: "Short Stack", bubbleFactor: 1.8, chips: 800 },
  { player: "Micro Stack", bubbleFactor: 2.2, chips: 500 },
];

export function BubblePressure({ bubbleData, className }: BubblePressureProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const data = bubbleData && bubbleData.length > 0 ? bubbleData : MOCK_BUBBLE_DATA;

  const maxBubble = Math.max(...data.map((d) => d.bubbleFactor));
  const sortedByBubble = [...data].sort((a, b) => b.bubbleFactor - a.bubbleFactor);

  return (
    <div className={cn("border border-[var(--border)] rounded-lg p-4 bg-[var(--panel)]", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--green)]">Bubble Pressure</h3>
        <div className="text-xs text-[var(--muted)]">ICM Pressure Analysis</div>
      </div>

      <div className="space-y-3">
        {sortedByBubble.map((player) => {
          const barWidth = (player.bubbleFactor / maxBubble) * 100;
          const colorClass = getBubbleColor(player.bubbleFactor);
          const label = getBubbleLabel(player.bubbleFactor);
          const advice = getBubbleAdvice(player.bubbleFactor);

          return (
            <div
              key={player.player}
              className="relative"
              onMouseEnter={() => setShowTooltip(player.player)}
              onMouseLeave={() => setShowTooltip(null)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text)]">{player.player}</span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      player.bubbleFactor < 1.2
                        ? "bg-[var(--green)]/20 text-[var(--green)]"
                        : player.bubbleFactor < 1.5
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-[var(--red)]/20 text-[var(--red-bright)]"
                    )}
                  >
                    {label}
                  </span>
                </div>
                <span className="text-sm font-mono text-[var(--muted)]">
                  {player.bubbleFactor.toFixed(2)}x
                </span>
              </div>

              <div className="h-3 bg-[var(--bg)] rounded-full overflow-hidden">
                <div
                  className={cn("h-full transition-all rounded-full", colorClass)}
                  style={{ width: `${Math.min(barWidth, 100)}%` }}
                />
              </div>

              {/* Tooltip */}
              {showTooltip === player.player && (
                <div className="absolute z-10 left-0 right-0 mt-2 p-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg shadow-lg">
                  <div className="text-xs text-[var(--muted)] mb-1">Strategy Advice</div>
                  <div className="text-sm text-[var(--text)]">{advice}</div>
                  <div className="mt-2 text-xs text-[var(--muted)]">
                    Stack: {player.chips.toLocaleString()} chips
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>Low bubble factor = normal play</span>
          <span>High bubble factor = tight ranges</span>
        </div>
      </div>
    </div>
  );
}

export default BubblePressure;