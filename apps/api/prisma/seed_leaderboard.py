#!/usr/bin/env python3
"""
Seed demo leaderboard data into the PostgreSQL user_stats table.

Creates realistic sample leaderboard entries with varied skill levels,
accuracy rates, and solve counts so the /leaderboard page renders a
populated table immediately without requiring real user activity.

Idempotent — safe to run multiple times (upserts on user_id conflict).

Usage:
    python seed_leaderboard.py

Requires: asyncpg, access to the gto_wizard postgres database.
"""

import asyncio
import json
import logging
import os
import random
import sys
import uuid

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# ── Database configuration ──
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:***@localhost:5432/gto_wizard",
).replace(":***@", ":postgres@")


# ── Demo data ──

LEADERBOARD_USERS = [
    # (user_name,      base_accuracy, solve_range,     streak_range)
    ("PokerPro99", 0.92, (150, 200), (8, 25)),
    ("CrushNLH", 0.88, (120, 180), (5, 15)),
    ("GTO_Master", 0.85, (100, 160), (4, 12)),
    ("Grinder42", 0.82, (80, 140), (3, 10)),
    ("AceHigh", 0.78, (70, 120), (3, 8)),
    ("RiverHunter", 0.75, (60, 100), (2, 6)),
    ("BluffCatcher", 0.72, (50, 90), (2, 5)),
    ("ValueBet", 0.70, (40, 80), (1, 4)),
    ("FishFood", 0.65, (30, 70), (1, 3)),
    ("TiltProof", 0.60, (25, 60), (1, 3)),
    ("NLH_Newbie", 0.55, (15, 40), (0, 2)),
    ("RunGood", 0.50, (10, 30), (0, 1)),
    ("AllInPlz", 0.48, (10, 25), (0, 1)),
    ("DonkBet", 0.45, (10, 20), (0, 1)),
    ("LuckyRiver", 0.42, (10, 15), (0, 1)),
]

CATEGORIES = ["preflop", "c-bet", "bluff-catching", "value-betting", "river-play"]


def random_accuracy_history(accuracy: float, length: int) -> list[float]:
    """Generate a plausible accuracy history array."""
    history = []
    for i in range(min(length, 20)):
        noise = random.uniform(-0.08, 0.08)
        val = accuracy + noise
        history.append(round(max(0.2, min(1.0, val)), 4))
    return history


def random_weak_spots(accuracy: float) -> dict:
    """Generate weak-spots breakdown by category."""
    spots = {}
    for cat in CATEGORIES:
        cat_correct = random.randint(
            max(1, int(accuracy * 30) - 5),
            int(accuracy * 30) + 5,
        )
        cat_total = cat_correct + random.randint(1, 15)
        spots[cat] = {"correct": cat_correct, "total": cat_total}
    return spots


def random_last_updated():
    """Generate a realistic last_updated datetime.
    Some users recently active, some older — enables period filter testing."""
    from datetime import datetime, timezone, timedelta

    days_ago = random.choice([0, 0, 0, 1, 2, 3, 5, 7, 10, 14, 21, 30])
    hours_ago = random.randint(0, 23)
    base = datetime(2026, 6, 23, 22, 0, 0, tzinfo=timezone.utc)
    return base - timedelta(days=days_ago, hours=hours_ago)


