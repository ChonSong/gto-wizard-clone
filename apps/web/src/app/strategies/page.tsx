"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ICMAwareStrategy } from "@/components/strategy/ICMAwareStrategy";
import { cn } from "@/lib/utils";
import { gtoTheme } from "@/styles/gto-tokens";
import type { StrategyCell } from "@/components/ui/StrategyHeatmap";
import dynamic from "next/dynamic";

// Define StrategyCell locally to avoid TS issues with dynamic import
interface StrategyCellLocal {
  action: string;
  frequency: number;
  ev: number;
}

// Dynamic import for heavy StrategyHeatmap component
const StrategyHeatmap = dynamic(
  () => import("@/components/ui/StrategyHeatmap").then((mod) => mod.StrategyHeatmap) as any,
  {
    loading: () => (
      <div className="border border-gray-800 rounded-lg p-8 bg-gray-900/50 flex items-center justify-center min-h-[12rem]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-poker-gold border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-gray-400 text-sm">Loading heatmap...</div>
        </div>
      </div>
    ),
    ssr: false,
  }
) as any;

// ============================================================================
// Types
// ============================================================================

type Position = "BTN" | "SB" | "BB" | "CO" | "MP" | "UTG";
type Street = "preflop" | "flop" | "turn" | "river";
type SolverStatus = "queued" | "running" | "complete" | "error";

interface StrategySpot {
  id: string;
  board: string;
  boardType: string;
  position: Position;
  potSize: number;
  stackDepth: number;
  strategy: Record<string, StrategyCell>;
}

interface SolveRequest {
  game_type: string;
  players: number;
  board: string | null;
  pot_size: number;
  stack_depth: number;
  bet_sizes: number[];
  iterations: number;
}

interface SolveJobResponse {
  id: string;
  status: string;
  progress: number;
  message?: string;
}

