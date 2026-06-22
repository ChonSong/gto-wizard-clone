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

# Standard GTO RFI (raise-first-in) range widths by position at 100bb
# Based on solver-generated ranges from modern GTO sources
_PREFLOP_RANGES = {
    "UTG": {
        "width": 0.155,  # ~15.5% of hands
        "call_width": 0.0,
        "raise_actions": ["raise_2.5bb"],
        "call_actions": [],
    },
    "HJ": {
        "width": 0.21,  # ~21%
        "call_width": 0.0,
        "raise_actions": ["raise_2.5bb"],
        "call_actions": [],
    },
    "CO": {
        "width": 0.28,  # ~28%
        "call_width": 0.0,
        "raise_actions": ["raise_2.5bb"],
        "call_actions": [],
    },
    "BTN": {
        "width": 0.42,  # ~42%
        "call_width": 0.0,
        "raise_actions": ["raise_2.5bb"],
        "call_actions": [],
    },
    "SB": {
        "width": 0.45,  # ~45% (SB opens wide due to being last to act preflop)
        "call_width": 0.0,
        "raise_actions": ["raise_3bb"],
        "call_actions": [],
    },
    "BB": {
        "width": 0.0,  # BB doesn't RFI
        "call_width": 0.50,
        "raise_actions": [],
        "call_actions": ["call"],
    },
}


def _generate_range(position: str, stack_depth: int) -> tuple[list[HandCell], str, bool]:
    """
    Generate preflop ranges using:
    1. Precomputed push/fold charts for short stacks (<40bb)
    2. GTO range model with real equities for deeper stacks
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
            # Compute equities using HandEvaluator for display
            try:
                from gto_poker.hand import HandEvaluator

                evaluator = HandEvaluator()
            except ImportError:
                evaluator = None

            for hand in hands_169:
                chart_action = chart.get(hand, "fold")
                action = "raise" if chart_action == "push" else "fold"
                equity = 0.5
                eq = _get_preflop_equity(hand)
                if eq is not None:
                    equity = round(eq, 4)
                cells.append(
                    HandCell(
                        hand=hand,
                        action=action,
                        frequency=1.0 if action == "raise" else 0.0,
                        equity=equity,
                    )
                )
            return cells, source, False

    # ── Deep stacks: use equity-based GTO range model ──
    try:
        from gto_poker.hand import HandEvaluator

        evaluator = HandEvaluator()
    except ImportError:
        evaluator = None

    # Get range config for this position
    config = _PREFLOP_RANGES.get(position, _PREFLOP_RANGES["UTG"])

    # Compute equity for each hand using precomputed data
    hand_equities = []
    for hand in hands_169:
        eq = _get_preflop_equity(hand)
        hand_equities.append((hand, eq if eq is not None else 0.5))

    # Sort by equity descending
    hand_equities.sort(key=lambda x: -x[1])

    # Assign actions: top `width`% raise, next `call_width`% call (if any), rest fold
    total = len(hand_equities)  # 169
    raise_count = int(total * config["width"])
    call_count = int(total * config.get("call_width", 0))
    fold_count = total - raise_count - call_count

    action_map = {}
    for i, (hand, eq) in enumerate(hand_equities):
        if i < raise_count:
            # Raise — with frequency tapering at the bottom of the range
            position_in_range = i / max(raise_count, 1)
            freq = max(0.5, 1.0 - position_in_range * 0.5)
            action_map[hand] = (
                config["raise_actions"][0] if config["raise_actions"] else "raise",
                round(freq, 3),
                round(eq, 4),
            )
        elif i < raise_count + call_count:
            action_map[hand] = (
                config["call_actions"][0] if config["call_actions"] else "call",
                1.0,
                round(eq, 4),
            )
        else:
            action_map[hand] = ("fold", 1.0, round(eq, 4))

    # Build response in the original display order (matrix order)
    cells = []
    for hand in hands_169:
        action, freq, eq = action_map.get(hand, ("fold", 0.0, 0.5))
        cells.append(HandCell(hand=hand, action=action, frequency=freq, equity=eq))

    source = "equity-model"
    if solver_available:
        source += "+mccfr"
    else:
        source += "+heuristic"

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
