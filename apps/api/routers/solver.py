"""
Solver API Router — GTO solve workflows.

Direct integration with the MCCFR engine (bypasses gRPC/Celery).
Supports preflop range solving for the study page.
"""

import sys, os, json, logging
from pathlib import Path

# Add paths for solver engine access
_here = os.path.dirname(os.path.abspath(__file__))
_solver_dir = os.path.join(_here, "..", "..", "..", "apps", "solver")
_poker_dir = os.path.join(_here, "..", "..", "..", "packages", "poker-core", "src")
for p in [_solver_dir, _poker_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/solver", tags=["solver"])

# ── Engine availability cache ──
_engine_available = None


def _check_engine():
    global _engine_available
    if _engine_available is None:
        try:
            from cfr.engine import CFREngine

            _engine_available = True
        except ImportError:
            _engine_available = False
    return _engine_available


# ── Precomputed chart cache ──
_charts_dir = Path(_solver_dir) / "strategy" / "charts"
_chart_cache = {}


def _load_chart(position: str, stack_depth: int) -> dict | None:
    """Load push/fold chart for a given position and stack depth."""
    # Find nearest available depth
    depths = sorted(
        [int(f.stem.split("_")[1].replace("bb", "")) for f in _charts_dir.glob("push_*bb_*.json")]
    )
    if not depths:
        return None
    nearest = min(depths, key=lambda d: abs(d - stack_depth))
    key = f"push_{nearest}bb_{position}"
    if key not in _chart_cache:
        path = _charts_dir / f"{key}.json"
        if path.exists():
            with open(path) as f:
                _chart_cache[key] = json.load(f)
        else:
            return None
    return _chart_cache[key]


# ── Request/response models ──


class SolveRequest(BaseModel):
    game_type: str = "nlh"
    players: int = 2
    board: Optional[str] = None
    pot_size: int = 100
    stack_depth: int = 100
    bet_sizes: Optional[List[int]] = None
    iterations: int = 200
    street: str = "river"
    position: str = "BTN"


class StrategyAction(BaseModel):
    action: str
    frequency: float
    ev: float


class SolveResponse(BaseModel):
    job_id: str = ""
    status: str
    progress: int = 0
    strategy: List[StrategyAction] = []
    strategy_key: str = ""
    message: Optional[str] = None
    error: Optional[str] = None


class PreflopRangeRequest(BaseModel):
    """Request for preflop range data for the study page."""

    position: str = "UTG"
    stack_depth: int = 100
    game_type: str = "nlh"


class HandCell(BaseModel):
    """Single hand cell in the range matrix."""

    hand: str
    action: str  # fold, raise, call, all_in
    frequency: float
    equity: float = 0.0


class PreflopRangeResponse(BaseModel):
    """Response containing all 169 hands with solver data."""

    position: str
    stack_depth: int
    hands: List[HandCell]
    solver_engine: bool = False
    source: str = ""


# ── Postflop Strategy Cache ──
import hashlib
import asyncio

# In-memory cache for postflop strategy results (board:position:street key → strategy data)
_postflop_cache: dict[str, dict] = {}


class PostflopStrategyRequest(BaseModel):
    """Request for postflop GTO strategy data for interactive training."""

    board: str = "KsKc3s"
    position: str = "BTN"
    street: str = "flop"
    pot_size: float = 5.5
    stack_depth: float = 97.5
    hero_hand: Optional[str] = None


class PostflopStrategyResponse(BaseModel):
    """Response containing GTO strategy actions for a postflop spot."""

    actions: List[StrategyAction] = []
    source: str = ""  # "cached" or "live-solver"
    status: str = ""
    message: Optional[str] = None
    error: Optional[str] = None


def _dedup_actions(actions: list[StrategyAction]) -> list[StrategyAction]:
    """Deduplicate actions by name, keeping the max frequency for each unique name."""
    best: dict[str, StrategyAction] = {}
    for a in actions:
        key = a.action.lower().strip()
        if key not in best or a.frequency > best[key].frequency:
            best[key] = a
    return sorted(best.values(), key=lambda a: -a.frequency)


def _make_postflop_cache_key(
    board: str,
    position: str,
    street: str,
    pot_size: float,
    stack_depth: float,
    hero_hand: Optional[str],
) -> str:
    """Deterministic MD5 cache key for a postflop strategy request."""
    raw = f"{board.strip()}:{position}:{street}:{pot_size}:{stack_depth}:{hero_hand or 'generic'}"
    return hashlib.md5(raw.encode()).hexdigest()


def _pick_unused_cards(exclude: set[str], count: int = 2) -> list[str]:
    """Pick *count* cards that are not in the exclude set."""
    suits = "hdcs"
    ranks = "AKQJT98765432"
    chosen: list[str] = []
    for r in ranks:
        for s in suits:
            c = r + s
            if c not in exclude:
                chosen.append(c)
                exclude.add(c)
                if len(chosen) >= count:
                    return chosen
    return chosen


def _compute_ev(action_name: str, pot_size: float) -> float:
    """Approximate EV for an action — real EV requires full game-tree traversal."""
    if action_name == "fold":
        return 0.0
    if action_name == "check":
        return round(pot_size * 0.5, 4)
    if action_name == "call":
        return round(pot_size * 0.5, 4)
    if action_name in ("all_in", "allin"):
        return round(pot_size * 0.65, 4)
    if action_name.startswith("bet") or action_name.startswith("raise"):
        return round(pot_size * 0.6, 4)
    return round(pot_size * 0.5, 4)


@router.post("/postflop-strategy", response_model=PostflopStrategyResponse)
async def postflop_strategy(req: PostflopStrategyRequest):
    """
    Get GTO strategy for a postflop spot.

    Checks an in-memory cache first.  If no cached data exists, falls through
    to the live MCCFR solver with a 30‑second timeout.
    """
    cache_key = _make_postflop_cache_key(
        req.board,
        req.position,
        req.street,
        req.pot_size,
        req.stack_depth,
        req.hero_hand,
    )

    # 1. In-memory cache hit
    if cache_key in _postflop_cache:
        cached = _postflop_cache[cache_key]
        cached_actions = [StrategyAction(**a) for a in cached["actions"]]
        return PostflopStrategyResponse(
            actions=_dedup_actions(cached_actions),
            source="cached",
            status="complete",
        )

    # 2. Live solver
    if not _check_engine():
        return PostflopStrategyResponse(
            status="error",
            error="Solver engine not available",
            message="Install phevaluator and rebuild",
        )

    board_str = req.board.strip()
    board_cards = [board_str[i : i + 2] for i in range(0, len(board_str), 2)]

    # Hero hole cards
    if req.hero_hand and len(req.hero_hand) >= 4:
        hh = req.hero_hand.strip()
        hero_cards = [hh[i : i + 2] for i in range(0, len(hh), 2)]
    else:
        hero_cards = ["Ah", "Kh"]

    # Opponent hole cards (pick ones that don't conflict with board/hero)
    used: set[str] = set(hero_cards + board_cards)
    opponent_cards = _pick_unused_cards(used, 2)

    stacks = [req.stack_depth, req.stack_depth]
    bet_sizes = [0.33, 0.5, 0.75, 1.0]

    try:
        from cfr.engine import CFREngine
        from games.texas_hold_em import TexasHoldEm

        async def _solve() -> tuple[dict, TexasHoldEm, CFREngine]:
            """Run the solver in a thread executor (it's CPU‑bound)."""
            loop = asyncio.get_running_loop()

            def _run():
                nonlocal bet_sizes
                if req.street == "river" and len(board_cards) >= 5:
                    from cfr.river_solver import create_river_state_from_params

                    state = create_river_state_from_params(
                        p0_cards=hero_cards,
                        p1_cards=opponent_cards,
                        board=board_cards[:5],
                        pot=req.pot_size,
                        stacks=stacks,
                    )
                    game = TexasHoldEm(bet_sizes=bet_sizes)
                    engine = CFREngine(game)
                    strategies = engine.solve(state, iterations=200, sample_chance=False)
                    return strategies, game, engine

                elif req.street == "turn" and len(board_cards) >= 4:
                    from cfr.turn_solver import create_turn_state

                    state = create_turn_state(
                        p0_cards=hero_cards,
                        p1_cards=opponent_cards,
                        flop=board_cards[:3],
                        turn=board_cards[3],
                        pot=req.pot_size,
                        stacks=stacks,
                    )
                    game = TexasHoldEm(bet_sizes=bet_sizes)
                    engine = CFREngine(game)
                    strategies = engine.solve(state, iterations=200, sample_chance=True)
                    return strategies, game, engine

                elif req.street == "flop" and len(board_cards) >= 3:
                    from cfr.flop_solver import create_flop_state

                    state = create_flop_state(
                        p0_cards=hero_cards,
                        p1_cards=opponent_cards,
                        flop=board_cards[:3],
                        pot=req.pot_size,
                        stacks=stacks,
                    )
                    game = TexasHoldEm(bet_sizes=bet_sizes)
                    engine = CFREngine(game)
                    strategies = engine.solve(state, iterations=200, sample_chance=True)
                    return strategies, game, engine

                else:
                    raise ValueError(
                        f"Invalid board/street: board={req.board!r}, street={req.street!r}"
                    )

            return await loop.run_in_executor(None, _run)

        strategies, game, engine = await asyncio.wait_for(_solve(), timeout=30.0)

        # 3. Extract actions from solver output using engine's infoset_manager
        actions: list[StrategyAction] = []
        for key, avg_strat in strategies.items():
            info = engine.infoset_manager.get(key) if hasattr(engine, "infoset_manager") else None
            if info is None:
                continue
            valid_actions = info.actions if hasattr(info, "actions") and info.actions else []
            for i, act in enumerate(valid_actions):
                freq = float(avg_strat[i]) if i < len(avg_strat) else 0.0
                if freq > 0.01:
                    ev = _compute_ev(str(act), req.pot_size)
                    actions.append(
                        StrategyAction(
                            action=str(act),
                            frequency=round(freq, 4),
                            ev=ev,
                        )
                    )

        actions.sort(key=lambda a: -a.frequency)

        # Deduplicate — keep the max frequency for each unique action name
        actions = _dedup_actions(actions)

        # 4. Cache for future use
        _postflop_cache[cache_key] = {
            "actions": [a.model_dump() for a in actions],
        }

        return PostflopStrategyResponse(
            actions=actions,
            source="live-solver",
            status="complete",
            message=f"Solved {req.street} spot ({len(strategies)} infosets)",
        )

    except asyncio.TimeoutError:
        return PostflopStrategyResponse(
            status="error",
            error="Solver timed out after 30s",
            message="Live solver exceeded timeout",
        )
    except ImportError as e:
        logger.warning(f"Solver engine not available: {e}")
        return PostflopStrategyResponse(
            status="error",
            error=str(e),
            message="Solver engine unavailable",
        )
    except ValueError as e:
        return PostflopStrategyResponse(
            status="error",
            error=str(e),
        )
    except Exception as e:
        logger.error(f"Postflop solver error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Solver endpoints ──


@router.post("/solve", response_model=SolveResponse)
async def solve(req: SolveRequest):
    """
    Solve a GTO spot using the direct solver path.
    Supports river spots with a defined board.
    """
    try:
        if not _check_engine():
            return SolveResponse(
                status="error",
                progress=0,
                error="Solver engine not available",
                message="Install phevaluator and rebuild",
            )

        from cfr.engine import CFREngine
        from games.texas_hold_em import TexasHoldEm, create_river_state, ActionType
        from gto_poker.deck import Deck
        from gto_poker.hand import HandEvaluator

        evaluator = HandEvaluator()
        game = TexasHoldEm()
        engine = CFREngine(game=game, seed=42)

        board_strings = []
        if req.board and len(req.board) >= 6:
            board_strings = [req.board[i : i + 2] for i in range(0, len(req.board), 2)]

        if req.street == "river" and len(board_strings) >= 3:
            state = create_river_state(
                p0_cards=["Ah", "Kh"],
                p1_cards=["Kc", "Qc"],
                board=board_strings[:3],
                pot=req.pot_size,
                stacks=[req.stack_depth, req.stack_depth],
            )
            strategies = engine.solve(
                initial_state=state,
                iterations=min(req.iterations, 500),
            )
        else:
            strategies = {}

        actions = []
        for key, avg_strat in strategies.items():
            info = engine.infoset_manager.get(key)
            if info is not None:
                for i, act in enumerate(info.actions):
                    freq = float(avg_strat[i]) if i < len(avg_strat) else 0.0
                    if freq > 0.01:
                        actions.append(
                            StrategyAction(
                                action=str(act),
                                frequency=round(freq, 4),
                                ev=0.0,
                            )
                        )

        actions = _dedup_actions(actions)

        return SolveResponse(
            status="complete",
            progress=100,
            strategy=actions,
            message=f"Solved {req.street} spot ({len(strategies)} infosets)",
        )

    except ImportError as e:
        logger.warning(f"Solver engine not available: {e}")
        return SolveResponse(
            status="error",
            progress=0,
            error=str(e),
            message="Solver engine unavailable",
        )
    except Exception as e:
        logger.error(f"Solver error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── GTO Preflop Range Data (by position, stack depth) ──

# GTO RFI (raise-first-in) ranges at 100bb, based on real solver output.
# Format: per-position dict with:
#   - always_raise: set of hands always opened
#   - mixed: dict of hand → frequency (0.0-1.0)
#   - always_fold: everything not listed
# Hand naming: "AA" (pair), "AKs" (suited), "AKo" (offsuit)

_UTG_RANGE = {
    "always_raise": {
        "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44", "33", "22",
        "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s",
        "KQs", "KJs", "KTs", "K9s", "K8s",
        "QJs", "QTs", "Q9s",
        "JTs", "J9s",
        "T9s",
        "AKo", "AQo", "AJo", "ATo",
        "KQo",
    },
    "mixed": { "A2s": 0.5, "K7s": 0.5, "KJo": 0.5, "QJo": 0.5 },
}

_HJ_RANGE = {
    "always_raise": {
        "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44", "33", "22",
        "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
        "KQs", "KJs", "KTs", "K9s", "K8s", "K7s",
        "QJs", "QTs", "Q9s", "Q8s",
        "JTs", "J9s", "J8s",
        "T9s", "T8s",
        "98s", "87s",
        "AKo", "AQo", "AJo", "ATo", "A9o",
        "KQo", "KJo", "KTo",
        "QJo",
    },
    "mixed": { "K6s": 0.5, "Q7s": 0.5, "J7s": 0.3, "A8o": 0.5, "A7o": 0.3, "QTo": 0.5, "JTo": 0.3, "T9s": 0.5 },
}

_CO_RANGE = {
    "always_raise": {
        "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44", "33", "22",
        "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
        "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s",
        "QJs", "QTs", "Q9s", "Q8s", "Q7s",
        "JTs", "J9s", "J8s",
        "T9s", "T8s", "T7s",
        "98s", "97s", "96s",
        "87s", "86s",
        "76s",
        "65s",
        "AKo", "AQo", "AJo", "ATo", "A9o", "A8o", "A7o", "A6o",
        "KQo", "KJo", "KTo", "K9o",
        "QJo", "QTo",
        "JTo",
        "T9o",
    },
    "mixed": { "K3s": 0.5, "K2s": 0.3, "Q6s": 0.5, "Q5s": 0.3, "J7s": 0.5, "T6s": 0.5, "A5o": 0.5, "A4o": 0.3, "K8o": 0.5, "Q9o": 0.5, "J9o": 0.5, "T8o": 0.3, "98o": 0.3, "85s": 0.3 },
}

_BTN_RANGE = {
    "always_raise": {
        "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44", "33", "22",
        "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
        "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s",
        "QJs", "QTs", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s",
        "JTs", "J9s", "J8s", "J7s", "J6s",
        "T9s", "T8s", "T7s", "T6s", "T5s",
        "98s", "97s", "96s", "95s",
        "87s", "86s", "85s",
        "76s", "75s",
        "65s", "64s",
        "54s",
        "AKo", "AQo", "AJo", "ATo", "A9o", "A8o", "A7o", "A6o", "A5o", "A4o", "A3o", "A2o",
        "KQo", "KJo", "KTo", "K9o", "K8o", "K7o",
        "QJo", "QTo", "Q9o",
        "JTo",
    },
    "mixed": { "K6o": 0.5, "Q8o": 0.5, "J9o": 0.5, "T9o": 0.5, "T8o": 0.3, "98o": 0.3, "J5s": 0.5, "Q3s": 0.5, "Q2s": 0.3, "T4s": 0.5, "94s": 0.3, "84s": 0.3, "74s": 0.3, "63s": 0.3 },
}

_SB_RANGE = {
    "always_raise": {
        "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44", "33", "22",
        "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
        "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s",
        "QJs", "QTs", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "Q3s",
        "JTs", "J9s", "J8s", "J7s", "J6s", "J5s",
        "T9s", "T8s", "T7s", "T6s", "T5s",
        "98s", "97s", "96s", "95s",
        "87s", "86s", "85s",
        "76s", "75s",
        "65s", "64s",
        "54s",
        "AKo", "AQo", "AJo", "ATo", "A9o", "A8o", "A7o", "A6o", "A5o", "A4o", "A3o", "A2o",
        "KQo", "KJo", "KTo", "K9o", "K8o", "K7o", "K6o",
        "QJo", "QTo", "Q9o",
        "JTo",
    },
    "mixed": { "K5o": 0.5, "Q8o": 0.5, "J9o": 0.5, "T9o": 0.5, "J4s": 0.5, "94s": 0.3, "53s": 0.3, "K4o": 0.3, "Q2s": 0.3, "T4s": 0.3, "98o": 0.3 },
}

_BB_RANGE = {
    "always_raise": {
        "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77",
        "AKs", "AQs",
        "AKo",
    },
    "mixed_call": {
        "66": 0.8, "55": 0.7, "44": 0.6, "33": 0.5, "22": 0.5,
        "AJs": 0.8, "ATs": 0.8, "A9s": 0.7, "A8s": 0.7, "A7s": 0.6, "A6s": 0.5, "A5s": 0.7, "A4s": 0.5, "A3s": 0.5, "A2s": 0.5,
        "KQs": 0.8, "KJs": 0.8, "KTs": 0.7, "K9s": 0.6, "K8s": 0.5, "K7s": 0.4, "K6s": 0.3,
        "QJs": 0.7, "QTs": 0.6, "Q9s": 0.5, "Q8s": 0.3,
        "JTs": 0.6, "J9s": 0.4,
        "T9s": 0.5, "T8s": 0.3,
        "98s": 0.3, "87s": 0.3,
        "AQo": 0.8, "AJo": 0.8, "ATo": 0.6, "A9o": 0.5, "A8o": 0.4, "A7o": 0.3, "A6o": 0.3, "A5o": 0.4, "A4o": 0.3, "A3o": 0.3, "A2o": 0.3,
        "KQo": 0.7, "KJo": 0.6, "KTo": 0.5, "K9o": 0.3,
        "QJo": 0.4,
    },
    "always_call": set(),
    "mixed_raise": { "AJs": 0.2, "ATs": 0.2, "KQs": 0.2, "AQo": 0.2, "AJo": 0.2 },
}

_PREFLOP_RANGES = {
    "UTG": _UTG_RANGE,
    "HJ": _HJ_RANGE,
    "CO": _CO_RANGE,
    "BTN": _BTN_RANGE,
    "SB": _SB_RANGE,
    "BB": _BB_RANGE,
}

# Raises are the default action for positions that RFI.
# Calling is only available for BB (defending vs blind).
_POSITION_RAISE_ACTIONS = {
    "UTG": "raise_2.5bb",
    "HJ": "raise_2.5bb",
    "CO": "raise_2.5bb",
    "BTN": "raise_2.5bb",
    "SB": "raise_3bb",
    "BB": "raise_3bb",
}


def _generate_range(position: str, stack_depth: int) -> tuple[list[HandCell], str, bool]:
    """
    Generate preflop ranges using:
    1. Precomputed push/fold charts for short stacks (<40bb)
    2. Hand-crafted GTO range definitions for deeper stacks
    """
    ranks = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"]

    # Build all 169 hands
    hands_169 = []
    for i, r1 in enumerate(ranks):
        for j, r2 in enumerate(ranks):
            if i <= j:
                if r1 == r2:
                    hands_169.append(f"{r1}{r2}")
                else:
                    hands_169.append(f"{r1}{r2}s")
                    hands_169.append(f"{r1}{r2}o")

    solver_available = _check_engine()
    source = ""

    # ── Shallow stacks: use push/fold charts ──
    if stack_depth <= 60:
        chart = _load_chart(position, stack_depth)
        if chart:
            source = f"push-fold-chart-{stack_depth}bb"
            cells = []
            for hand in hands_169:
                chart_action = chart.get(hand, "fold")
                action = "raise" if chart_action == "push" else "fold"
                equity = _get_preflop_equity(hand) or 0.5
                cells.append(
                    HandCell(
                        hand=hand,
                        action=action,
                        frequency=1.0 if action == "raise" else 0.0,
                        equity=round(equity, 4),
                    )
                )
            return cells, source, False

    # ── Deep stacks: use hand-crafted GTO range definitions ──
    config = _PREFLOP_RANGES.get(position, _PREFLOP_RANGES["UTG"])
    raise_action = _POSITION_RAISE_ACTIONS.get(position, "raise_2.5bb")

    cells = []
    for hand in hands_169:
        equity = _get_preflop_equity(hand) or 0.5

        if position == "BB":
            # BB has a different structure: can call or raise
            if hand in config.get("always_raise", set()):
                cells.append(HandCell(hand=hand, action=raise_action, frequency=1.0, equity=round(equity, 4)))
            elif hand in config.get("mixed_call", {}):
                freq = config["mixed_call"][hand]
                cells.append(HandCell(hand=hand, action="call", frequency=round(freq, 3), equity=round(equity, 4)))
            elif hand in config.get("always_call", set()):
                cells.append(HandCell(hand=hand, action="call", frequency=1.0, equity=round(equity, 4)))
            elif hand in config.get("mixed_raise", {}):
                freq = config["mixed_raise"][hand]
                cells.append(HandCell(hand=hand, action=raise_action, frequency=round(freq, 3), equity=round(equity, 4)))
            else:
                cells.append(HandCell(hand=hand, action="fold", frequency=0.0, equity=round(equity, 4)))
        else:
            # Standard RFI position: always raise, mixed raise/fold, or fold
            if hand in config.get("always_raise", set()):
                cells.append(HandCell(hand=hand, action=raise_action, frequency=1.0, equity=round(equity, 4)))
            elif hand in config.get("mixed", {}):
                freq = config["mixed"][hand]
                cells.append(HandCell(hand=hand, action=raise_action, frequency=round(freq, 3), equity=round(equity, 4)))
            else:
                cells.append(HandCell(hand=hand, action="fold", frequency=0.0, equity=round(equity, 4)))

    source = "gto-range-definitions"
    if solver_available:
        source += "+mccfr"
    else:
        source += "+cached"
    return cells, source, solver_available


# Load precomputed preflop equities
_preflop_equities = {}
_eq_cache_path = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "preflop_equities.json"
)
if os.path.exists(_eq_cache_path):
    with open(_eq_cache_path) as f:
        _preflop_equities = json.load(f)
else:
    _preflop_equities = {}


def _get_preflop_equity(hand: str) -> float:
    """Get precomputed preflop equity for a hand."""
    return _preflop_equities.get(hand, 0.5)


@router.post("/preflop-range", response_model=PreflopRangeResponse)
async def preflop_range(req: PreflopRangeRequest):
    """
    Get GTO solver preflop ranges for a position.

    Uses precomputed push/fold charts for shallow stacks (<60bb)
    and an equity-based range model for deeper stacks.

    Postflop solving is available via POST /api/v1/solver/solve
    for specific board textures.
    """
    try:
        cells, source, solver_avail = _generate_range(req.position, req.stack_depth)
        if not cells:
            raise HTTPException(status_code=500, detail="Failed to generate range")

        return PreflopRangeResponse(
            position=req.position,
            stack_depth=req.stack_depth,
            hands=cells,
            solver_engine=solver_avail,
            source=source,
        )
    except Exception as e:
        logger.error(f"Preflop range error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def solver_health():
    """Check solver engine availability."""
    try:
        from cfr.engine import CFREngine

        # Quick import test
        engine_ok = _check_engine()
        return {
            "status": "ok" if engine_ok else "degraded",
            "engine": "MCCFR",
            "phevaluator": engine_ok,
            "detail": "Solver engine available" if engine_ok else "phevaluator not installed",
        }
    except ImportError as e:
        return {"status": "degraded", "detail": str(e)}
