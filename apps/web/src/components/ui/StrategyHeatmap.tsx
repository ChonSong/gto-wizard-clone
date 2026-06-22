"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { cn, RANKS, getHand, getHandIndex } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type Street = "preflop" | "flop" | "turn" | "river";

export type ActionType =
  | "push_fold"      // All-in or fold (short stack situations)
  | "bet_call_check" // Bet, call, or check (standard action)
  | "raise_call_fold" // Raise, call, or fold
  | "bet_raise_call_check"; // Full action spectrum

export type ViewMode = "frequency" | "ev" | "mixed";

export interface StrategyCell {
  action: string;
  frequency: number;
  ev: number;
}

export interface StrategyHeatmapProps {
  /** Strategy data keyed by hand string (e.g., "AKs", "TT", "72o") */
  strategy: Record<string, StrategyCell>;
  /** Board cards as concatenated string (e.g., "AhKs2d") */
  boardCards?: string;
  /** Position label (e.g., "BTN", "SB", "BB") */
  position?: string;
  /** Current player identifier */
  currentPlayer?: string;
  /** Type of actions to display */
  actionType?: ActionType;
  /** Street indicator */
  street?: Street;
  /** Custom className */
  className?: string;
  /** Callback when a cell is clicked */
  onCellClick?: (hand: string, data: StrategyCell | undefined) => void;
  /** Whether to show EV values instead of frequencies */
  showEv?: boolean;
  /** Whether to show frequency percentages */
  showFrequency?: boolean;
  /** Comparison strategy to overlay */
  comparisonStrategy?: Record<string, StrategyCell>;
  /** API endpoint for fetching strategy data */
  apiEndpoint?: string;
  /** Available stack depths for lookup */
  availableStackDepths?: number[];
}

interface StrategyLookupParams {
  board: string;
  stackDepth: number;
  position: string;
  street: Street;
  actionType: ActionType;
}

// ============================================================================
// Constants
// ============================================================================

const ACTION_COLORS: Record<string, { bg: string; bgHover: string; text: string; border: string }> = {
  // Push/Fold actions
  push: {
    bg: "bg-emerald-500",
    bgHover: "hover:bg-emerald-600",
    text: "text-emerald-100",
    border: "border-emerald-600",
  },
  fold: {
    bg: "bg-red-600",
    bgHover: "hover:bg-red-700",
    text: "text-red-100",
    border: "border-red-700",
  },
  // Standard actions
  raise: {
    bg: "bg-green-500",
    bgHover: "hover:bg-green-600",
    text: "text-green-100",
    border: "border-green-600",
  },
  call: {
    bg: "bg-yellow-500",
    bgHover: "hover:bg-yellow-600",
    text: "text-yellow-100",
    border: "border-yellow-600",
  },
  check: {
    bg: "bg-blue-500",
    bgHover: "hover:bg-blue-600",
    text: "text-blue-100",
    border: "border-blue-600",
  },
  // Bet actions (sizing-dependent)
  bet_small: {
    bg: "bg-cyan-500",
    bgHover: "hover:bg-cyan-600",
    text: "text-cyan-100",
    border: "border-cyan-600",
  },
  bet_medium: {
    bg: "bg-teal-500",
    bgHover: "hover:bg-teal-600",
    text: "text-teal-100",
    border: "border-teal-600",
  },
  bet_large: {
    bg: "bg-emerald-600",
    bgHover: "hover:bg-emerald-700",
    text: "text-emerald-100",
    border: "border-emerald-700",
  },
  // Default
  default: {
    bg: "bg-gray-600",
    bgHover: "hover:bg-gray-500",
    text: "text-gray-200",
    border: "border-gray-500",
  },
};