interface SolverProgress {
  status: SolverStatus;
  progress: number;
  iterations: number;
  estimatedTimeRemaining?: number;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const POSITIONS: Position[] = ["BTN", "SB", "BB", "CO", "MP", "UTG"];
const STACK_DEPTHS = [10, 20, 40, 60, 100];
const BET_SIZES = [0.25, 0.5, 0.75, 1.0];
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS = ['h', 'd', 'c', 's'];

// Mock data for fallback
const MOCK_STRATEGIES: StrategySpot[] = [
  {
    id: "1",
    board: "Kd7h2c",
    boardType: "dry",
    position: "BTN",
    potSize: 100,
    stackDepth: 100,
    strategy: {
      "AA": { action: "raise", frequency: 1.0, ev: 0.85 },
      "KK": { action: "raise", frequency: 0.95, ev: 0.82 },
      "AKs": { action: "raise", frequency: 0.88, ev: 0.76 },
      "AKo": { action: "raise", frequency: 0.75, ev: 0.68 },
      "QQ": { action: "raise", frequency: 0.90, ev: 0.74 },
      "JJ": { action: "call", frequency: 0.65, ev: 0.58 },
      "TT": { action: "call", frequency: 0.55, ev: 0.52 },
      "99": { action: "call", frequency: 0.45, ev: 0.45 },
      "22": { action: "fold", frequency: 0.8, ev: 0.0 },
    },
  },
];

// ============================================================================
// API Functions
// ============================================================================

async function fetchStrategy(params: {
  board: string;
  stack_depth: number;
  position: string;
  street: Street;
}): Promise<Record<string, StrategyCell> | null> {
  try {
    const queryParams = new URLSearchParams({
      board: params.board,
      stack_depth: params.stack_depth.toString(),
      position: params.position,
    });
    if (params.street) {
      queryParams.set("street", params.street);
    }

    const response = await fetch(
      `/api/v1/strategy-lookup?${queryParams.toString()}`
    );

    if (!response.ok) {
      console.warn("Strategy lookup failed, using mock data");
      return null;
    }

    const data = await response.json();
    if (data.strategy && data.status === "found") {
      return data.strategy as Record<string, StrategyCell>;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch strategy:", error);
    return null;
  }
}

async function submitSolveJob(request: SolveRequest): Promise<SolveJobResponse | null> {
  try {
    const response = await fetch(`/api/v1/solver/solve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to submit solve job:", error);
    return null;
  }
}

// ============================================================================
// WebSocket Hook
// ============================================================================

function useSolverWebSocket(jobId: string | null) {
  const [progress, setProgress] = useState<SolverProgress>({
    status: "queued",
    progress: 0,
    iterations: 0,
  });
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!jobId) return;

    let ws: WebSocket | null = null;

    const connect = () => {
      const wsUrl = `/api/v1/solver/ws/${jobId}`;
      
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setConnected(true);
          // Subscribe to job updates
          ws?.send("subscribe");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setProgress({
              status: data.status || "running",
              progress: data.progress || 0,
              iterations: data.iterations || 0,
              estimatedTimeRemaining: data.estimatedTimeRemaining,
              error: data.error,
            });
          } catch (e) {
            console.error("Failed to parse progress:", e);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          // Reconnect after 2 seconds
          reconnectTimeoutRef.current = setTimeout(connect, 2000);
        };

        ws.onerror = () => {
          ws?.close();
        };

        wsRef.current = ws;
      } catch (e) {
        console.error("WebSocket connection failed:", e);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      ws?.close();
    };
  }, [jobId]);

  return { progress, connected };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getStreetFromBoard(board: string): Street {
  const cardCount = board.length / 2;
  switch (cardCount) {
    case 0:
      return "preflop";
    case 3:
      return "flop";
    case 4:
      return "turn";
    case 5:
      return "river";
    default:
      return "flop";
  }
}

function validateBoardCards(cards: string[]): { valid: boolean; error?: string } {
  if (cards.filter(c => c.length === 2).length !== cards.length) {
    return { valid: false, error: "Each card must be 2 characters (e.g., 'Ah', 'Kd')" };
  }
  
  const validSuits = ['h', 'd', 'c', 's'];
  const validRanks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  
  for (const card of cards) {
    const rank = card[0].toUpperCase();
    const suit = card[1].toLowerCase();
    
    if (!validRanks.includes(rank)) {
      return { valid: false, error: `Invalid rank: ${rank}` };
    }
    if (!validSuits.includes(suit)) {
      return { valid: false, error: `Invalid suit: ${suit}` };
    }
  }
  
  // Check for duplicates
  const uniqueCards = new Set(cards.map(c => c.toLowerCase()));
  if (uniqueCards.size !== cards.length) {
    return { valid: false, error: "Duplicate cards not allowed" };
  }
  
  return { valid: true };
}

// ============================================================================
// Board Card Input Component
// ============================================================================

interface BoardCardInputProps {
  cards: string[];
  onChange: (cards: string[]) => void;
  disabled?: boolean;
}

function BoardCardInput({ cards, onChange, disabled }: BoardCardInputProps) {
  const handleChange = (index: number, value: string) => {
    const newCards = [...cards];
    // Format: uppercase rank + lowercase suit
    const formatted = value.slice(0, 2).toUpperCase() + value.slice(2, 3).toLowerCase();
    newCards[index] = formatted;
    onChange(newCards);
  };

  const labels = ["Flop 1", "Flop 2", "Flop 3", "Turn", "River"];

  return (
    <div className="flex flex-wrap gap-2 items-end">
      {cards.map((card, index) => (
        <div key={index} className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">{labels[index]}</label>
          <input
            type="text"
            value={card}
            onChange={(e) => handleChange(index, e.target.value)}
            disabled={disabled}
            placeholder={index === 0 ? "Ks" : index === 1 ? "7h" : index === 2 ? "2c" : index === 3 ? "Td" : "3s"}
            className="w-16 px-2 py-2 bg-gray-800 border border-gray-700 rounded text-center font-mono text-sm text-white placeholder:text-gray-600 disabled:opacity-50"
            maxLength={2}
          />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Progress Display Component
// ============================================================================

interface ProgressDisplayProps {
  progress: SolverProgress;
  connected: boolean;
}

function ProgressDisplay({ progress, connected }: ProgressDisplayProps) {
  const formatTime = (seconds?: number) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
      {/* Status indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              connected
                ? progress.status === "running"
                  ? "bg-blue-500 animate-pulse"
                  : progress.status === "complete"
                  ? "bg-green-500"
                  : progress.status === "error"
                  ? "bg-red-500"
                  : "bg-yellow-500"
                : "bg-gray-500"
            )}
          />
          <span className="text-sm font-medium capitalize">{progress.status}</span>
        </div>
        <span className="text-xs text-gray-400">
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-3 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300",
            progress.status === "complete" ? "bg-green-500" : 
            progress.status === "error" ? "bg-red-500" : "bg-blue-500"
          )}
          style={{ width: `${progress.progress * 100}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <div className="space-x-4">
          <span>
            <span className="text-gray-400">Progress: </span>
            <span className="font-mono">{(progress.progress * 100).toFixed(1)}%</span>
          </span>
          <span>
            <span className="text-gray-400">Iterations: </span>
            <span className="font-mono">{progress.iterations.toLocaleString()}</span>
          </span>
        </div>
        <span className="text-gray-400">
          ETA: {formatTime(progress.estimatedTimeRemaining)}
        </span>
      </div>

      {/* Error message */}
      {progress.error && (
        <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
          {progress.error}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function StrategiesPage() {
  // Form state
  const [boardCards, setBoardCards] = useState<string[]>(["", "", "", "", ""]);
  const [position, setPosition] = useState<Position>("BTN");
  const [stackDepth, setStackDepth] = useState<number>(100);
  const [betSize, setBetSize] = useState<number>(0.5);

  // Data state
  const [strategies, setStrategies] = useState<StrategySpot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<StrategySpot | null>(null);
  const [currentStrategy, setCurrentStrategy] = useState<Record<string, StrategyCell>>({});

  // UI state
  const [loading, setLoading] = useState(false);
  const [solving, setSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boardInput, setBoardInput] = useState(true);

  // Solver state
  const [jobId, setJobId] = useState<string | null>(null);
  const { progress, connected } = useSolverWebSocket(jobId);

  // ICM-aware strategy state
  const [icmStrategy, setIcmStrategy] = useState<{
    bubbleFactor: number;
    icmEquity: number;
    chipEquity: number;
    recommendedAction: "push" | "fold" | "call";
    confidence: "high" | "medium" | "low";
    explanation: string;
    handAdjustments: Record<string, string>;
  } | null>(null);

  // Build board string from cards
  const boardString = boardCards.filter(c => c.length === 2).join("");

  // Fetch strategy when parameters change
  useEffect(() => {
    if (!boardString || boardString.length < 6) {
      setCurrentStrategy({});
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const street = getStreetFromBoard(boardString);
        const strategy = await fetchStrategy({
          board: boardString,
          stack_depth: stackDepth,
          position: position,
          street,
        });

        if (strategy && Object.keys(strategy).length > 0) {
          setCurrentStrategy(strategy);
          setSelectedSpot({
            id: "current",
            board: boardString,
            boardType: "unknown",
            position,
            potSize: 100,
            stackDepth,
            strategy,
          });
        } else {
          // Use mock data as fallback
          setCurrentStrategy(MOCK_STRATEGIES[0].strategy);
          setSelectedSpot(MOCK_STRATEGIES[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch strategy");
        // Fallback to mock data
        setCurrentStrategy(MOCK_STRATEGIES[0].strategy);
        setSelectedSpot(MOCK_STRATEGIES[0]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [boardString, stackDepth, position]);

  // Compute ICM-aware strategy when relevant parameters change
  useEffect(() => {
    // Generate mock stack data for ICM calculation
    // In a real app, this would come from tournament context
    const playerCount = 9; // Typical full-ring table
    const mockStacks = Array(playerCount).fill(stackDepth * 100); // 100 big blinds each
    const positionIdx = POSITIONS.indexOf(position);

    // Adjust our stack based on position
    mockStacks[positionIdx] = stackDepth * 100;

    // Simple bubble factor approximation for demo
    const totalChips = mockStacks.reduce((a, b) => a + b, 0);
    const avgChips = totalChips / playerCount;
    const bf = totalChips / (avgChips * playerCount) > 0.5
      ? 1.0 + (1.0 - (stackDepth * 100 / totalChips)) * 0.5
      : 1.0;

    // Clamp bubble factor to reasonable range
    const bubbleFactor = Math.max(0.9, Math.min(2.0, bf));

    // Calculate ICM equity (simplified)
    const chipEquity = (stackDepth * 100) / totalChips;
    const icmEquity = chipEquity * bubbleFactor;

    // Determine recommendation based on bubble factor
    let recommendedAction: "push" | "fold" | "call" = "push";
    let confidence: "high" | "medium" | "low" = "medium";
    let explanation = "";
    const handAdjustments: Record<string, string> = {};

    if (bubbleFactor > 1.5) {
      recommendedAction = "fold";
      confidence = "high";
      explanation = `Very high bubble pressure (${bubbleFactor.toFixed(2)}x). Chips are extremely valuable - play only premium hands.`;
      handAdjustments.premium_tight = "Only AA, KK, QQ, AKs push";
      handAdjustments.bubble_note = "Maximum ICM caution required";
    } else if (bubbleFactor > 1.3) {
      recommendedAction = "fold";
      confidence = "high";
      explanation = `High bubble pressure (${bubbleFactor.toFixed(2)}x). Consider folding marginal hands as chips are worth significantly more.`;
      handAdjustments.tight_range = "Push AA-QQ, AK; fold everything else";
      handAdjustments.bubble_note = "ICM pressure is high";
    } else if (bubbleFactor > 1.15) {
      recommendedAction = "push";
      confidence = "medium";
      explanation = `Moderate bubble pressure (${bubbleFactor.toFixed(2)}x). Standard ranges but be cautious with marginal hands.`;
      handAdjustments.standard_with_caution = "Push standard range, consider folding weak suited connectors";
      handAdjustments.bubble_note = "Some ICM pressure";
    } else {
      recommendedAction = "push";
      confidence = "high";
      explanation = `Normal ICM conditions (${bubbleFactor.toFixed(2)}x). Follow standard push/fold charts.`;
      handAdjustments.standard = "Follow standard push/fold chart";
      handAdjustments.bubble_note = "No significant ICM pressure";
    }

    setIcmStrategy({
      bubbleFactor,
      icmEquity: Math.min(icmEquity, 1.0),
      chipEquity,
      recommendedAction,
      confidence,
      explanation,
      handAdjustments,
    });
  }, [stackDepth, position]);

  // Handle solve new spot
  const handleSolve = async () => {
    const validation = validateBoardCards(boardCards.filter(c => c.length === 2));
    if (!validation.valid) {
      setError(validation.error || "Invalid board cards");
      return;
    }

    setError(null);
    setSolving(true);
    setJobId(null);

    try {
      const request: SolveRequest = {
        game_type: "nlh",
        players: 2,
        board: boardString || null,
        pot_size: 100,
        stack_depth: stackDepth,
        bet_sizes: [Math.round(betSize * 100)], // Convert to integer percentage
        iterations: 1000,
      };

      const result = await submitSolveJob(request);

      if (result) {
        setJobId(result.id);
        if (result.status === "complete") {
          setSolving(false);
        }
      } else {
        setError("Failed to submit solve job. Please try again.");
        setSolving(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit solve job");
      setSolving(false);
    }
  };

  // Clear board
  const handleClearBoard = () => {
    setBoardCards(["", "", "", "", ""]);
    setCurrentStrategy({});
    setSelectedSpot(null);
    setError(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-poker-gold">
          GTO Strategy Browser
        </h1>
        <span className="text-sm text-gray-400">
          {strategies.length} spots found
        </span>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Input Panel */}
      <div className="flex flex-wrap gap-6 mb-8 p-6 bg-gray-900/50 rounded-lg border border-gray-800">
        {/* Board Card Input */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-400">Board Cards</label>
          <BoardCardInput
            cards={boardCards}
            onChange={setBoardCards}
            disabled={solving}
          />
          {boardInput && (
            <button
              onClick={handleClearBoard}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Clear board
            </button>
          )}
        </div>

        {/* Position Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-400">Position</label>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as Position)}
            disabled={solving}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            {POSITIONS.map((pos) => (
              <option key={pos} value={pos}>
                {pos === "BTN" ? "Button" : pos === "SB" ? "Small Blind" : pos === "BB" ? "Big Blind" : pos}
              </option>
            ))}
          </select>
        </div>

        {/* Stack Depth Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-400">Stack Depth</label>
          <select
            value={stackDepth}
            onChange={(e) => setStackDepth(Number(e.target.value))}
            disabled={solving}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            {STACK_DEPTHS.map((depth) => (
              <option key={depth} value={depth}>
                {depth}bb
              </option>
            ))}
          </select>
        </div>

        {/* Bet Size Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-400">Bet Size</label>
          <select
            value={betSize}
            onChange={(e) => setBetSize(Number(e.target.value))}
            disabled={solving}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            {BET_SIZES.map((size) => (
              <option key={size} value={size}>
                {size === 1.0 ? "Pot" : `${size * 100}% pot`}
              </option>
            ))}
          </select>
        </div>

        {/* Solve Button */}
        <div className="flex flex-col gap-2 justify-end">
          <button
            onClick={handleSolve}
            disabled={solving || boardCards.filter(c => c.length === 2).length < 3}
            className={cn(
              "px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2",
              solving
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-poker-gold hover:bg-poker-gold/80 text-black"
            )}
          >
            {solving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Solving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Solve New Spot
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Display (when solving) */}
      {solving && jobId && (
        <div className="mb-8">
          <ProgressDisplay progress={progress} connected={connected} />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <svg className="w-8 h-8 animate-spin text-poker-gold" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="ml-3 text-gray-400">Loading strategy...</span>
        </div>
      )}

      {/* Strategy Display */}
      {!loading && Object.keys(currentStrategy).length > 0 && selectedSpot && (
        <div className="space-y-6">
          {/* Strategy Heatmap */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Strategy Heatmap</h3>
            <StrategyHeatmap
              strategy={currentStrategy}
              boardCards={boardString}
              position={position}
              street={getStreetFromBoard(boardString)}
              actionType="raise_call_fold"
              className="bg-gray-900/30 p-4 rounded-lg border border-gray-800"
            />
          </div>

          {/* Spot Details Card */}
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <h3 className="text-lg font-semibold mb-4">Spot Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-gray-400">Board</span>
                <div className="font-mono text-sm">{boardString || "None"}</div>
              </div>
              <div>
                <span className="text-xs text-gray-400">Position</span>
                <div className="font-medium">{position}</div>
              </div>
              <div>
                <span className="text-xs text-gray-400">Stack Depth</span>
                <div className="font-medium">{stackDepth}bb</div>
              </div>
              <div>
                <span className="text-xs text-gray-400">Bet Size</span>
                <div className="font-medium">{betSize === 1.0 ? "Pot" : `${betSize * 100}%`}</div>
              </div>
            </div>
          </div>

          {/* ICM-Aware Strategy Recommendation */}
          {icmStrategy && (
            <ICMAwareStrategy
              bubbleFactor={icmStrategy.bubbleFactor}
              icmEquity={icmStrategy.icmEquity}
              chipEquity={icmStrategy.chipEquity}
              recommendedAction={icmStrategy.recommendedAction}
              confidence={icmStrategy.confidence}
              explanation={icmStrategy.explanation}
              handAdjustments={icmStrategy.handAdjustments}
            />
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && Object.keys(currentStrategy).length === 0 && boardString.length >= 6 && (
        <div className="p-8 text-center text-gray-400 border border-gray-800 rounded-lg">
          <p className="mb-2">No strategy found for the selected parameters.</p>
          <p className="text-sm">Click "Solve New Spot" to generate a GTO solution.</p>
        </div>
      )}

      {/* No Board State */}
      {!loading && boardString.length < 6 && (
        <div className="p-8 text-center text-gray-400 border border-gray-800 rounded-lg">
          <p className="mb-2">Enter at least 3 board cards to view a strategy.</p>
          <p className="text-sm">You can also enter 4 (turn) or 5 (river) cards for later streets.</p>
        </div>
      )}
    </div>
  );
}