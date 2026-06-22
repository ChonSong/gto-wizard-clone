"use client";

import { useState, useEffect } from "react";
import { getUserId } from "@/lib/user-id";

// Types matching the API response
interface PositionStats {
  position: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface ActionTypeStats {
  action_type: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface RecentSession {
  date: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface ProgressData {
  user_id: string;
  total_hands: number;
  correct_hands: number;
  overall_accuracy: number;
  current_streak: number;
  best_streak: number;
  by_position: PositionStats[];
  by_action: ActionTypeStats[];
  recent_sessions: RecentSession[];
  last_week: { date: string; total: number; correct: number }[];
}

const GREEN = "#00C853";
const RED = "#E53935";
const BLUE = "#3A6EA5";
const BG = "#0E0E0E";
const PANEL = "#1A1A1A";
const BORDER = "#2A2A2A";
const TEXT = "#E0E0E0";
const MUTED = "#888";

const ACTION_COLORS: Record<string, string> = {
  "raise_2.5bb": RED,
  "raise_2.0bb": RED,
  "raise_3.0bb": RED,
  "raise_4.0bb": RED,
  "raise_5.0bb": RED,
  "raise_7.0bb": RED,
  "raise_10.0bb": RED,
  call: BLUE,
  fold: "#666",
  all_in: "#7B1E1E",
};

function accuracyColor(acc: number): string {
  if (acc >= 0.8) return GREEN;
  if (acc >= 0.5) return "#FFC107";
  return RED;
}

function AccuracyBar({ value, color }: { value: number; color?: string }) {
  const barColor = color || accuracyColor(value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: "#2A2A2A", borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${(value * 100).toFixed(0)}%`,
            background: barColor,
            borderRadius: 4,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: barColor, minWidth: 36, textAlign: "right" }}>
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function StatCard({ label, value, subtitle, color }: { label: string; value: string | number; subtitle?: string; color?: string }) {
  return (
    <div
      style={{
        background: PANEL,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ fontSize: 11, color: MUTED, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || TEXT }}>
        {value}
      </div>
      {subtitle && <div style={{ fontSize: 11, color: MUTED }}>{subtitle}</div>}
    </div>
  );
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProgress() {
      try {
        const userId = getUserId();
        const res = await fetch(`/api/v1/study/progress?user_id=${encodeURIComponent(userId)}`);
        if (!res.ok) {
          if (res.status === 404 || res.status === 400) {
            setData(null);
            setLoading(false);
            return;
          }
          throw new Error(`API error: ${res.status}`);
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load progress");
      } finally {
        setLoading(false);
      }
    }
    fetchProgress();
  }, []);

  if (loading) {
    return (
      <div style={{ height: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED }}>
        Loading progress...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", color: RED }}>
        Error: {error}
      </div>
    );
  }

  if (!data || data.total_hands === 0) {
    return (
      <div style={{ height: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: MUTED }}>
        <div style={{ fontSize: 48, opacity: 0.3 }}>📊</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: TEXT }}>No study data yet</div>
        <div style={{ fontSize: 13, textAlign: "center", maxWidth: 400 }}>
          Start a study session on the{" "}
          <a href="/study" style={{ color: GREEN, textDecoration: "none" }}>
            Study page
          </a>{" "}
          to track your progress. Each "Check vs GTO" interaction will be saved here.
        </div>
      </div>
    );
  }

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
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>My Progress</h1>
          <span style={{ fontSize: 11, color: MUTED, background: "#1A1A1A", padding: "2px 8px", borderRadius: 4 }}>
            {data.total_hands} hands studied
          </span>
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

      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
        {/* Stats Cards Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
          <StatCard label="Overall Accuracy" value={`${(data.overall_accuracy * 100).toFixed(0)}%`} subtitle={`${data.correct_hands} / ${data.total_hands} correct`} color={accuracyColor(data.overall_accuracy)} />
          <StatCard label="Current Streak" value={data.current_streak} subtitle="Consecutive correct" color={GREEN} />
          <StatCard label="Best Streak" value={data.best_streak} subtitle="Personal record" color={BLUE} />
          <StatCard label="Total Hands" value={data.total_hands} subtitle="Across all sessions" />
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {/* Accuracy by Position */}
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 12px", color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Accuracy by Position
            </h3>
            {data.by_position.length === 0 ? (
              <div style={{ fontSize: 12, color: MUTED }}>No data yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.by_position.map((p) => (
                  <div key={p.position}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                      <span style={{ fontWeight: 600 }}>{p.position}</span>
                      <span style={{ color: MUTED }}>
                        {p.correct}/{p.total}
                      </span>
                    </div>
                    <AccuracyBar value={p.accuracy} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Accuracy by Action Type */}
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 12px", color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Accuracy by Action
            </h3>
            {data.by_action.length === 0 ? (
              <div style={{ fontSize: 12, color: MUTED }}>No data yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.by_action.map((a) => (
                  <div key={a.action_type}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                      <span style={{ fontWeight: 600, color: ACTION_COLORS[a.action_type] || TEXT }}>{a.action_type}</span>
                      <span style={{ color: MUTED }}>
                        {a.correct}/{a.total}
                      </span>
                    </div>
                    <AccuracyBar value={a.accuracy} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Last 7 Days Chart */}
        {data.last_week.length > 0 && (
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, marginBottom: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 12px", color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Last 7 Days
            </h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
              {data.last_week.map((day) => {
                const maxTotal = Math.max(...data.last_week.map((d) => d.total), 1);
                const height = (day.total / maxTotal) * 80;
                return (
                  <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ position: "relative", width: "100%", height: 80, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                      <div
                        style={{
                          width: "60%",
                          height: `${Math.max(height, 4)}px`,
                          background: day.total > 0 ? GREEN : BORDER,
                          borderRadius: "4px 4px 0 0",
                          opacity: day.total > 0 ? 1 : 0.3,
                          minHeight: 4,
                        }}
                      >
                        <div
                          style={{
                            height: `${(day.correct / Math.max(day.total, 1)) * 100}%`,
                            background: accuracyColor(day.correct / Math.max(day.total, 1)),
                            borderRadius: "4px 4px 0 0",
                            transition: "height 0.3s ease",
                          }}
                        />
                      </div>
                    </div>
                    <span style={{ fontSize: 9, color: MUTED }}>
                      {new Date(day.date).toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <span style={{ fontSize: 9, color: MUTED }}>
                      {day.correct}/{day.total}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {data.recent_sessions.length > 0 && (
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 12px", color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Recent Sessions
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.recent_sessions.slice(0, 10).map((s) => (
                <div
                  key={s.date}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: "#141414",
                    fontSize: 12,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{s.date}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ color: MUTED }}>
                      {s.correct}/{s.total} correct
                    </span>
                    <span style={{ fontWeight: 600, color: accuracyColor(s.accuracy) }}>{(s.accuracy * 100).toFixed(0)}%</span>
                    <AccuracyBar value={s.accuracy} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