const ACTION_TYPE_CONFIG: Record<ActionType, { actions: string[]; labels: Record<string, string> }> = {
  push_fold: {
    actions: ["push", "fold"],
    labels: { push: "Push", fold: "Fold" },
  },
  bet_call_check: {
    actions: ["bet", "call", "check"],
    labels: { bet: "Bet", call: "Call", check: "Check" },
  },
  raise_call_fold: {
    actions: ["raise", "call", "fold"],
    labels: { raise: "Raise", call: "Call", fold: "Fold" },
  },
  bet_raise_call_check: {
    actions: ["bet", "raise", "call", "check"],
    labels: { bet: "Bet", raise: "Raise", call: "Call", check: "Check" },
  },
};

const STREET_LABELS: Record<Street, string> = {
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
};

const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  push_fold: "Push/Fold",
  bet_call_check: "Bet/Call/Check",
  raise_call_fold: "Raise/Call/Fold",
  bet_raise_call_check: "Bet/Raise/Call/Check",
};

// ============================================================================
// Helper Functions
// ============================================================================

function parseBoard(boardString: string): { flop: string[]; turn: string | null; river: string | null } {
  const cards: string[] = [];
  for (let i = 0; i < boardString.length - 1; i += 2) {
    cards.push(boardString.slice(i, i + 2));
  }
  return {
    flop: cards.slice(0, 3),
    turn: cards[3] || null,
    river: cards[4] || null,
  };
}

function getActionColor(action: string): typeof ACTION_COLORS["default"] {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes("push") || lowerAction.includes("allin")) return ACTION_COLORS.push;
  if (lowerAction.includes("bet_small")) return ACTION_COLORS.bet_small;
  if (lowerAction.includes("bet_medium")) return ACTION_COLORS.bet_medium;
  if (lowerAction.includes("bet_large")) return ACTION_COLORS.bet_large;
  if (lowerAction.includes("bet")) return ACTION_COLORS.bet_medium;
  if (lowerAction.includes("raise")) return ACTION_COLORS.raise;
  if (lowerAction.includes("call")) return ACTION_COLORS.call;
  if (lowerAction.includes("check")) return ACTION_COLORS.check;
  if (lowerAction.includes("fold")) return ACTION_COLORS.fold;
  return ACTION_COLORS.default;
}

