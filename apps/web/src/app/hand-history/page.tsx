"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Filter,
  Terminal,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HandHistoryRecord {
  id: string;
  user_id: string;
  site: string;
  hero_name: string | null;
  pot: number;
  board: string[] | null;
  game_type: string;
  table_name: string | null;
  board_texture: string | null;
  spot_category: string | null;
  stakes: { sb: number; bb: number } | null;
  max_seats: number;
  button_position: number | null;
  players: PlayerInfo[] | null;
  ev_loss: number | null;
  winners: { player: string; amount: number }[] | null;
  external_hand_id: string | null;
  created_at: string;
  tags: string[];
}

interface PlayerInfo {
  name: string;
  seat: number;
  stack: number;
  position: string | null;
  hole_cards: string[] | null;
}

interface HandDetail extends HandHistoryRecord {
  raw_text: string;
  parsed_data: Record<string, unknown> | null;
  actions: HandActionDetail[] | null;
}

interface HandActionDetail {
  id: string;
  hand_id: string;
  player: string;
  action_type: string;
  amount: number | null;
  street: string;
  street_index: number;
}

interface StatsResponse {
  user_id: string;
  total_hands: number;
  total_pot: number;
  total_ev_loss: number | null;
  by_site: Record<string, { count: number; total_pot: number; total_ev_loss: number }>;
  by_board_texture: Record<string, { count: number; total_pot: number }>;
  by_spot_category: Record<string, { count: number; total_pot: number; total_ev_loss: number }>;
  date_from: string | null;
  date_to: string | null;
}

// ─── Parse result types ──────────────────────────────────────────────────────

interface ParsedHandAction {
  player: string;
  action: string;
  amount: number | null;
  street: string;
}

interface ParsedPlayerInfo {
  name: string;
  seat: number;
  stack: number;
  position: string | null;
  hole_cards: string[] | null;
}

interface ParsedWinner {
  player: string;
  amount: number;
}

interface ParseResultData {
  hand_id: string;
  site: string;
  game_type: string;
  limit_type: string;
  stakes: { sb: number; bb: number } | null;
  table_name: string;
  max_seats: number;
  button_position: number;
  players: ParsedPlayerInfo[];
  actions: Record<string, ParsedHandAction[]>;
  board: string[];
  pot: number;
  rake: number;
  winners: ParsedWinner[] | null;
  hero_name: string | null;
  format?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SUIT_SYMBOLS: Record<string, string> = {
  h: "♥",
  d: "♦",
  c: "♣",
  s: "♠",
};

const SITE_LABELS: Record<string, string> = {
  pokerstars: "PS",
  ggpoker: "GG",
  winamax: "WM",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatPot(pot: number): string {
  if (pot >= 1000) return `${(pot / 1000).toFixed(1)}k`;
  return pot.toFixed(1);
}

function formatEV(ev: number | null): string {
  if (ev === null) return "—";
  const sign = ev >= 0 ? "+" : "";
  return `${sign}${ev.toFixed(2)}`;
}

function heroPosition(hand: HandHistoryRecord): string {
  if (!hand.players) return "—";
  const hero = hand.players.find(
    (p) => p.name === hand.hero_name || (hand.hero_name && p.name.includes(hand.hero_name)),
  );
  return hero?.position || "—";
}

function boardDisplay(board: string[] | null): string {
  if (!board || board.length === 0) return "—";
  return board
    .map((c) => {
      const rank = c[0];
      const suit = c[1]?.toLowerCase() || "";
      const sym = SUIT_SYMBOLS[suit] || suit;
      return `${rank}${sym}`;
    })
    .join(" ");
}

function generateUserId(): string {
  if (typeof window === "undefined") return "anonymous";
  let id = localStorage.getItem("hh_user_id");
  if (!id) {
    id = crypto.randomUUID?.() ?? "user_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("hh_user_id", id);
  }
  return id;
}

// ─── SITE OPTIONS ────────────────────────────────────────────────────────────

const SITES = ["", "pokerstars", "ggpoker", "winamax"] as const;

const SPOT_CATEGORIES = [
  "",
  "preflop_call",
  "preflop_3bet",
  "preflop_4bet",
  "preflop_open",
  "flop_cbet",
  "flop_check",
  "flop_donk",
  "turn_cbet",
  "turn_check",
  "turn_donk",
  "river_cbet",
  "river_check",
  "river_donk",
  "river_shove",
] as const;

// ─── CARD COMPONENT ──────────────────────────────────────────────────────────

function Card({ rank, suit }: { rank: string; suit: string }) {
  const color = ["h", "d"].includes(suit.toLowerCase())
    ? "text-red-400"
    : "text-gray-100";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-xs font-mono",
        color,
      )}
    >
      <span className="font-bold">{rank}</span>
      <span>{SUIT_SYMBOLS[suit.toLowerCase()] || suit}</span>
    </span>
  );
}

