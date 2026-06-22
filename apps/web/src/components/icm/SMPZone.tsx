"use client";

import { cn } from "@/lib/utils";

interface SMPZoneData {
  player: string;
  stackSize: number;
  zone: "comfortable" | "caution" | "danger";
}

interface SMPZoneProps {
  zoneData?: SMPZoneData[];
  averageStack?: number;
  className?: string;
}

function getZoneColor(zone: string): { bg: string; border: string; text: string; label: string } {
  switch (zone) {
    case "comfortable":
      return {
        bg: "bg-green-500/10",
        border: "border-green-500/30",
        text: "text-green-400",
        label: "Comfortable",
      };
    case "caution":
      return {
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/30",
        text: "text-yellow-400",
        label: "Caution",
      };
    case "danger":
      return {
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        text: "text-red-400",
        label: "Danger",
      };
    default:
      return {
        bg: "bg-gray-500/10",
        border: "border-gray-500/30",
        text: "text-gray-400",
        label: "Unknown",
      };
  }
}

function getZoneStrategy(zone: string): string {
  switch (zone) {
    case "comfortable":
      return "Can play aggressively. Pressure opponents, especially short stacks.";
    case "caution":
      return "Balance between protecting equity and extracting value. Avoid risky confrontations.";
    case "danger":
      return "Play extremely tight. Look for spots to double up. Prioritize survival over chip accumulation.";
    default:
      return "";
  }
}

function calculateZone(stackSize: number, averageStack: number): "comfortable" | "caution" | "danger" {
  const ratio = stackSize / averageStack;
  if (ratio >= 1.2) return "comfortable";
  if (ratio >= 0.6) return "caution";
  return "danger";
}

const MOCK_ZONE_DATA: SMPZoneData[] = [
  { player: "Big Stack", stackSize: 3000, zone: "comfortable" },
  { player: "Mid Stack 1", stackSize: 1500, zone: "caution" },
  { player: "Mid Stack 2", stackSize: 1200, zone: "caution" },
  { player: "Short Stack", stackSize: 600, zone: "danger" },
  { player: "Micro Stack", stackSize: 400, zone: "danger" },
];

export function SMPZone({ zoneData, averageStack = 1333, className }: SMPZoneProps) {
  // Calculate zones based on stack sizes if not provided
  const data = zoneData && zoneData.length > 0
    ? zoneData
    : MOCK_ZONE_DATA.map((d) => ({
        ...d,
        zone: calculateZone(d.stackSize, averageStack),
      }));

  const sortedByStack = [...data].sort((a, b) => b.stackSize - a.stackSize);

  // Calculate distribution stats
  const totalChips = data.reduce((sum, d) => sum + d.stackSize, 0);
  const playersInDanger = data.filter((d) => d.zone === "danger").length;
  const playersInComfort = data.filter((d) => d.zone === "comfortable").length;

  return (
    <div className={cn("border border-[var(--border)] rounded-lg p-4 bg-[var(--panel)]", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--green)]">SMP Zone Analysis</h3>
        <div className="text-xs text-[var(--muted)]">Stack Management Zones</div>
      </div>

      {/* Zone Legend */}
      <div className="flex items-center gap-4 mb-4 pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[var(--green)]" />
          <span className="text-xs text-[var(--green)]">Comfortable (≥1.2x avg)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-xs text-yellow-400">Caution (0.6-1.2x avg)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[var(--red)]" />
          <span className="text-xs text-[var(--red-bright)]">Danger (&lt;0.6x avg)</span>
        </div>
      </div>

      {/* Player Zones */}
      <div className="space-y-2">
        {sortedByStack.map((player) => {
          const zoneStyle = getZoneColor(player.zone);
          const strategy = getZoneStrategy(player.zone);

          return (
            <div
              key={player.player}
              className={cn(
                "p-3 rounded-lg border",
                zoneStyle.bg,
                zoneStyle.border
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text)]">{player.player}</span>
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded", zoneStyle.text)}>
                    {zoneStyle.label}
                  </span>
                </div>
                <span className="text-sm font-mono text-[var(--muted)]">
                  {player.stackSize.toLocaleString()} chips
                </span>
              </div>

              <div className="text-xs text-[var(--muted)] leading-relaxed">
                <span className="font-medium text-[var(--text)]">Strategy: </span>
                {strategy}
              </div>

              {/* Stack bar visualization */}
              <div className="mt-2 h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", zoneStyle.text.replace("text-", "bg-"))}
                  style={{ width: `${Math.min((player.stackSize / sortedByStack[0].stackSize) * 100, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-[var(--border)]">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 rounded bg-[var(--green)]/10 border border-[var(--green)]/20">
            <div className="text-lg font-bold text-[var(--green)]">{playersInComfort}</div>
            <div className="text-xs text-[var(--muted)]">Comfortable</div>
          </div>
          <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
            <div className="text-lg font-bold text-yellow-400">
              {data.length - playersInComfort - playersInDanger}
            </div>
            <div className="text-xs text-[var(--muted)]">Caution</div>
          </div>
          <div className="p-2 rounded bg-[var(--red)]/10 border border-[var(--red)]/20">
            <div className="text-lg font-bold text-[var(--red-bright)]">{playersInDanger}</div>
            <div className="text-xs text-[var(--muted)]">Danger</div>
          </div>
        </div>

        <div className="mt-3 text-xs text-[var(--muted)] text-center">
          Average stack: {averageStack.toLocaleString()} chips | Total chips: {totalChips.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export default SMPZone;