async def seed_leaderboard(db_url: str):
    """Insert demo leaderboard entries into user_stats table."""
    try:
        import asyncpg
    except ImportError:
        logger.error("asyncpg not installed. Install with: pip install asyncpg")
        sys.exit(1)

    conn = await asyncpg.connect(db_url)
    try:
        # Ensure user_stats table exists — SQLAlchemy should have created it,
        # but guard against missing table just in case.
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_stats (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(100) UNIQUE NOT NULL,
                user_name VARCHAR(100),
                total_solves INTEGER NOT NULL DEFAULT 0,
                correct_count INTEGER NOT NULL DEFAULT 0,
                total_ev_loss NUMERIC(12,4) NOT NULL DEFAULT 0.0,
                current_streak INTEGER NOT NULL DEFAULT 0,
                max_streak INTEGER NOT NULL DEFAULT 0,
                points INTEGER NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 1,
                weak_spots JSON NOT NULL DEFAULT '{}',
                accuracy_history JSON,
                missed_spot_ids JSON,
                last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        total = 0
        for user_name, base_accuracy, (solves_min, solves_max), (
            streak_min,
            streak_max,
        ) in LEADERBOARD_USERS:
            # Randomize actual values within ranges
            total_solves = random.randint(solves_min, solves_max)
            accuracy = base_accuracy + random.uniform(-0.03, 0.03)
            accuracy = max(0.3, min(0.98, accuracy))
            correct_count = int(total_solves * accuracy)
            incorrect_count = total_solves - correct_count
            total_ev_loss = round(incorrect_count * random.uniform(0.5, 3.0), 4)
            current_streak = random.randint(streak_min, streak_max)
            max_streak = random.randint(streak_min, streak_max + 10)
            if max_streak < current_streak:
                max_streak = current_streak + random.randint(1, 5)

            # Points: correct gives 10 + difficulty bonus per the quiz router logic
            # Base estimate: ~15 pts per correct answer on average
            points = correct_count * random.randint(12, 18)
            level = max(1, (points // 500) + 1)

            # Use deterministic UUID based on user_name for idempotency
            # This ensures ON CONFLICT (user_id) correctly upserts
            user_namespace = uuid.UUID("00000000-0000-0000-0000-000000000000")
            generated_id = str(uuid.uuid5(user_namespace, user_name))
            last_updated = random_last_updated()
            accuracy_hist = json.dumps(random_accuracy_history(accuracy, total_solves))
            weak_spots = json.dumps(random_weak_spots(accuracy))
            missed_ids = json.dumps(
                random.sample(
                    [str(uuid.uuid4()) for _ in range(20)],
                    k=min(incorrect_count, 10),
                )
                if incorrect_count > 0
                else []
            )

            await conn.execute(
                """
                INSERT INTO user_stats
                    (id, user_id, user_name, total_solves, correct_count,
                     total_ev_loss, current_streak, max_streak, points, level,
                     weak_spots, accuracy_history, missed_spot_ids, last_updated, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::json, $12::json, $13::json, $14::timestamptz, $15::timestamptz)
                ON CONFLICT (user_id) DO UPDATE SET
                    total_solves = EXCLUDED.total_solves,
                    correct_count = EXCLUDED.correct_count,
                    total_ev_loss = EXCLUDED.total_ev_loss,
                    current_streak = EXCLUDED.current_streak,
                    max_streak = EXCLUDED.max_streak,
                    points = EXCLUDED.points,
                    level = EXCLUDED.level,
                    weak_spots = EXCLUDED.weak_spots,
                    accuracy_history = EXCLUDED.accuracy_history,
                    missed_spot_ids = EXCLUDED.missed_spot_ids,
                    last_updated = EXCLUDED.last_updated,
                    user_name = EXCLUDED.user_name
            """,
                generated_id,
                generated_id,  # user_id = same UUID for simplicity
                user_name,
                total_solves,
                correct_count,
                total_ev_loss,
                current_streak,
                max_streak,
                points,
                level,
                weak_spots,
                accuracy_hist,
                missed_ids,
                last_updated,
                last_updated,  # created_at = same as last_updated for seed data
            )

            total += 1
            logger.info(
                f"  ✓ {user_name}: {total_solves} solves, {correct_count} correct ({accuracy * 100:.0f}%), {points} pts, Lvl {level}"
            )

        logger.info(f"\nSeeded {total} leaderboard entries")
        return total

    finally:
        await conn.close()


async def main():
    logger.info("Seeding demo leaderboard data...")
    logger.info(f"Database: {DATABASE_URL.replace('postgres:***', 'postgres:*****')}")

    count = await seed_leaderboard(DATABASE_URL)

    # Verify
    try:
        import asyncpg

        conn = await asyncpg.connect(DATABASE_URL)
        row = await conn.fetchrow("SELECT count(*) as cnt FROM user_stats WHERE total_solves >= 10")
        logger.info(f"Leaderboard-eligible users (total_solves >= 10): {row['cnt']}")
        await conn.close()
    except Exception as e:
        logger.warning(f"Verification skipped: {e}")

    logger.info(f"\nDone! Load /leaderboard at https://wiz.codeovertcp.com/leaderboard")
    logger.info("Or verify via curl:")
    logger.info("  curl 'http://localhost:8000/api/v1/quiz/leaderboard?limit=20'")


if __name__ == "__main__":
    asyncio.run(main())
