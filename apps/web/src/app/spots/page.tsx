"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { gtoTheme } from "@/styles/gto-tokens";
import { StrategyCard } from "@/components/ui/StrategyCard";
import { StrategyHeatmap } from "@/components/ui/StrategyHeatmap";

type Position = "BTN" | "SB" | "BB" | "CO" | "MP" | "UTG";
type BoardType = "dry" | "wet" | "paired" | "rainbow" | "monochrome";

interface CommunitySpot {
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
  strategy_json: Record<string, { action: "raise" | "call" | "fold"; frequency: number; ev: number }>;
  comments_count?: number;
  parent_spot_id?: string;
  fork_count?: number;
}

interface ApiResponse {
  spots: CommunitySpot[];
  total: number;
  offset: number;
  limit: number;
}

const API_BASE = "/api/v1";

export default function SpotsPage() {
  const [spots, setSpots] = useState<CommunitySpot[]>([]);
  const router = useRouter();
  const [filterPosition, setFilterPosition] = useState<Position | "all">("all");
  const [filterBoardType, setFilterBoardType] = useState<BoardType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpot, setSelectedSpot] = useState<CommunitySpot | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedSpots, setLikedSpots] = useState<Set<string>>(new Set());

  // Fetch spots from API
  const fetchSpots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (sortBy === "popular") params.set("sort_by", "popular");
      else params.set("sort_by", "recent");
      params.set("limit", "100");
      
      const response = await fetch(`${API_BASE}/spots?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch spots");
      
      const data: ApiResponse = await response.json();
      setSpots(data.spots);
      
      // Select first spot if none selected
      if (!selectedSpot && data.spots.length > 0) {
        setSelectedSpot(data.spots[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching spots:", err);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    fetchSpots();
  }, [fetchSpots]);

  // Fetch user's liked spots (in real app would be from auth context)
  useEffect(() => {
    // For now, load from localStorage
    const saved = localStorage.getItem("likedSpots");
    if (saved) {
      setLikedSpots(new Set(JSON.parse(saved)));
    }
  }, []);

  const handleLike = async (spotId: string) => {
    const isLiked = likedSpots.has(spotId);
    const newLikedSpots = new Set(likedSpots);
    
    if (isLiked) {
      newLikedSpots.delete(spotId);
    } else {
      newLikedSpots.add(spotId);
    }
    
    setLikedSpots(newLikedSpots);
    localStorage.setItem("likedSpots", JSON.stringify([...newLikedSpots]));

    // Update spot likes optimistically
    setSpots((prev) =>
      prev.map((spot) =>
        spot.id === spotId
          ? { ...spot, likes: isLiked ? spot.likes - 1 : spot.likes + 1 }
          : spot
      )
    );
    if (selectedSpot?.id === spotId) {
      setSelectedSpot((prev) =>
        prev
          ? {
              ...prev,
              likes: isLiked ? prev.likes - 1 : prev.likes + 1,
            }
          : null
      );
    }

    // Call API
    try {
      const method = isLiked ? "DELETE" : "POST";
      await fetch(`${API_BASE}/spots/${spotId}/like?user_id=anonymous`, { method });
    } catch (err) {
      console.error("Error updating like:", err);
      // Revert on error
      setLikedSpots(new Set(likedSpots));
      fetchSpots();
    }
  };

  const filteredSpots = spots
    .filter((spot) => {
      if (filterPosition !== "all" && spot.position.toUpperCase() !== filterPosition) return false;
      if (filterBoardType !== "all" && spot.board_type !== filterBoardType) return false;
      if (searchQuery && !spot.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "popular") return b.likes - a.likes;
      return 0;
    });

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffHours < 1) return "Just now";
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-poker-gold">Community Spots</h1>
          <p className="text-sm sm:text-base text-gray-400 mt-1">Share and learn from shared GTO strategy spots</p>
        </div>
        <button className="px-4 py-2 bg-poker-gold text-gray-900 rounded-lg font-semibold hover:opacity-90 transition-opacity">
          + Share New Spot
        </button>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-6 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <div>
            <div className="text-lg font-bold text-white">{spots.length}</div>
            <div className="text-xs text-gray-400">Total Spots</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">❤️</span>
          <div>
            <div className="text-lg font-bold text-white">{spots.reduce((sum, s) => sum + s.likes, 0)}</div>
            <div className="text-xs text-gray-400">Total Likes</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">👥</span>
          <div>
            <div className="text-lg font-bold text-white">{new Set(spots.map((s) => s.author)).size}</div>
            <div className="text-xs text-gray-400">Contributors</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-gray-400">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "recent" | "popular")}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search spots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Position</label>
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value as Position | "all")}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="all">All Positions</option>
            <option value="BTN">Button</option>
            <option value="SB">Small Blind</option>
            <option value="BB">Big Blind</option>
            <option value="CO">Cutoff</option>
            <option value="MP">Middle Position</option>
            <option value="UTG">UTG</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Board Type</label>
          <select
            value={filterBoardType}
            onChange={(e) => setFilterBoardType(e.target.value as BoardType | "all")}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="all">All Types</option>
            <option value="dry">Dry</option>
            <option value="wet">Wet</option>
            <option value="paired">Paired</option>
            <option value="rainbow">Rainbow</option>
            <option value="monochrome">Monochrome</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="text-white text-lg">Loading spots...</div>
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <div className="text-red-400 text-lg mb-2">Error: {error}</div>
          <button 
            onClick={fetchSpots}
            className="px-4 py-2 bg-poker-gold text-gray-900 rounded-lg font-semibold hover:opacity-90"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Spots List */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Shared Strategy Spots</h2>
            <div className="space-y-4">
              {filteredSpots.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No spots found. Be the first to share one!
                </div>
              ) : (
                filteredSpots.map((spot) => (
                  <button
                    key={spot.id}
                    onClick={() => setSelectedSpot(spot)}
                    className={cn(
                      "w-full p-4 rounded-lg border text-left transition-all",
                      selectedSpot?.id === spot.id
                        ? "border-poker-gold bg-poker-gold/10"
                        : "border-gray-800 bg-gray-900/50 hover:border-gray-700"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-semibold text-white">{spot.board}</span>
                          <span className="px-2 py-0.5 rounded text-xs bg-poker-gold/20 text-poker-gold">
                            {spot.position}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-400 capitalize">
                            {spot.board_type}
                          </span>
                        </div>
                        <h3 className="font-medium text-white mb-1">{spot.title}</h3>
                        <p className="text-sm text-gray-400 line-clamp-1">{spot.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-500">by {spot.author}</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-gray-500">{formatDate(spot.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLike(spot.id);
                          }}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors",
                            likedSpots.has(spot.id)
                              ? "text-red-400 bg-red-400/10"
                              : "text-gray-400 hover:text-red-400"
                          )}
                        >
                          <span>❤️</span>
                          <span>{spot.likes}</span>
                        </button>
                        <div className="flex gap-1">
                          {spot.tags?.slice(0, 2).map((tag) => (
                            <span key={tag} className="px-1.5 py-0.5 rounded text-xs bg-gray-800 text-gray-400">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Spot Detail */}
          <div className="space-y-6">
            {selectedSpot ? (
              <>
                <div className="border border-gray-800 rounded-lg bg-gray-900/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{selectedSpot.title}</h3>
                    <button
                      onClick={() => handleLike(selectedSpot.id)}
                      className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors",
                        likedSpots.has(selectedSpot.id)
                          ? "text-red-400 bg-red-400/10 border border-red-400/30"
                          : "text-gray-400 bg-gray-800 border border-gray-700 hover:text-red-400"
                      )}
                    >
                      <span>❤️</span>
                      <span>{selectedSpot.likes}</span>
                    </button>
                  </div>

                  <p className="text-gray-300 mb-4">{selectedSpot.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedSpot.tags?.map((tag) => (
                      <span key={tag} className="px-2 py-1 rounded text-xs bg-gray-800 text-gray-400">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                    <span>by <span className="text-white">{selectedSpot.author}</span></span>
                    <span>·</span>
                    <span>{formatDate(selectedSpot.created_at)}</span>
                  </div>

                  <StrategyCard
                    board={selectedSpot.board}
                    potSize={selectedSpot.pot_size}
                    stackDepth={selectedSpot.stack_depth}
                    position={selectedSpot.position}
                  />
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-4">Strategy Heatmap</h4>
                  <div className="border border-gray-800 rounded-lg bg-gray-900/50 p-4 overflow-x-auto">
                    <StrategyHeatmap
                      strategy={selectedSpot.strategy_json}
                      boardCards={selectedSpot.board}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                    onClick={() => {
                      if (!selectedSpot) return
                      const board = selectedSpot.board
                      const position = selectedSpot.position
                      const stack = selectedSpot.stack_depth
                      const bt = selectedSpot.board_type ? selectedSpot.board_type.toLowerCase() : 'flop'
                      const street = bt === 'turn' ? 'turn' : bt === 'river' ? 'river' : bt === 'preflop' ? 'preflop' : 'flop'
                      router.push(`/study?board=${board}&position=${position}&stack=${stack}&street=${street}`)
                    }}
                  >
                    Practice This Spot
                  </button>
                  <button className="py-2 px-4 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors border border-gray-700">
                    Share
                  </button>
                </div>
              </>
            ) : (
              <div className="border border-gray-800 rounded-lg p-8 text-center bg-gray-900/50">
                <div className="text-4xl mb-4">🎯</div>
                <p className="text-gray-400">Select a spot to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
