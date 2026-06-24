"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Position = "BTN" | "SB" | "BB" | "CO" | "MP" | "UTG";
type BoardType = "dry" | "wet" | "paired" | "rainbow" | "monochrome";
type Street = "preflop" | "flop" | "turn" | "river";

interface StrategyAction {
  action: string;
  frequency: number;
  ev: number;
}

interface StrategyData {
  actions: StrategyAction[];
  hands?: Record<string, StrategyAction>;
}

interface SolutionSpot {
  id: string;
  board: string;
  board_type: string;
  position: Position;
  pot_size: number;
  stack_depth: number;
  title: string;
  description: string;
  author: string;
  created_at: string;
  likes: number;
  tags: string[];
  strategy_json: StrategyData;
  comments_count?: number;
  fork_count?: number;
}

interface ApiResponse {
  spots: SolutionSpot[];
  total: number;
  offset: number;
  limit: number;
}

const API_BASE = "/api/v1";

const POSITION_ORDER: Record<Position, number> = {
  UTG: 0,
  MP: 1,
  CO: 2,
  BTN: 3,
  SB: 4,
  BB: 5,
};

const POSITION_LABELS: Record<Position, string> = {
  BTN: "Button",
  SB: "Small Blind",
  BB: "Big Blind",
  CO: "Cutoff",
  MP: "Middle Pos",
  UTG: "UTG",
};

function getSuitSymbol(card: string): string {
  if (card.length < 2) return "";
  const suit = card[card.length - 1]?.toLowerCase();
  switch (suit) {
    case "s":
      return "♠";
    case "h":
      return "♥";
    case "d":
      return "♦";
    case "c":
      return "♣";
    default:
      return "";
  }
}

function getSuitColor(card: string): string {
  if (card.length < 2) return "text-gray-400";
  const suit = card[card.length - 1]?.toLowerCase();
  return suit === "h" || suit === "d" ? "text-red-400" : "text-gray-200";
}

function renderBoardCards(board: string) {
  if (!board) {
    return (
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-9 h-12 rounded border flex items-center justify-center text-gray-500 text-xs"
            style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
          >
            ?
          </div>
        ))}
      </div>
    );
  }

  const cleaned = board.replace(/-/g, "").replace(/[♠♥♦♣]/g, (m) => {
    const map: Record<string, string> = { "♠": "s", "♥": "h", "♦": "d", "♣": "c" };
    return map[m] || m;
  });

  // Parse cards - each card is rank+suit (2 chars), but 10 is '10' so 3 chars
  const cards: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    // Check for 10 (rank '10' + suit = 3 chars)
    if (cleaned[i] === "1" && i + 1 < cleaned.length && cleaned[i + 1] === "0") {
      cards.push(cleaned.slice(i, i + 3));
      i += 3;
    } else {
      cards.push(cleaned.slice(i, i + 2));
      i += 2;
    }
  }

  return (
    <div className="flex gap-1">
      {cards.map((card, idx) => {
        const rank = card.slice(0, -1);
        const suit = getSuitSymbol(card);
        const color = getSuitColor(card);
        return (
          <div
            key={idx}
            className={cn(
              "w-9 h-12 rounded border flex flex-col items-center justify-center text-xs font-mono shadow-sm",
              color
            )}
            style={{
              backgroundColor: "var(--bg)",
              borderColor: "var(--border)",
            }}
          >
            <span className="leading-none font-bold text-[11px]">{rank}</span>
            <span className="leading-none text-[10px]">{suit}</span>
          </div>
        );
      })}
    </div>
  );
}

function getStreetFromBoardType(boardType: string): Street {
  const bt = boardType.toLowerCase();
  if (bt === "flop") return "flop";
  if (bt === "turn") return "turn";
  if (bt === "river") return "river";
  return "preflop";
}

function getTopActions(
  strategy: StrategyData,
  count: number = 3
): StrategyAction[] {
  if (!strategy?.actions) return [];
  return [...strategy.actions]
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, count);
}

function getActionColor(action: string): string {
  const a = action.toLowerCase();
  if (a === "fold") return "bg-gray-600";
  if (a === "check") return "bg-green-800";
  if (a === "call") return "bg-blue-700";
  if (a === "raise" || a === "bet") return "bg-red-700";
  if (a === "allin" || a === "all-in") return "bg-red-900";
  return "bg-gray-700";
}

