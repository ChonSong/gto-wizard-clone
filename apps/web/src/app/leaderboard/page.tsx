"use client";

import { useState, useEffect } from "react";
import { getUserId } from "@/lib/user-id";

// Types matching the API response
interface LeaderboardEntry {
  rank: number;
  user_id: string;
  user_name: string | null;
  score: number;
  accuracy: number;
  correct_count: number;
  total_solves: number;
  avg_ev_loss: number;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  total_users: number;
  user_rank: number | null;
}

const GREEN = "#00C853";
const RED = "#E53935";
const BLUE = "#3A6EA5";
const BG = "#0E0E0E";
const PANEL = "#1A1A1A";
const BORDER = "#2A2A2A";
const TEXT = "#E0E0E0";
const MUTED = "#888";

const PERIODS = [
  { key: "all-time", label: "All Time" },
  { key: "weekly", label: "Weekly" },
  { key: "daily", label: "Daily" },
];

function accuracyColor(acc: number): string {
  if (acc >= 80) return GREEN;
  if (acc >= 50) return "#FFC107";
  return RED;
}

function evColor(ev: number): string {
  if (ev <= 0) return GREEN;
  if (ev <= 0.5) return "#FFC107";
  return RED;
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("all-time");

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      setError(null);
      try {
        const userId = getUserId();
        const res = await fetch(
          `/api/v1/quiz/leaderboard?limit=100&user_id=${encodeURIComponent(userId)}&period=${period}`
        );
        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [period]);

  if (loading) {
    return (
      <div style={{ height: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED }}>
        Loading leaderboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: RED }}>
        <div style={{ fontSize: 48, opacity: 0.3 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Error loading leaderboard</div>
        <div style={{ fontSize: 13, color: MUTED }}>{error}</div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8,
            padding: "8px 20px",
            borderRadius: 6,
            border: `1px solid ${GREEN}`,
            background: "transparent",
            color: GREEN,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.entries.length === 0) {
    return (
      <div style={{ height: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: MUTED }}>
        <div style={{ fontSize: 48, opacity: 0.3 }}>🏆</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: TEXT }}>No leaderboard data yet</div>
        <div style={{ fontSize: 13, textAlign: "center", maxWidth: 400, lineHeight: 1.5 }}>
          Start a study session on the{" "}
          <a href="/study" style={{ color: GREEN, textDecoration: "none" }}>
            Study page
          </a>{" "}
          to track your progress and compete on the leaderboard.
        </div>
      </div>
    );
  }

  const currentUserId = typeof window !== "undefined" ? getUserId() : null;

  return (
    <div
      style={{
        height: "100vh",
        background: BG,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        color: TEXT,
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Leaderboard</h1>
          <span style={{ fontSize: 11, color: MUTED, background: "#1A1A1A", padding: "2px 8px", borderRadius: 4 }}>
            {data.total_users} players
          </span>
          {data.user_rank && (
            <span style={{ fontSize: 11, color: GREEN, background: `rgba(0,200,83,0.1)`, padding: "2px 8px", borderRadius: 4 }}>
              Your rank: #{data.user_rank}
            </span>
          )}
        </div>
        <a
          href="/study"
          style={{
            fontSize: 12,
            color: GREEN,
            textDecoration: "none",
            padding: "6px 14px",
            borderRadius: 6,
            border: `1px solid ${GREEN}`,
            fontWeight: 600,
          }}
        >
          ← Back to Study
        </a>
      </div>

      {/* Period Filter */}
      <div
        style={{
          padding: "12px 24px",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: `1px solid ${period === p.key ? GREEN : BORDER}`,
              background: period === p.key ? `rgba(0,200,83,0.1)` : "transparent",
              color: period === p.key ? GREEN : MUTED,
              fontSize: 12,
              fontWeight: period === p.key ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, background: BG }}>
              <th style={{ padding: "10px 16px", textAlign: "left", color: MUTED, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, width: 60 }}>
                Rank
              </th>
              <th style={{ padding: "10px 16px", textAlign: "left", color: MUTED, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Player
              </th>
              <th style={{ padding: "10px 16px", textAlign: "right", color: MUTED, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, width: 80 }}>
                Score
              </th>
              <th style={{ padding: "10px 16px", textAlign: "right", color: MUTED, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, width: 90 }}>
                Accuracy
              </th>
              <th style={{ padding: "10px 16px", textAlign: "right", color: MUTED, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, width: 80 }}>
                Hands
              </th>
              <th style={{ padding: "10px 16px", textAlign: "right", color: MUTED, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, width: 100 }}>
                Avg EV Loss
              </th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((entry) => {
              const isCurrentUser = entry.user_id === currentUserId;
              return (
                <tr
                  key={entry.user_id}
                  style={{
                    borderBottom: `1px solid ${BORDER}`,
                    background: isCurrentUser ? "rgba(0,200,83,0.05)" : "transparent",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrentUser) e.currentTarget.style.background = "#141414";
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrentUser) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <td style={{ padding: "10px 16px", fontWeight: 600 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {entry.rank <= 3 ? (
                        <span style={{ fontSize: 16 }}>
                          {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                        </span>
                      ) : (
                        <span style={{ color: MUTED }}>#{entry.rank}</span>
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "10px 16px",
                      fontWeight: isCurrentUser ? 700 : 500,
                      color: isCurrentUser ? GREEN : TEXT,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {entry.user_name || entry.user_id.slice(0, 8)}
                      {isCurrentUser && (
                        <span
                          style={{
                            fontSize: 9,
                            padding: "1px 6px",
                            borderRadius: 10,
                            background: GREEN,
                            color: "#000",
                            fontWeight: 700,
                          }}
                        >
                          YOU
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600 }}>
                    {entry.score.toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>
                    <span style={{ fontWeight: 600, color: accuracyColor(entry.accuracy) }}>
                      {entry.accuracy.toFixed(1)}%
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right", color: MUTED }}>
                    {entry.total_solves}
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>
                    <span style={{ fontWeight: 600, color: evColor(entry.avg_ev_loss) }}>
                      {entry.avg_ev_loss.toFixed(3)} bb
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