function exportToCSV(
  strategy: Record<string, StrategyCell>,
  comparisonStrategy: Record<string, StrategyCell> | undefined,
  boardCards: string | undefined,
  position: string | undefined
): void {
  const headers = ["Hand", "Action", "Frequency", "EV"];
  if (comparisonStrategy) {
    headers.push("Comparison Action", "Comparison Frequency", "Comparison EV");
  }
  
  const rows: string[][] = [headers];
  
  // Sort hands in poker order (pairs first, then suited, then offsuit)
  const handOrder = (a: string, b: string): number => {
    const aIsPair = a[0] === a[1];
    const bIsPair = b[0] === b[1];
    if (aIsPair && !bIsPair) return -1;
    if (!aIsPair && bIsPair) return 1;
    
    const rankOrder = "23456789TJQKA";
    const aRank = rankOrder.indexOf(a[0]);
    const bRank = rankOrder.indexOf(b[0]);
    if (aRank !== bRank) return bRank - aRank;
    
    const aSuited = a.endsWith("s");
    const bSuited = b.endsWith("s");
    if (aSuited && !bSuited) return -1;
    if (!aSuited && bSuited) return 1;
    
    return 0;
  };
  
  const hands = Object.keys(strategy).sort(handOrder);
  
  for (const hand of hands) {
    const data = strategy[hand];
    const row = [
      hand,
      data.action,
      (data.frequency * 100).toFixed(1) + "%",
      data.ev.toFixed(4),
    ];
    
    if (comparisonStrategy && comparisonStrategy[hand]) {
      const compData = comparisonStrategy[hand];
      row.push(compData.action, (compData.frequency * 100).toFixed(1) + "%", compData.ev.toFixed(4));
    }
    
    rows.push(row);
  }
  
  const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `strategy_${boardCards || "unknown"}_${position || "unknown"}_${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Components
// ============================================================================

interface LegendProps {
  actionType: ActionType;
  showEv: boolean;
}

function Legend({ actionType, showEv }: LegendProps) {
  const config = ACTION_TYPE_CONFIG[actionType];
  
  return (
    <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
      <span className="text-muted-foreground font-medium mr-1">
        {showEv ? "EV" : "Action"}:
      </span>
      {config.actions.map((action) => {
        const color = getActionColor(action);
        return (
          <div key={action} className="flex items-center gap-1.5">
            <div
              className={cn(
                "w-4 h-4 rounded border shadow-sm",
                color.bg,
                color.border
              )}
            />
            <span className="text-muted-foreground">
              {config.labels[action]}
            </span>
          </div>
        );
      })}
      <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border">
        <div className="w-4 h-4 rounded bg-gray-800 opacity-50" />
        <span className="text-muted-foreground">No data</span>
      </div>
    </div>
  );
}

interface StreetIndicatorProps {
  street: Street;
  boardCards?: string;
}

function StreetIndicator({ street, boardCards }: StreetIndicatorProps) {
  const board = boardCards ? parseBoard(boardCards) : null;
  
  return (
    <div className="flex items-center gap-3 mb-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Street:</span>
        <span className="font-semibold text-foreground bg-primary/10 px-2 py-0.5 rounded">
          {STREET_LABELS[street]}
        </span>
      </div>
      {boardCards && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Board:</span>
          <span className="font-mono">
            {board?.flop && (
              <span className="inline-flex gap-0.5">
                {board.flop.map((card, i) => (
                  <span key={i} className="inline-block px-1.5 py-0.5 bg-secondary rounded text-xs">
                    {card}
                  </span>
                ))}
                {board.turn && (
                  <span className="inline-block px-1.5 py-0.5 bg-secondary rounded text-xs ml-1">
                    {board.turn}
                  </span>
                )}
                {board.river && (
                  <span className="inline-block px-1.5 py-0.5 bg-secondary rounded text-xs ml-1">
                    {board.river}
                  </span>
                )}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

interface HeatmapCellProps {
  hand: string;
  data: StrategyCell | undefined;
  comparisonData?: StrategyCell | undefined;
  showEv: boolean;
  viewMode: ViewMode;
  isComparisonMode: boolean;
  onCellClick?: (hand: string, data: StrategyCell | undefined) => void;
  onKeyDown?: (e: React.KeyboardEvent, hand: string) => void;
  isFocused?: boolean;
  tabIndex?: number;
}

function HeatmapCell({ 
  hand, 
  data, 
  comparisonData, 
  showEv, 
  viewMode, 
  isComparisonMode,
  onCellClick,
  onKeyDown,
  isFocused,
  tabIndex
}: HeatmapCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const color = data ? getActionColor(data.action) : ACTION_COLORS.default;
  const opacity = data ? 0.3 + data.frequency * 0.7 : 0.3;
  
  // Determine if actions differ in comparison mode
  const actionsDiffer = isComparisonMode && comparisonData && data && comparisonData.action !== data.action;
  
  const displayValue = useMemo(() => {
    if (!data) return "-";
    if (showEv || viewMode === "ev") {
      return data.ev >= 0 ? `+${data.ev.toFixed(2)}` : data.ev.toFixed(2);
    }
    if (viewMode === "mixed") {
      const freq = (data.frequency * 100).toFixed(0);
      const ev = data.ev >= 0 ? `+${data.ev.toFixed(1)}` : data.ev.toFixed(1);
      return `${freq}%•${ev}`;
    }
    return `${(data.frequency * 100).toFixed(0)}`;
  }, [data, showEv, viewMode]);
  
  return (
    <div
      className={cn(
        "w-8 h-8 rounded text-[10px] font-medium cursor-pointer transition-all flex items-center justify-center",
        color.bg,
        color.bgHover,
        data ? color.border : "border-gray-700",
        isHovered && data ? "ring-2 ring-white ring-offset-1 ring-offset-background z-10" : "",
        isFocused ? "ring-2 ring-poker-gold ring-offset-1 ring-offset-background z-20" : "",
        actionsDiffer ? "ring-1 ring-yellow-400" : ""
      )}
      style={{ opacity }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onCellClick?.(hand, data)}
      onKeyDown={(e) => onKeyDown?.(e, hand)}
      tabIndex={tabIndex}
      role="gridcell"
      aria-label={hand}
      data-hand={hand}
    >
      <span className={cn("truncate", color.text)}>
        {displayValue}
      </span>
      {isComparisonMode && comparisonData && data && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            "w-2 h-2 rounded-full",
            data.action === comparisonData.action ? "bg-green-500" : "bg-yellow-500"
          )} />
        </span>
      )}
    </div>
  );
}

interface TooltipData {
  hand: string;
  data: StrategyCell;
  comparisonData?: StrategyCell;
  x: number;
  y: number;
}

interface TooltipProps {
  tooltip: TooltipData | null;
  showEv: boolean;
  viewMode: ViewMode;
  street: Street;
  position?: string;
  isComparisonMode: boolean;
}

function Tooltip({ tooltip, showEv, viewMode, street, position, isComparisonMode }: TooltipProps) {
  if (!tooltip) return null;
  
  const { hand, data, comparisonData, x, y } = tooltip;
  
  // Parse hand to show rank info
  const handIndex = getHandIndex(hand);
  const isPair = handIndex?.row === handIndex?.col;
  const isSuited = hand.endsWith("s");
  const isOffsuit = hand.endsWith("o");
  const handType = isPair ? "Pocket Pair" : isSuited ? "Suited" : isOffsuit ? "Offsuit" : "Single";
  
  return (
    <div
      className="fixed z-50 px-3 py-2.5 text-xs bg-popover border border-border rounded-lg shadow-xl pointer-events-none animate-in fade-in-0 zoom-in-95 duration-100"
      style={{
        left: x,
        top: y - 10,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="font-bold text-base">{hand}</span>
        <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
          {handType}
        </span>
      </div>
      <div className="space-y-1.5 text-muted-foreground">
        <div className="flex items-center justify-between gap-3">
          <span>Action:</span>
          <span className={cn("font-semibold", getActionColor(data.action).text)}>
            {data.action.charAt(0).toUpperCase() + data.action.slice(1)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Frequency:</span>
          <span className="font-medium">{(data.frequency * 100).toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>EV:</span>
          <span className={cn("font-medium", data.ev >= 0 ? "text-green-500" : "text-red-500")}>
            {data.ev >= 0 ? "+" : ""}{data.ev.toFixed(4)}
          </span>
        </div>
      </div>
      
      {isComparisonMode && comparisonData && (
        <>
          <div className="mt-2 pt-2 border-t border-border">
            <div className="text-[10px] text-muted-foreground mb-1">Comparison Strategy</div>
            <div className="flex items-center justify-between gap-3">
              <span>Action:</span>
              <span className={cn("font-semibold", getActionColor(comparisonData.action).text)}>
                {comparisonData.action.charAt(0).toUpperCase() + comparisonData.action.slice(1)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Frequency:</span>
              <span className="font-medium">{(comparisonData.frequency * 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>EV:</span>
              <span className={cn("font-medium", comparisonData.ev >= 0 ? "text-green-500" : "text-red-500")}>
                {comparisonData.ev >= 0 ? "+" : ""}{comparisonData.ev.toFixed(4)}
              </span>
            </div>
            {data.action !== comparisonData.action && (
              <div className="mt-1 text-[10px] text-yellow-500 flex items-center gap-1">
                <span>⚠</span> Action differs
              </div>
            )}
          </div>
        </>
      )}
      
      <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground flex gap-3">
        <span>{STREET_LABELS[street]}</span>
        {position && <span>• {position}</span>}
      </div>
    </div>
  );
}

// API Hook for fetching strategy data
export function useStrategyApi(apiEndpoint?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchStrategy = useCallback(async (params: StrategyLookupParams): Promise<Record<string, StrategyCell> | null> => {
    if (!apiEndpoint) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        board: params.board,
        stack_depth: params.stackDepth.toString(),
        position: params.position,
        street: params.street,
      });
      
      const response = await fetch(`${apiEndpoint}?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.strategy || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch strategy");
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint]);
  
  return { fetchStrategy, loading, error };
}

