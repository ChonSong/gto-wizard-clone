"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface VariantInfo {
  key: string;
  name: string;
  short_name: string;
  category: "flop" | "stud" | "draw";
  hole_count: number;
  board_count: number;
  description: string;
}

interface VariantMeta {
  icon: string;
  color: string;
  bgColor: string;
}

type CategoryTab = "all" | "flop" | "stud" | "draw";

// ============================================================================
// Metadata
// ============================================================================

const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  flop: { label: "Flop / Community", icon: "🃏" },
  stud: { label: "Stud", icon: "♠️" },
  draw: { label: "Draw", icon: "🔄" },
};

const VARIANT_META: Record<string, VariantMeta> = {
  nlh:    { icon: "♣️", color: "text-green-400", bgColor: "bg-green-500/10" },
  plo4:   { icon: "♦️", color: "text-blue-400", bgColor: "bg-blue-500/10" },
  plo5:   { icon: "♦️", color: "text-blue-300", bgColor: "bg-blue-500/10" },
  omaha8: { icon: "🎯", color: "text-purple-400", bgColor: "bg-purple-500/10" },
  stud:   { icon: "♠️", color: "text-red-400", bgColor: "bg-red-500/10" },
  stud8:  { icon: "♠️", color: "text-orange-400", bgColor: "bg-orange-500/10" },
  razz:   { icon: "⬇️", color: "text-yellow-400", bgColor: "bg-yellow-500/10" },
  "2-7td": { icon: "🔄", color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
  "2-7sd": { icon: "🎲", color: "text-teal-400", bgColor: "bg-teal-500/10" },
  badugi: { icon: "🌈", color: "text-pink-400", bgColor: "bg-pink-500/10" },
};

/** Map variant keys to their equity calculator page URLs */
function getEquityUrl(variant: VariantInfo): string {
  const slots: Record<string, string> = {
    nlh:    "/equity",
    plo4:   "/equity/plo",
    plo5:   "/equity/plo",
    omaha8: "/equity/omaha",
    stud:   "/equity/stud",
    stud8:  "/equity/stud",
    razz:   "/equity/razz",
    "2-7td": "/equity/2-7td",
    "2-7sd": "/equity/2-7sd",
    badugi: "/equity/badugi",
  };
  return slots[variant.key] || "/equity";
}

function hasDedicatedPage(variant: VariantInfo): boolean {
  const dedicated = new Set(["nlh", "plo4", "plo5", "omaha8", "stud", "stud8", "razz", "2-7td", "2-7sd", "badugi"]);
  return dedicated.has(variant.key);
}

// ============================================================================
// Component
// ============================================================================

export default function VariantsPage() {
  const [variants, setVariants] = useState<VariantInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CategoryTab>("all");

  useEffect(() => {
    fetch("/api/v1/variants")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setVariants(data.variants ?? []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch variants:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filteredVariants = activeTab === "all"
    ? variants
    : variants.filter((v) => v.category === activeTab);

  const tabs: { key: CategoryTab; label: string; count: number }[] = [
    { key: "all", label: "All Variants", count: variants.length },
    ...(["flop", "stud", "draw"] as const).map((cat) => ({
      key: cat as CategoryTab,
      label: CATEGORY_CONFIG[cat]?.label || cat,
      count: variants.filter((v) => v.category === cat).length,
    })),
  ];

  const categoryCounts = ["flop", "stud", "draw"].reduce(
    (acc, cat) => ({ ...acc, [cat]: variants.filter((v) => v.category === cat).length }),
    {} as Record<string, number>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-poker-gold">Poker Variants</h1>
        <p className="text-gray-400 mt-1">
          Explore all {variants.length} supported poker variants and calculate equity for each.
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard value={variants.length} label="Total Variants" color="text-poker-gold" />
        <StatCard value={categoryCounts.flop ?? 0} label="Flop Variants" color="text-green-400" />
        <StatCard value={categoryCounts.stud ?? 0} label="Stud Variants" color="text-red-400" />
        <StatCard value={categoryCounts.draw ?? 0} label="Draw Variants" color="text-cyan-400" />
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.key
                ? "bg-poker-gold text-gray-900"
                : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
            )}
          >
            {tab.label}
            <span className="ml-1.5 opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">🃏</div>
          <p className="text-gray-400">Loading variants...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 border border-gray-800 rounded-lg">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400">Failed to load variants: {error}</p>
        </div>
      ) : filteredVariants.length === 0 ? (
        <div className="text-center py-12 border border-gray-800 rounded-lg">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-gray-400">No variants match the selected category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVariants.map((variant) => {
            const meta = VARIANT_META[variant.key] || {
              icon: "🃏", color: "text-gray-400", bgColor: "bg-gray-500/10",
            };
            const hasPage = hasDedicatedPage(variant);

            return (
              <div
                key={variant.key}
                className={cn(
                  "p-5 rounded-lg border bg-gray-900/50 transition-all hover:scale-[1.02]",
                  "border-gray-800 hover:border-gray-700"
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-xl",
                      meta.bgColor
                    )}
                  >
                    <span>{meta.icon}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white truncate">{variant.name}</h3>
                      <span className="flex-shrink-0 text-xs text-gray-500 font-mono">
                        {variant.short_name}
                      </span>
                    </div>

                    {/* Category badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-xs capitalize border",
                          variant.category === "flop" && "bg-green-500/10 text-green-400 border-green-500/20",
                          variant.category === "stud" && "bg-red-500/10 text-red-400 border-red-500/20",
                          variant.category === "draw" && "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
                        )}
                      >
                        {variant.category}
                      </span>
                      <span className="text-xs text-gray-500">
                        {variant.hole_count} cards{variant.board_count > 0 ? ` · ${variant.board_count} board` : " · no board"}
                      </span>
                    </div>

                    {variant.description && (
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                        {variant.description}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={getEquityUrl(variant)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                          hasPage
                            ? "bg-poker-gold text-gray-900 hover:opacity-90"
                            : "bg-gray-800 text-gray-400 hover:text-white border border-gray-700"
                        )}
                      >
                        {hasPage ? "🎯 Open Equity Calculator" : "🔧 Coming Soon"}
                      </Link>
                      <Link
                        href={`/api/v1/variants/${variant.key}`}
                        className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-700 transition-all"
                      >
                        API ↗
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend Footer */}
      <div className="mt-8 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">About Poker Variant Categories</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-green-400">Flop</span>
            <p className="text-gray-500 text-xs mt-0.5">
              Community card games with shared board cards. Variants differ in hole card count and hand rankings.
            </p>
          </div>
          <div>
            <span className="font-medium text-red-400">Stud</span>
            <p className="text-gray-500 text-xs mt-0.5">
              Each player receives a mix of face-down and face-up cards. No community cards — all hands are individual.
            </p>
          </div>
          <div>
            <span className="font-medium text-cyan-400">Draw</span>
            <p className="text-gray-500 text-xs mt-0.5">
              Players can replace cards in their hand over one or more drawing rounds to improve their holding.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-center">
      <div className={cn("text-2xl font-bold", color)}>{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}