function BoardCards({ board }: { board: string[] | null }) {
  if (!board || board.length === 0) return <span className="text-gray-500">—</span>;
  return (
    <div className="flex items-center gap-1">
      {board.map((c, i) => {
        const rank = c[0];
        const suit = c[1]?.toLowerCase() || "";
        return <Card key={i} rank={rank} suit={suit} />;
      })}
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function HandHistoryPage() {
  // Identity
  const [userId, setUserId] = useState("");

  // Data
  const [hands, setHands] = useState<HandHistoryRecord[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [selectedHand, setSelectedHand] = useState<HandDetail | null>(null);
  const [selectedHandLoading, setSelectedHandLoading] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Filters
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [spotFilter, setSpotFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Sort
  const [sortCol, setSortCol] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Parse hand state
  const [parseText, setParseText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResultData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseOpen, setParseOpen] = useState(false);

  // Init
  useEffect(() => {
    setUserId(generateUserId());
  }, []);

  // ─── Fetch hands ───────────────────────────────────────────────────────────

  const fetchHands = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ user_id: userId, limit: "500" });
      if (siteFilter) params.set("site", siteFilter);
      if (spotFilter) params.set("spot_category", spotFilter);
      if (positionFilter) params.set("position", positionFilter);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await fetch(`/api/v1/hh/hands?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 404) {
          setHands([]);
          setLoading(false);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data: HandHistoryRecord[] = await res.json();
      setHands(data);
    } catch (err: unknown) {
      console.error("Failed to fetch hands:", err);
      setError(err instanceof Error ? err.message : "Failed to load hand history");
      setHands([]);
    } finally {
      setLoading(false);
    }
  }, [userId, siteFilter, spotFilter, positionFilter, dateFrom, dateTo]);

  // ─── Fetch stats ───────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    if (!userId) return;
    try {
      const params = new URLSearchParams({ user_id: userId });
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (siteFilter) params.set("site", siteFilter);

      const res = await fetch(`/api/v1/hh/stats?${params.toString()}`);
      if (res.ok) {
        const data: StatsResponse = await res.json();
        setStats(data);
      }
    } catch {
      // Non-critical
    }
  }, [userId, dateFrom, dateTo, siteFilter]);

  // ─── Parse hand history ────────────────────────────────────────────────────

  const handleParse = useCallback(async () => {
    const trimmed = parseText.trim();
    if (trimmed.length < 10) {
      setParseError("Please paste a hand history first (at least 10 characters).");
      setParseResult(null);
      return;
    }
    setParsing(true);
    setParseError(null);
    setParseResult(null);
    try {
      const res = await fetch("/api/v1/hh/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const response: { success: boolean; format?: string; error?: string; data?: ParseResultData } = await res.json();
      if (!response.success) {
        setParseError(response.error || "Parse failed");
        setParseResult(null);
      } else {
        setParseResult(response.data ? (response.data as ParseResultData) : null);
        if (userId) fetchHands();
      }
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : "Failed to parse hand history");
      setParseResult(null);
    } finally {
      setParsing(false);
    }
  }, [parseText, userId, fetchHands]);

  // ─── Fetch hand detail ─────────────────────────────────────────────────────

  const fetchHandDetail = useCallback(async (handId: string) => {
    setSelectedHandLoading(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/v1/hh/hands/${handId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: HandDetail = await res.json();
      setSelectedHand(data);
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : "Failed to load hand detail");
      setSelectedHand(null);
    } finally {
      setSelectedHandLoading(false);
    }
  }, []);

  // Fetch on mount and filter change
  useEffect(() => {
    if (userId) {
      fetchHands();
      fetchStats();
    }
  }, [userId, fetchHands, fetchStats]);

  // Sort & filter (client-side search)
  const filtered = useMemo(() => {
    let result = hands;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (h) =>
          h.hero_name?.toLowerCase().includes(q) ||
          h.site.toLowerCase().includes(q) ||
          h.spot_category?.toLowerCase().includes(q) ||
          h.id.toLowerCase().includes(q) ||
          h.table_name?.toLowerCase().includes(q) ||
          (h.board && h.board.join(" ").toLowerCase().includes(q)),
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      const getVal = (r: HandHistoryRecord) => {
        if (sortCol === "created_at") return new Date(r.created_at).getTime();
        if (sortCol === "pot") return r.pot;
        if (sortCol === "ev_loss") return r.ev_loss ?? 0;
        if (sortCol === "site") return r.site;
        if (sortCol === "spot_category") return r.spot_category ?? "";
        return r[sortCol as keyof HandHistoryRecord]?.toString() ?? "";
      };
      const aVal = getVal(a);
      const bVal = getVal(b);
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [hands, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const handleSort = useCallback(
    (col: string) => {
      if (sortCol === col) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortCol(col);
        setSortDir("desc");
      }
    },
    [sortCol],
  );

  const handleRefresh = useCallback(() => {
    fetchHands();
    fetchStats();
    setSelectedHand(null);
  }, [fetchHands, fetchStats]);

  const handleSelectHand = useCallback(
    (handId: string) => {
      if (selectedHand?.id === handId) {
        setSelectedHand(null);
      } else {
        fetchHandDetail(handId);
      }
    },
    [selectedHand, fetchHandDetail],
  );

  const handleExportCSV = useCallback(() => {
    const headers = [
      "id", "site", "hero_name", "game_type", "stakes",
      "table_name", "pot", "board", "board_texture",
      "spot_category", "ev_loss", "created_at",
    ];
    const rows = filtered.map((h) => [
      h.id,
      h.site,
      h.hero_name ?? "",
      h.game_type,
      h.stakes ? `${h.stakes.sb}/${h.stakes.bb}` : "",
      h.table_name ?? "",
      h.pot,
      (h.board ?? []).join(" "),
      h.board_texture ?? "",
      h.spot_category ?? "",
      h.ev_loss ?? "",
      h.created_at,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hand_history_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-poker-gold">Hand History</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Browse and analyze imported poker hands
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="gap-1.5 border-poker-gold/50 text-poker-gold hover:bg-poker-gold/10 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── Parse Hand History ───────────────────────────────────────────── */}
      <div className="border border-gray-800 rounded-lg mb-6 bg-gray-900/50 overflow-hidden">
        <button
          onClick={() => setParseOpen(!parseOpen)}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-poker-gold" />
            <span className="text-sm font-semibold text-gray-200">Parse Hand History</span>
            {parseResult && (
              <span className="text-xs text-emerald-400">✓ Parsed</span>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 text-gray-500 transition-transform", parseOpen && "rotate-180")} />
        </button>
        {parseOpen && (
          <div className="p-3 border-t border-gray-800 space-y-3">
            <textarea
              value={parseText}
              onChange={(e) => setParseText(e.target.value)}
              placeholder="Paste a PokerStars, GGPoker, or Winamax hand history here..."
              rows={6}
              className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-xs font-mono placeholder:text-gray-600 focus:outline-none focus:border-blue-500 resize-y"
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={handleParse}
                disabled={parsing || parseText.trim().length < 10}
                size="sm"
                className="gap-1.5 bg-poker-gold text-gray-900 hover:bg-poker-gold/90 font-semibold"
              >
                {parsing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Terminal className="h-3.5 w-3.5" />
                    Parse
                  </>
                )}
              </Button>
              {parseResult && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setParseText(""); setParseResult(null); setParseError(null); }}
                  className="text-xs text-gray-400"
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Error */}
            {parseError && (
              <div className="px-3 py-2 bg-red-900/20 border border-red-800/30 rounded-lg text-xs text-red-400">
                {parseError}
              </div>
            )}

            {/* Parsed result */}
            {parseResult && (
              <div className="border border-gray-800 rounded-lg bg-gray-950/50 divide-y divide-gray-800">
                {/* Hand info header */}
                <div className="p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-500">Site:</span>
                    <span className="text-gray-200 font-medium capitalize">{parseResult.site || "—"}</span>
                    {parseResult.format && parseResult.format !== parseResult.site && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-900/30 text-blue-400 border border-blue-800/30 capitalize">
                        {parseResult.format}
                      </span>
                    )}
                    {parseResult.stakes && (
                      <>
                        <span className="text-gray-500 ml-2">Stakes:</span>
                        <span className="text-gray-200 font-mono">
                          ${parseResult.stakes.sb}/{parseResult.stakes.bb}
                        </span>
                      </>
                    )}
                    {parseResult.game_type && (
                      <>
                        <span className="text-gray-500 ml-2">Game:</span>
                        <span className="text-gray-200">{parseResult.game_type}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {parseResult.board.length > 0 && (
                      <>
                        <span className="text-gray-500">Board:</span>
                        <BoardCards board={parseResult.board} />
                      </>
                    )}
                    {parseResult.pot != null && (
                      <>
                        <span className="text-gray-500 ml-2">Pot:</span>
                        <span className="text-gray-200 font-mono">{Number(parseResult.pot).toFixed(1)} bb</span>
                      </>
                    )}
                    {parseResult.hero_name && (
                      <>
                        <span className="text-gray-500 ml-2">Hero:</span>
                        <span className="text-blue-400 font-medium">{parseResult.hero_name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Street-by-street actions */}
                {Object.keys(parseResult.actions).length > 0 && (
                  <div className="p-3">
                    <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Actions
                    </h4>
                    <div className="space-y-2">
                      {(["preflop", "flop", "turn", "river", "showdown"] as const).map((street) => {
                        const streetActions = parseResult.actions[street];
                        if (!streetActions || streetActions.length === 0) return null;
                        return (
                          <div key={street}>
                            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                              {street === "preflop" ? "Preflop" : street.charAt(0).toUpperCase() + street.slice(1)}
                            </div>
                            <div className="space-y-0.5">
                              {streetActions.map((a, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 px-2 py-1 rounded text-xs bg-gray-800/30"
                                >
                                  <span className={cn(
                                    "font-medium",
                                    a.player === parseResult.hero_name ? "text-blue-400" : "text-gray-300",
                                  )}>
                                    {a.player}
                                  </span>
                                  <span className={cn(
                                    "font-mono",
                                    a.action === "fold" ? "text-red-500" :
                                    a.action === "call" ? "text-yellow-400" :
                                    a.action === "check" ? "text-gray-400" :
                                    (a.action === "bet" || a.action === "raise" || a.action === "allin" || a.action === "all-in") ? "text-green-400" :
                                    a.action === "blind" ? "text-orange-400" :
                                    "text-gray-300",
                                  )}>
                                    {a.action}
                                  </span>
                                  {a.amount !== null && (
                                    <span className="text-gray-400 font-mono">{a.amount.toFixed(1)}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Players */}
                {parseResult.players.length > 0 && (
                  <div className="p-3">
                    <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Players
                    </h4>
                    <div className="space-y-1">
                      {parseResult.players.map((p, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center justify-between px-2 py-1 rounded text-xs",
                            p.name === parseResult.hero_name
                              ? "bg-blue-900/20 border border-blue-800/30"
                              : "bg-gray-800/30",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-gray-200 font-medium">{p.name}</span>
                            {p.name === parseResult.hero_name && (
                              <span className="text-blue-400 text-[10px]">(hero)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-gray-400">
                            <span>Seat {p.seat}</span>
                            {p.position && <span>{p.position}</span>}
                            <span className="font-mono">{p.stack.toFixed(1)}</span>
                            {p.hole_cards && (
                              <span className="text-gray-300 font-mono">
                                {p.hole_cards.join(" ")}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Winners */}
                {parseResult.winners && parseResult.winners.length > 0 && (
                  <div className="p-3">
                    <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Winners
                    </h4>
                    <div className="space-y-1">
                      {parseResult.winners.map((w, i) => (
                        <div key={i} className="flex items-center gap-2 px-2 py-1 rounded text-xs bg-emerald-900/20 text-emerald-400">
                          <span className="font-medium">{w.player}</span>
                          <span className="font-mono">won {w.amount.toFixed(1)} bb</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats bar */}
      {stats && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="border border-gray-800 rounded-lg p-3 bg-gray-900/50 text-center">
            <div className="text-xl font-bold text-poker-gold">{stats.total_hands}</div>
            <div className="text-xs text-gray-500">Total Hands</div>
          </div>
          <div className="border border-gray-800 rounded-lg p-3 bg-gray-900/50 text-center">
            <div className="text-xl font-bold text-gray-200">{formatPot(stats.total_pot)}</div>
            <div className="text-xs text-gray-500">Total Pot (bb)</div>
          </div>
          <div className="border border-gray-800 rounded-lg p-3 bg-gray-900/50 text-center">
            <div className={cn("text-xl font-bold", (stats.total_ev_loss ?? 0) > 0 ? "text-red-400" : "text-emerald-400")}>
              {formatEV(stats.total_ev_loss)}
            </div>
            <div className="text-xs text-gray-500">Total EV Loss (bb)</div>
          </div>
          <div className="border border-gray-800 rounded-lg p-3 bg-gray-900/50 text-center">
            <div className="text-xl font-bold text-amber-400">
              {Object.keys(stats.by_site).length}
            </div>
            <div className="text-xs text-gray-500">Sites</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: filters + table */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {/* Filters */}
          <div className="border border-gray-800 rounded-lg bg-gray-900/50">
            <div className="p-3 border-b border-gray-800 flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Filters
              </span>
              {(siteFilter || spotFilter || positionFilter || dateFrom || dateTo || search) && (
                <button
                  onClick={() => {
                    setSiteFilter("");
                    setSpotFilter("");
                    setPositionFilter("");
                    setDateFrom("");
                    setDateTo("");
                    setSearch("");
                    setPage(0);
                  }}
                  className="ml-auto text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search hands..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Site */}
              <select
                value={siteFilter}
                onChange={(e) => { setSiteFilter(e.target.value); setPage(0); }}
                className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="">All Sites</option>
                {SITES.filter(Boolean).map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>

              {/* Spot category */}
              <select
                value={spotFilter}
                onChange={(e) => { setSpotFilter(e.target.value); setPage(0); }}
                className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="">All Spots</option>
                {SPOT_CATEGORIES.filter(Boolean).map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>

              {/* Position */}
              <input
                type="text"
                placeholder="Position (e.g., BTN, UTG)"
                value={positionFilter}
                onChange={(e) => { setPositionFilter(e.target.value); setPage(0); }}
                className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
              />

              {/* Date from */}
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
                className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500 [color-scheme:dark]"
              />

              {/* Date to */}
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
                className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="border border-gray-800 rounded-lg p-12 bg-gray-900/50 text-center">
              <div className="text-4xl mb-4 animate-pulse">📋</div>
              <p className="text-gray-400">Loading hand history...</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="border border-gray-800 rounded-lg p-8 bg-gray-900/50 text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-red-400 mb-4">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try Again
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <div className="border border-gray-800 rounded-lg p-12 bg-gray-900/50 text-center">
              <div className="text-5xl mb-4 opacity-50">🃏</div>
              <h2 className="text-xl font-semibold text-gray-300 mb-2">
                No Hands Found
              </h2>
              <p className="text-gray-500 text-sm max-w-md mx-auto mb-4">
                {hands.length === 0
                  ? "Import some hands to see them here. Use the Import page to upload hand history files."
                  : "No hands match your current filters. Try adjusting your search criteria."}
              </p>
              <div className="flex items-center justify-center gap-3">
                {hands.length === 0 && (
                  <Link href="/analyze">
                    <Button className="bg-poker-gold text-gray-900 hover:bg-poker-gold/90 font-semibold text-sm">
                      Import Hands
                    </Button>
                  </Link>
                )}
                {hands.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSiteFilter("");
                      setSpotFilter("");
                      setPositionFilter("");
                      setDateFrom("");
                      setDateTo("");
                      setSearch("");
                    }}
                    className="text-xs"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Results count */}
          {!loading && !error && filtered.length > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Showing {pageData.length} of {filtered.length} hand{filtered.length !== 1 ? "s" : ""}
                {filtered.length !== hands.length && (
                  <span className="text-blue-400 ml-1">({hands.length} total)</span>
                )}
              </span>
            </div>
          )}

          {/* Table */}
          {!loading && !error && pageData.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/80">
                    {[
                      { key: "created_at", label: "Date" },
                      { key: "site", label: "Site" },
                      { key: "hero_name", label: "Hero" },
                      { key: "spot_category", label: "Spot" },
                      { key: "board", label: "Board" },
                      { key: "pot", label: "Pot" },
                      { key: "ev_loss", label: "EV" },
                      { key: "actions", label: "" },
                    ].map((col) => (
                      <th
                        key={col.key}
                        onClick={col.key !== "board" && col.key !== "actions" ? () => handleSort(col.key) : undefined}
                        className={cn(
                          "px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                          col.key !== "board" && col.key !== "actions" && "cursor-pointer select-none hover:text-gray-300 transition-colors",
                        )}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {sortCol === col.key && (
                            <span className="text-blue-400">{sortDir === "asc" ? "↑" : "↓"}</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {pageData.map((hand) => (
                    <tr
                      key={hand.id}
                      onClick={() => handleSelectHand(hand.id)}
                      className={cn(
                        "cursor-pointer transition-colors",
                        selectedHand?.id === hand.id
                          ? "bg-blue-900/20 hover:bg-blue-900/30"
                          : "hover:bg-gray-800/50",
                      )}
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-400">
                        {formatDate(hand.created_at)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs font-medium">
                        <span className={cn(
                          "inline-block px-1.5 py-0.5 rounded",
                          hand.site === "pokerstars" ? "bg-green-900/30 text-green-400" :
                          hand.site === "ggpoker" ? "bg-blue-900/30 text-blue-400" :
                          hand.site === "winamax" ? "bg-yellow-900/30 text-yellow-400" :
                          "bg-gray-700 text-gray-300",
                        )}>
                          {SITE_LABELS[hand.site] || hand.site}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-200 font-medium">
                        {hand.hero_name || "—"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {hand.spot_category ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-blue-900/30 text-blue-400 border border-blue-800/30">
                            {hand.spot_category.replace(/_/g, " ")}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <BoardCards board={hand.board} />
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm font-mono text-gray-200">
                        {formatPot(hand.pot)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm font-mono">
                        {hand.ev_loss !== null ? (
                          <span className={cn(
                            hand.ev_loss > 10 ? "text-red-500" :
                            hand.ev_loss > 5 ? "text-orange-500" :
                            hand.ev_loss > 0 ? "text-yellow-500" :
                            "text-emerald-400",
                          )}>
                            {formatEV(hand.ev_loss)}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSelectHand(hand.id); }}
                          className="p-1.5 rounded hover:bg-gray-700 transition-colors"
                          title="View details"
                        >
                          <Eye className="h-3.5 w-3.5 text-gray-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage(0)}
                disabled={safePage === 0}
                className="p-1.5 rounded hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const start = Math.max(0, Math.min(safePage - 3, totalPages - 7));
                const pageNum = start + i;
                if (pageNum >= totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      "px-3 py-1 text-sm rounded-lg transition-colors",
                      pageNum === safePage
                        ? "bg-poker-gold text-gray-900 font-semibold"
                        : "text-gray-400 hover:bg-gray-800",
                    )}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(totalPages - 1)}
                disabled={safePage === totalPages - 1}
                className="p-1.5 rounded hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Right: hand detail panel */}
        <div className="flex flex-col gap-4">
          {selectedHandLoading ? (
            <div className="border border-gray-800 rounded-lg p-8 bg-gray-900/50 text-center">
              <div className="text-3xl mb-3 animate-pulse">🔍</div>
              <p className="text-gray-400 text-sm">Loading hand details...</p>
            </div>
          ) : detailError ? (
            <div className="border border-gray-800 rounded-lg p-6 bg-gray-900/50 text-center">
              <div className="text-3xl mb-3">⚠️</div>
              <p className="text-red-400 text-sm">{detailError}</p>
              <button
                onClick={() => selectedHand && fetchHandDetail(selectedHand.id)}
                className="mt-3 text-xs text-blue-400 hover:text-blue-300"
              >
                Retry
              </button>
            </div>
          ) : selectedHand ? (
            <div className="border border-gray-800 rounded-lg bg-gray-900/50 overflow-hidden">
              {/* Detail header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="font-semibold text-sm text-gray-200">
                  Hand #{selectedHand.id.slice(0, 8)}
                </h3>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    selectedHand.site === "pokerstars" ? "bg-green-900/30 text-green-400" :
                    selectedHand.site === "ggpoker" ? "bg-blue-900/30 text-blue-400" :
                    "bg-gray-700 text-gray-300",
                  )}>
                    {selectedHand.site}
                  </span>
                  <button
                    onClick={() => setSelectedHand(null)}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Key info grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Hero:</span>{" "}
                    <span className="text-gray-200 font-medium">{selectedHand.hero_name || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Game:</span>{" "}
                    <span className="text-gray-200">{selectedHand.game_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Pot:</span>{" "}
                    <span className="text-gray-200 font-mono">{selectedHand.pot.toFixed(1)} bb</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Board:</span>{" "}
                    <BoardCards board={selectedHand.board} />
                  </div>
                  <div>
                    <span className="text-gray-500">Spot:</span>{" "}
                    <span className="text-gray-200">{selectedHand.spot_category?.replace(/_/g, " ") || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">EV Loss:</span>{" "}
                    <span className={cn(
                      "font-mono",
                      (selectedHand.ev_loss ?? 0) > 5 ? "text-red-400" : "text-gray-200",
                    )}>
                      {formatEV(selectedHand.ev_loss)} bb
                    </span>
                  </div>
                  {selectedHand.stakes && (
                    <div>
                      <span className="text-gray-500">Stakes:</span>{" "}
                      <span className="text-gray-200 font-mono">
                        ${selectedHand.stakes.sb}/${selectedHand.stakes.bb}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Date:</span>{" "}
                    <span className="text-gray-200">{formatDate(selectedHand.created_at)}</span>
                  </div>
                </div>

                {/* Players */}
                {selectedHand.players && selectedHand.players.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Players
                    </h4>
                    <div className="space-y-1">
                      {selectedHand.players.map((p, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center justify-between px-2 py-1 rounded text-xs",
                            p.name === selectedHand.hero_name
                              ? "bg-blue-900/20 border border-blue-800/30"
                              : "bg-gray-800/50",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-gray-200 font-medium">{p.name}</span>
                            {p.name === selectedHand.hero_name && (
                              <span className="text-blue-400 text-[10px]">(hero)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-gray-400">
                            <span>Seat {p.seat}</span>
                            {p.position && <span>{p.position}</span>}
                            <span className="font-mono">{p.stack.toFixed(1)}</span>
                            {p.hole_cards && (
                              <span className="text-gray-300 font-mono">
                                {p.hole_cards.join(" ")}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions timeline */}
                {selectedHand.actions && selectedHand.actions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Actions
                    </h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {selectedHand.actions.map((a, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-2 py-1 rounded text-xs bg-gray-800/30"
                        >
                          <span className="text-gray-500 w-14 shrink-0">{a.street}</span>
                          <span className={cn(
                            "font-medium",
                            a.player === selectedHand.hero_name ? "text-blue-400" : "text-gray-300",
                          )}>
                            {a.player}
                          </span>
                          <span className={cn(
                            "font-mono",
                            a.action_type === "fold" ? "text-red-500" :
                            a.action_type === "call" ? "text-yellow-400" :
                            a.action_type === "check" ? "text-gray-400" :
                            a.action_type === "bet" || a.action_type === "raise" ? "text-green-400" :
                            "text-gray-300",
                          )}>
                            {a.action_type}
                          </span>
                          {a.amount !== null && (
                            <span className="text-gray-400 font-mono">{a.amount.toFixed(1)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedHand.tags && selectedHand.tags.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedHand.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded text-xs bg-purple-900/30 text-purple-400 border border-purple-800/30"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw hand text */}
                <div>
                  <details className="group">
                    <summary className="text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 transition-colors list-none flex items-center gap-2">
                      <span>Raw Hand Text</span>
                      <span className="text-gray-600 group-open:rotate-90 transition-transform">▶</span>
                    </summary>
                    <pre className="mt-2 text-xs font-mono text-gray-400 whitespace-pre-wrap bg-gray-950 rounded p-3 max-h-64 overflow-y-auto border border-gray-800">
                      {selectedHand.raw_text}
                    </pre>
                  </details>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-gray-800 rounded-lg flex flex-col items-center justify-center p-8 text-center bg-gray-900/50">
              <Eye className="h-8 w-8 text-gray-600 mb-3" />
              <p className="text-sm text-gray-500">
                Select a hand from the table to view details here.
              </p>
            </div>
          )}

          {/* Stats by site */}
          {stats && !loading && (
            <div className="border border-gray-800 rounded-lg p-4 bg-gray-900/50">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Hands by Site
              </h3>
              <div className="space-y-2">
                {Object.entries(stats.by_site).length === 0 ? (
                  <p className="text-xs text-gray-600">No data</p>
                ) : (
                  Object.entries(stats.by_site).map(([site, data]) => (
                    <div key={site} className="flex items-center justify-between text-xs">
                      <span className="text-gray-300 font-medium capitalize">{site}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400">{data.count} hands</span>
                        <span className={cn(
                          "font-mono",
                          (data.total_ev_loss ?? 0) > 0 ? "text-red-400" : "text-gray-400",
                        )}>
                          {formatEV(data.total_ev_loss)} bb
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