function getActionBarColor(action: string): string {
  const a = action.toLowerCase();
  if (a === "fold") return "bg-gray-500";
  if (a === "check") return "bg-green-600";
  if (a === "call") return "bg-blue-500";
  if (a === "raise" || a === "bet") return "bg-red-500";
  if (a === "allin" || a === "all-in") return "bg-red-700";
  return "bg-gray-500";
}

export default function SolutionsPage() {
  const [solutions, setSolutions] = useState<SolutionSpot[]>([]);
  const router = useRouter();
  const [filterPosition, setFilterPosition] = useState<Position | "all">("all");
  const [filterBoardType, setFilterBoardType] = useState<BoardType | "all">("all");
  const [filterStreet, setFilterStreet] = useState<Street | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSolution, setSelectedSolution] = useState<SolutionSpot | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSolutions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (sortBy === "popular") params.set("sort_by", "popular");
      else params.set("sort_by", "recent");
      params.set("limit", "100");

      const response = await fetch(`${API_BASE}/spots?${params.toString()}`);
      if (!response.ok) throw new Error(`Failed to fetch solutions (${response.status})`);

      const data: ApiResponse = await response.json();
      const mapped: SolutionSpot[] = data.spots.map((s) => ({
        ...s,
        board_type: s.board_type || "flop",
        position: (s.position.toUpperCase() as Position) || "BTN",
      }));
      setSolutions(mapped);

      if (!selectedSolution && mapped.length > 0) {
        setSelectedSolution(mapped[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching solutions:", err);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    fetchSolutions();
  }, [fetchSolutions]);

  const filteredSolutions = solutions
    .filter((sol) => {
      if (filterPosition !== "all" && sol.position.toUpperCase() !== filterPosition)
        return false;
      if (filterBoardType !== "all" && sol.board_type !== filterBoardType) return false;
      if (filterStreet !== "all") {
        const street = getStreetFromBoardType(sol.board_type);
        if (street !== filterStreet) return false;
      }
      if (
        searchQuery &&
        !sol.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !sol.board.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "popular") return b.likes - a.likes;
      return 0;
    });

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: "var(--bg)" }}>
      {/* Header */}
      <div
        className="border-b flex-shrink-0"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--panel)" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--green)" }}>
                Solutions
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
                Browse pre-computed GTO solutions for common spots
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
              <span className="px-2 py-1 rounded font-mono" style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}>
                {filteredSolutions.length}
              </span>
              <span>solutions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="border-b flex-shrink-0"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--panel)" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Search</label>
              <input
                type="text"
                placeholder="Search by board or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:ring-1"
                style={{
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>

            <div className="min-w-[130px]">
              <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Position</label>
              <select
                value={filterPosition}
                onChange={(e) =>
                  setFilterPosition(e.target.value as Position | "all")
                }
                className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                }}
              >
                <option value="all">All Positions</option>
                <option value="UTG">UTG</option>
                <option value="MP">Middle Pos</option>
                <option value="CO">Cutoff</option>
                <option value="BTN">Button</option>
                <option value="SB">Small Blind</option>
                <option value="BB">Big Blind</option>
              </select>
            </div>

            <div className="min-w-[120px]">
              <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Board Type</label>
              <select
                value={filterBoardType}
                onChange={(e) =>
                  setFilterBoardType(e.target.value as BoardType | "all")
                }
                className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                }}
              >
                <option value="all">All Types</option>
                <option value="dry">Dry</option>
                <option value="wet">Wet</option>
                <option value="paired">Paired</option>
                <option value="rainbow">Rainbow</option>
                <option value="monochrome">Monochrome</option>
              </select>
            </div>

            <div className="min-w-[110px]">
              <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Street</label>
              <select
                value={filterStreet}
                onChange={(e) =>
                  setFilterStreet(e.target.value as Street | "all")
                }
                className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                }}
              >
                <option value="all">All Streets</option>
                <option value="preflop">Preflop</option>
                <option value="flop">Flop</option>
                <option value="turn">Turn</option>
                <option value="river">River</option>
              </select>
            </div>

            <div className="min-w-[120px]">
              <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Sort</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "recent" | "popular")}
                className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                }}
              >
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading && (
          <div className="text-center py-16">
            <div
              className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-4"
              style={{ borderColor: "var(--green)", borderTopColor: "transparent" }}
            />
            <p style={{ color: "var(--muted)" }}>Loading solutions...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <div className="text-red-400 text-lg mb-2">Error loading solutions</div>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>{error}</p>
            <button
              onClick={fetchSolutions}
              className="px-4 py-2 rounded-lg font-semibold text-sm"
              style={{ backgroundColor: "var(--green)", color: "#0E0E0E" }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filteredSolutions.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-lg mb-2" style={{ color: "var(--text)" }}>No solutions found</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Try adjusting your filters or search query
            </p>
          </div>
        )}

        {!loading && !error && filteredSolutions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Solutions List */}
            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-lg font-semibold text-white mb-3">
                Solution Library
              </h2>
              {filteredSolutions.map((sol) => {
                const topActions = getTopActions(sol.strategy_json, 3);
                const isSelected = selectedSolution?.id === sol.id;

                return (
                  <button
                    key={sol.id}
                    onClick={() => setSelectedSolution(sol)}
                    className={cn(
                      "w-full p-4 rounded-lg text-left transition-all",
                      isSelected ? "ring-1" : "hover:brightness-110"
                    )}
                    style={{
                      backgroundColor: isSelected ? "var(--panel)" : "#141414",
                      border: isSelected
                        ? "1px solid var(--green)"
                        : "1px solid var(--border)",
                      boxShadow: isSelected ? "0 0 0 1px var(--green)" : "none",
                    }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Board Cards */}
                      <div className="flex-shrink-0">
                        {renderBoardCards(sol.board)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                            style={{
                              backgroundColor: "rgba(0, 200, 83, 0.12)",
                              color: "var(--green)",
                            }}
                          >
                            {sol.position}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] capitalize" style={{ backgroundColor: "var(--bg)", color: "var(--muted)" }}>
                            {sol.board_type}
                          </span>
                        </div>

                        <h3 className="text-sm font-medium text-white truncate">
                          {sol.title}
                        </h3>

                        <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
                          <span>{sol.stack_depth}bb</span>
                          <span>·</span>
                          <span>Pot: {sol.pot_size}</span>
                          <span>·</span>
                          <span>❤️ {sol.likes}</span>
                        </div>

                        {/* Top Actions Preview */}
                        {topActions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {topActions.map((action, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2"
                              >
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase text-white w-14 text-center",
                                    getActionColor(action.action)
                                  )}
                                >
                                  {action.action}
                                </span>
                                <div
                                  className="flex-1 h-2 rounded-full overflow-hidden"
                                  style={{ backgroundColor: "var(--border)" }}
                                >
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      getActionBarColor(action.action)
                                    )}
                                    style={{
                                      width: `${Math.min(action.frequency * 100, 100)}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] w-10 text-right font-medium" style={{ color: "var(--muted)" }}>
                                  {(action.frequency * 100).toFixed(0)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Detail Panel */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-3">
                Solution Detail
              </h2>
              {selectedSolution ? (
                <>
                  {/* Spot Info Card */}
                  <div
                    className="rounded-lg p-5"
                    style={{
                      backgroundColor: "var(--panel)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold text-white">
                        {selectedSolution.title}
                      </h3>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>
                        ❤️ {selectedSolution.likes}
                      </span>
                    </div>

                    {/* Board */}
                    <div className="mb-4">
                      <label className="text-xs block mb-1.5" style={{ color: "var(--muted)" }}>
                        Board
                      </label>
                      <div className="flex gap-1.5">
                        {renderBoardCards(selectedSolution.board)}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="text-xs block mb-0.5" style={{ color: "var(--muted)" }}>
                          Position
                        </label>
                        <span
                          className="px-2 py-1 rounded text-xs font-semibold"
                          style={{
                            backgroundColor: "rgba(0, 200, 83, 0.12)",
                            color: "var(--green)",
                          }}
                        >
                          {selectedSolution.position}
                        </span>
                      </div>
                      <div>
                        <label className="text-xs block mb-0.5" style={{ color: "var(--muted)" }}>
                          Stack Depth
                        </label>
                        <span className="text-sm text-white font-mono">
                          {selectedSolution.stack_depth}bb
                        </span>
                      </div>
                      <div>
                        <label className="text-xs block mb-0.5" style={{ color: "var(--muted)" }}>
                          Pot Size
                        </label>
                        <span className="text-sm text-white font-mono">
                          {selectedSolution.pot_size}
                        </span>
                      </div>
                      <div>
                        <label className="text-xs block mb-0.5" style={{ color: "var(--muted)" }}>
                          Board Type
                        </label>
                        <span className="text-sm text-white capitalize">
                          {selectedSolution.board_type}
                        </span>
                      </div>
                    </div>

                    {/* Tags */}
                    {selectedSolution.tags &&
                      selectedSolution.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {selectedSolution.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded text-[10px]"
                              style={{ backgroundColor: "var(--bg)", color: "var(--muted)" }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      {selectedSolution.description}
                    </p>
                  </div>

                  {/* Strategy Breakdown */}
                  <div
                    className="rounded-lg p-5"
                    style={{
                      backgroundColor: "var(--panel)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <h4 className="text-sm font-semibold text-white mb-3">
                      GTO Strategy
                    </h4>
                    <div className="space-y-2">
                      {/* Show hands breakdown if available, otherwise show actions */}
                      {selectedSolution.strategy_json.hands
                        ? Object.entries(selectedSolution.strategy_json.hands)
                            .sort(
                              (a, b) => b[1].frequency - a[1].frequency
                            )
                            .slice(0, 8)
                            .map(([hand, data]) => (
                              <div key={hand} className="flex items-center gap-2">
                                <span className="text-xs font-mono w-10" style={{ color: "var(--text)" }}>
                                  {hand}
                                </span>
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase text-white w-14 text-center",
                                    getActionColor(data.action)
                                  )}
                                >
                                  {data.action}
                                </span>
                                <div
                                  className="flex-1 h-2 rounded-full overflow-hidden"
                                  style={{ backgroundColor: "var(--border)" }}
                                >
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      getActionBarColor(data.action)
                                    )}
                                    style={{
                                      width: `${Math.min(data.frequency * 100, 100)}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] w-10 text-right" style={{ color: "var(--muted)" }}>
                                  {(data.frequency * 100).toFixed(0)}%
                                </span>
                                <span className="text-[10px] w-12 text-right" style={{ color: "var(--muted)" }}>
                                  {data.ev.toFixed(2)} EV
                                </span>
                              </div>
                            ))
                        : selectedSolution.strategy_json.actions
                            .sort((a, b) => b.frequency - a.frequency)
                            .slice(0, 8)
                            .map((action, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-xs font-mono w-10" style={{ color: "var(--text)" }}>
                                  Action {idx + 1}
                                </span>
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase text-white w-14 text-center",
                                    getActionColor(action.action)
                                  )}
                                >
                                  {action.action}
                                </span>
                                <div
                                  className="flex-1 h-2 rounded-full overflow-hidden"
                                  style={{ backgroundColor: "var(--border)" }}
                                >
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      getActionBarColor(action.action)
                                    )}
                                    style={{
                                      width: `${Math.min(action.frequency * 100, 100)}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] w-10 text-right" style={{ color: "var(--muted)" }}>
                                  {(action.frequency * 100).toFixed(0)}%
                                </span>
                                <span className="text-[10px] w-12 text-right" style={{ color: "var(--muted)" }}>
                                  {action.ev.toFixed(2)} EV
                                </span>
                              </div>
                            ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
                      style={{
                      backgroundColor: "var(--green)",
                      color: "#0E0E0E",
                    }}
                    onClick={() => {
                      const board = selectedSolution.board
                      const position = selectedSolution.position
                      const stack = selectedSolution.stack_depth
                      const street = getStreetFromBoardType(selectedSolution.board_type)
                      router.push(`/study?board=${board}&position=${position}&stack=${stack}&street=${street}`)
                    }}
                    >
                      Practice This Spot
                    </button>
                    <button
                      className="py-2.5 px-4 rounded-lg font-semibold text-sm border transition-colors hover:bg-gray-800"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--muted)",
                        backgroundColor: "var(--panel)",
                      }}
                    >
                      Study
                    </button>
                  </div>
                </>
              ) : (
                <div
                  className="rounded-lg p-8 text-center"
                  style={{
                    backgroundColor: "var(--panel)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    Select a solution to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