// ============================================================================
// Main Component
// ============================================================================

export function StrategyHeatmap({
  strategy,
  boardCards,
  position,
  currentPlayer,
  actionType = "raise_call_fold",
  street = "preflop",
  className,
  onCellClick,
  showEv = false,
  showFrequency = true,
  comparisonStrategy,
  apiEndpoint,
  availableStackDepths,
}: StrategyHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(showEv ? "ev" : "frequency");
  const [currentActionType, setCurrentActionType] = useState<ActionType>(actionType);
  const [selectedStackDepth, setSelectedStackDepth] = useState<number>(100);
  const [isComparing, setIsComparing] = useState(false);
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  
  const { fetchStrategy, loading, error } = useStrategyApi(apiEndpoint);
  
  // Sync actionType prop with internal state
  useEffect(() => {
    setCurrentActionType(actionType);
  }, [actionType]);
  
  // Handle view mode changes
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);
  
  // Handle action type changes
  const handleActionTypeChange = useCallback((type: ActionType) => {
    setCurrentActionType(type);
  }, []);
  
  // Handle strategy lookup
  const handleLookupStrategy = useCallback(async () => {
    if (!apiEndpoint || !boardCards) return;
    
    const result = await fetchStrategy({
      board: boardCards,
      stackDepth: selectedStackDepth,
      position: position || "BTN",
      street,
      actionType: currentActionType,
    });
    
    if (result) {
      // This would typically update the strategy via a callback or state
      // For now, we just log it - parent should handle this via callback
      console.log("Fetched strategy:", result);
    }
  }, [apiEndpoint, boardCards, selectedStackDepth, position, street, currentActionType, fetchStrategy]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((
    e: React.KeyboardEvent,
    currentHand: string
  ) => {
    const currentIndex = RANKS.indexOf(currentHand[0] as typeof RANKS[number]);
    const currentRow = RANKS.findIndex(r => 
      RANKS.some((_, colIdx) => getHand(RANKS.indexOf(r), colIdx) === currentHand)
    );
    
    let nextHand: string | null = null;
    const row = Math.floor(currentIndex / 13);
    const col = currentIndex % 13;
    
    switch (e.key) {
      case "ArrowUp":
        if (row > 0) {
          nextHand = getHand(row - 1, col);
        }
        break;
      case "ArrowDown":
        if (row < 12) {
          nextHand = getHand(row + 1, col);
        }
        break;
      case "ArrowLeft":
        if (col > 0) {
          nextHand = getHand(row, col - 1);
        }
        break;
      case "ArrowRight":
        if (col < 12) {
          nextHand = getHand(row, col + 1);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        const cellData = strategy[currentHand];
        onCellClick?.(currentHand, cellData);
        break;
      case "Escape":
        setFocusedCell(null);
        break;
    }
    
    if (nextHand) {
      e.preventDefault();
      setFocusedCell(nextHand);
      
      // Focus the next cell
      const nextCell = gridRef.current?.querySelector(`[data-hand="${nextHand}"]`) as HTMLElement;
      nextCell?.focus();
    }
  }, [strategy, onCellClick]);
  
  // Handle cell mouse enter for tooltip
  const handleCellMouseEnter = useCallback((
    e: React.MouseEvent<HTMLDivElement>,
    hand: string,
    data: StrategyCell | undefined
  ) => {
    if (data) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({
        hand,
        data,
        comparisonData: isComparing ? comparisonStrategy?.[hand] : undefined,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
  }, [isComparing, comparisonStrategy]);
  
  const handleCellMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);
  
  // Calculate summary stats
  const stats = useMemo(() => {
    const entries = Object.values(strategy);
    if (entries.length === 0) return null;
    
    // Filter out null/undefined/NaN entries to prevent NaN in averages
    const validFreq = entries.filter(
      (e): e is StrategyCell => e != null && typeof e.frequency === 'number' && !isNaN(e.frequency) && isFinite(e.frequency)
    );
    const validEv = entries.filter(
      (e): e is StrategyCell => e != null && typeof e.ev === 'number' && !isNaN(e.ev) && isFinite(e.ev)
    );
    
    const totalFrequency = validFreq.length > 0
      ? validFreq.reduce((sum, e) => sum + e.frequency, 0) / validFreq.length
      : null;
    const avgEv = validEv.length > 0
      ? validEv.reduce((sum, e) => sum + e.ev, 0) / validEv.length
      : null;
    const actionCounts = entries.reduce((acc, e) => {
      if (e && e.action) acc[e.action] = (acc[e.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return { totalFrequency, avgEv, actionCounts };
  }, [strategy]);
  
  // Toggle comparison mode
  const toggleComparison = useCallback(() => {
    setIsComparing(prev => !prev);
  }, []);
  
  return (
    <div className={cn("relative", className)}>
      {/* Header Controls */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex flex-col gap-2">
          <StreetIndicator street={street} boardCards={boardCards} />
          <Legend actionType={currentActionType} showEv={viewMode === "ev"} />
          
          {/* Action Type Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Action Type:</label>
            <select
              value={currentActionType}
              onChange={(e) => handleActionTypeChange(e.target.value as ActionType)}
              className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white"
            >
              {Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Controls Section */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-800/50 rounded p-0.5">
            <button
              onClick={() => handleViewModeChange("frequency")}
              className={cn(
                "px-2 py-1 rounded text-xs transition-colors",
                viewMode === "frequency"
                  ? "bg-poker-gold text-black font-medium"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              Freq
            </button>
            <button
              onClick={() => handleViewModeChange("ev")}
              className={cn(
                "px-2 py-1 rounded text-xs transition-colors",
                viewMode === "ev"
                  ? "bg-poker-gold text-black font-medium"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              EV
            </button>
            <button
              onClick={() => handleViewModeChange("mixed")}
              className={cn(
                "px-2 py-1 rounded text-xs transition-colors",
                viewMode === "mixed"
                  ? "bg-poker-gold text-black font-medium"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              Mixed
            </button>
          </div>
          
          {/* Export Button */}
          <button
            onClick={() => exportToCSV(strategy, isComparing ? comparisonStrategy : undefined, boardCards, position)}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
            title="Export to CSV"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          
          {/* Comparison Toggle */}
          {comparisonStrategy && (
            <button
              onClick={toggleComparison}
              className={cn(
                "px-2 py-1 border rounded text-xs transition-colors flex items-center gap-1",
                isComparing
                  ? "bg-yellow-500/20 border-yellow-500 text-yellow-500"
                  : "bg-gray-800 hover:bg-gray-700 border-gray-700 text-muted-foreground hover:text-white"
              )}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Compare
            </button>
          )}
        </div>
      </div>
      
      {/* API Lookup Section */}
      {apiEndpoint && (
        <div className="flex flex-wrap items-center gap-2 mb-3 p-2 bg-gray-900/50 rounded border border-gray-800">
          <span className="text-xs text-muted-foreground">Lookup:</span>
          {availableStackDepths && availableStackDepths.length > 0 && (
            <select
              value={selectedStackDepth}
              onChange={(e) => setSelectedStackDepth(Number(e.target.value))}
              className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white"
            >
              {availableStackDepths.map(depth => (
                <option key={depth} value={depth}>{depth}bb</option>
              ))}
            </select>
          )}
          <button
            onClick={handleLookupStrategy}
            disabled={loading}
            className="px-2 py-1 bg-poker-gold/20 hover:bg-poker-gold/30 border border-poker-gold/50 rounded text-xs text-poker-gold disabled:opacity-50 flex items-center gap-1"
          >
            {loading ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Fetch Strategy
              </>
            )}
          </button>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      )}
      
      {/* Summary Stats */}
      {stats && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1.5">
            <span>Avg Freq:</span>
            <span className="font-medium">
              {stats.totalFrequency != null
                ? `${(stats.totalFrequency * 100).toFixed(1)}%`
                : '—'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Avg EV:</span>
            <span className={cn(
              "font-medium",
              stats.avgEv != null ? (stats.avgEv >= 0 ? "text-green-500" : "text-red-500") : ""
            )}>
              {stats.avgEv != null
                ? `${stats.avgEv >= 0 ? "+" : ""}${stats.avgEv.toFixed(3)}`
                : '—'}
            </span>
          </div>
          {position && (
            <div className="flex items-center gap-1.5">
              <span>Pos:</span>
              <span className="font-medium">{position}</span>
            </div>
          )}
          {isComparing && (
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-yellow-500/50">
              <span className="text-yellow-500">Comparison Active</span>
            </div>
          )}
        </div>
      )}
      
      {/* Keyboard navigation hint */}
      <div className="text-[10px] text-muted-foreground mb-2">
        <span className="text-muted-foreground/70">Tip: Use arrow keys to navigate cells</span>
      </div>
      
      {/* Heatmap grid */}
      <div
        ref={gridRef}
        className="inline-grid gap-0.5 bg-gray-800/50 p-2 rounded-lg border border-border"
        role="grid"
        aria-label="Strategy heatmap"
      >
        {/* Top-left corner */}
        <div className="w-8 h-8 flex items-center justify-center">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">/</span>
        </div>
        
        {/* Column headers (opponent's cards / columns) */}
        {RANKS.map((rank) => (
          <div
            key={`col-${rank}`}
            className="w-8 h-8 flex items-center justify-center text-xs font-semibold text-muted-foreground"
            role="columnheader"
          >
            {rank}
          </div>
        ))}
        
        {/* Rows */}
        {RANKS.map((rank, row) => (
          <div key={`row-${rank}`} className="contents" role="row">
            {/* Row header (your cards) */}
            <div className="w-8 h-8 flex items-center justify-center text-xs font-semibold text-muted-foreground" role="rowheader">
              {rank}
            </div>
            
            {/* Hand cells */}
            {RANKS.map((_, col) => {
              const hand = getHand(row, col);
              const data = strategy[hand];
              const compData = isComparing ? comparisonStrategy?.[hand] : undefined;
              
              return (
                <HeatmapCell
                  key={hand}
                  hand={hand}
                  data={data}
                  comparisonData={compData}
                  showEv={viewMode === "ev"}
                  viewMode={viewMode}
                  isComparisonMode={isComparing}
                  onCellClick={onCellClick}
                  onKeyDown={handleKeyDown}
                  isFocused={focusedCell === hand}
                  tabIndex={focusedCell === hand ? 0 : -1}
                />
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Axis labels */}
      <div className="flex justify-between mt-2 text-[10px] text-muted-foreground px-1">
        <span>Your Hand →</span>
        <span>← Opponent's Hand</span>
      </div>
      
      {/* Diagonal indicator (your cards vs opponent's) */}
      <div className="absolute top-0 left-0 text-[9px] text-muted-foreground/50 -rotate-45 origin-bottom-left ml-10 mt-2">
        (Diagonal = pocket pairs)
      </div>
      
      {/* Tooltip */}
      <Tooltip
        tooltip={tooltip}
        showEv={viewMode === "ev"}
        viewMode={viewMode}
        street={street}
        position={position}
        isComparisonMode={isComparing}
      />
      
      {/* EV Legend Scale */}
      {(viewMode === "ev" || showEv) && (
        <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>EV Scale:</span>
          <div className="flex items-center gap-1">
            <div className="w-20 h-2 rounded bg-gradient-to-r from-red-600 via-yellow-500 to-green-600" />
            <span>Low</span>
            <span className="ml-1">High</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default StrategyHeatmap;