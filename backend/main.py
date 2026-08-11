"""
Chess App Backend
FastAPI + python-chess + Stockfish
WebSocket-based real-time game engine
"""

import asyncio
import json
import logging
import os
import uuid
from typing import Optional

import chess
import chess.engine
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Chess App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# ELO → Stockfish skill mapping
# Stockfish skill level: 0-20
# ELO approximations per level:
#   0  → ~800   |  5 → ~1200  |  10 → ~1600
#   15 → ~2000  |  20 → ~2800+
# ---------------------------------------------------------------------------
ELO_TO_SKILL: list[tuple[int, int]] = [
    (800,  0),
    (900,  1),
    (1000, 2),
    (1100, 3),
    (1200, 4),
    (1300, 5),
    (1400, 6),
    (1500, 7),
    (1600, 8),
    (1700, 9),
    (1800, 10),
    (1900, 11),
    (2000, 12),
    (2100, 13),
    (2200, 14),
    (2300, 15),
    (2400, 16),
    (2500, 17),
    (2600, 18),
    (2700, 19),
    (2800, 20),
]

# Time limits (seconds) per skill band — weaker bots think faster
ELO_TO_TIME: dict[int, float] = {
    0: 0.05, 1: 0.05, 2: 0.05, 3: 0.1,
    4: 0.1,  5: 0.1,  6: 0.15, 7: 0.15,
    8: 0.2,  9: 0.2,  10: 0.3, 11: 0.3,
    12: 0.5, 13: 0.5, 14: 0.5, 15: 0.5,
    16: 1.0, 17: 1.0, 18: 1.0, 19: 1.0,
    20: 2.0,
}


def elo_to_skill(elo: int) -> int:
    """Convert ELO rating to Stockfish skill level (0-20)."""
    elo = max(800, min(2800, elo))
    for threshold, skill in reversed(ELO_TO_SKILL):
        if elo >= threshold:
            return skill
    return 0


def find_stockfish() -> Optional[str]:
    """Try to locate Stockfish binary on common paths."""
    candidates = [
        "stockfish",
        "/usr/games/stockfish",
        "/usr/bin/stockfish",
        "/usr/local/bin/stockfish",
        "/opt/homebrew/bin/stockfish",
        "C:/Program Files/Stockfish/stockfish.exe",
    ]
    import shutil
    for path in candidates:
        resolved = shutil.which(path) or (path if os.path.isfile(path) else None)
        if resolved:
            return resolved
    return None


# ---------------------------------------------------------------------------
# Active game sessions {session_id: GameSession}
# ---------------------------------------------------------------------------

class GameSession:
    def __init__(self, session_id: str, player_color: chess.Color, elo: int):
        self.session_id = session_id
        self.board = chess.Board()
        self.player_color = player_color      # chess.WHITE or chess.BLACK
        self.elo = elo
        self.skill = elo_to_skill(elo)
        self.engine: Optional[chess.engine.UciProtocol] = None
        self.move_history: list[str] = []     # SAN notation history

    async def init_engine(self, stockfish_path: str):
        transport, engine = await chess.engine.popen_uci(stockfish_path)
        await engine.configure({"Skill Level": self.skill})
        self.engine = engine

    async def get_bot_move(self) -> Optional[chess.Move]:
        if self.engine is None:
            return None
        time_limit = ELO_TO_TIME.get(self.skill, 0.2)
        result = await self.engine.play(
            self.board,
            chess.engine.Limit(time=time_limit),
        )
        return result.move

    async def close(self):
        if self.engine:
            try:
                await self.engine.quit()
            except Exception:
                pass
            self.engine = None


sessions: dict[str, GameSession] = {}
STOCKFISH_PATH: Optional[str] = None


@app.on_event("startup")
async def startup():
    global STOCKFISH_PATH
    STOCKFISH_PATH = find_stockfish()
    if STOCKFISH_PATH:
        logger.info(f"Stockfish found at: {STOCKFISH_PATH}")
    else:
        logger.warning(
            "Stockfish not found. Install it: "
            "apt install stockfish  |  brew install stockfish  |  "
            "download from https://stockfishchess.org/download/"
        )


@app.on_event("shutdown")
async def shutdown():
    for session in sessions.values():
        await session.close()


# ---------------------------------------------------------------------------
# REST: health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "stockfish": STOCKFISH_PATH is not None,
        "stockfish_path": STOCKFISH_PATH,
        "active_sessions": len(sessions),
    }


# ---------------------------------------------------------------------------
# WebSocket: /ws/{session_id}
# Protocol (JSON messages):
#
# Client → Server:
#   { "type": "new_game",  "elo": 1500, "color": "white" }
#   { "type": "move",      "from": "e2", "to": "e4", "promotion": "q" }
#   { "type": "resign" }
#   { "type": "get_state" }
#
# Server → Client:
#   { "type": "game_started", "fen": "...", "player_color": "white", "elo": 1500, "skill": 7 }
#   { "type": "state",        "fen": "...", "turn": "white", "moves": [...], "status": "..." }
#   { "type": "move_made",    "fen": "...", "move": "e2e4", "san": "e4", "by": "player"|"bot", ... }
#   { "type": "game_over",    "result": "white"|"black"|"draw", "reason": "..." }
#   { "type": "error",        "message": "..." }
# ---------------------------------------------------------------------------

def board_status(board: chess.Board) -> str:
    if board.is_checkmate():
        return "checkmate"
    if board.is_stalemate():
        return "stalemate"
    if board.is_insufficient_material():
        return "insufficient_material"
    if board.is_seventyfive_moves():
        return "seventyfive_moves"
    if board.is_fivefold_repetition():
        return "fivefold_repetition"
    if board.is_check():
        return "check"
    return "ongoing"


def game_result(board: chess.Board) -> Optional[tuple[str, str]]:
    """Returns (winner, reason) if game is over, else None."""
    if board.is_checkmate():
        winner = "black" if board.turn == chess.WHITE else "white"
        return winner, "checkmate"
    if board.is_stalemate():
        return "draw", "stalemate"
    if board.is_insufficient_material():
        return "draw", "insufficient_material"
    if board.is_seventyfive_moves():
        return "draw", "75_moves_rule"
    if board.is_fivefold_repetition():
        return "draw", "fivefold_repetition"
    return None


def legal_moves_uci(board: chess.Board) -> list[str]:
    return [m.uci() for m in board.legal_moves]


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    session: Optional[GameSession] = None
    logger.info(f"WebSocket connected: {session_id}")

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = msg.get("type")

            # ------------------------------------------------------------------
            # NEW GAME
            # ------------------------------------------------------------------
            if msg_type == "new_game":
                if session:
                    await session.close()
                    sessions.pop(session.session_id, None)

                elo = int(msg.get("elo", 1500))
                color_str = msg.get("color", "white").lower()
                player_color = chess.WHITE if color_str == "white" else chess.BLACK

                session = GameSession(session_id, player_color, elo)
                sessions[session_id] = session

                if not STOCKFISH_PATH:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Stockfish not installed on this server. "
                                   "Please install it and restart the backend.",
                    })
                    continue

                try:
                    await session.init_engine(STOCKFISH_PATH)
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Failed to start engine: {e}",
                    })
                    continue

                await websocket.send_json({
                    "type": "game_started",
                    "fen": session.board.fen(),
                    "player_color": color_str,
                    "elo": elo,
                    "skill": session.skill,
                    "legal_moves": legal_moves_uci(session.board),
                })

                # If bot plays White, make its first move
                if player_color == chess.BLACK:
                    await asyncio.sleep(0.3)
                    bot_move = await session.get_bot_move()
                    if bot_move:
                        san = session.board.san(bot_move)
                        session.board.push(bot_move)
                        session.move_history.append(san)
                        await websocket.send_json({
                            "type": "move_made",
                            "fen": session.board.fen(),
                            "move": bot_move.uci(),
                            "san": san,
                            "by": "bot",
                            "status": board_status(session.board),
                            "legal_moves": legal_moves_uci(session.board),
                            "move_history": session.move_history,
                        })

            # ------------------------------------------------------------------
            # PLAYER MOVE
            # ------------------------------------------------------------------
            elif msg_type == "move":
                if not session:
                    await websocket.send_json({"type": "error", "message": "No active game. Send new_game first."})
                    continue

                from_sq = msg.get("from", "")
                to_sq = msg.get("to", "")
                promotion = msg.get("promotion")

                try:
                    promo_piece = (
                        chess.PIECE_SYMBOLS.index(promotion.lower())
                        if promotion else None
                    )
                    move = chess.Move.from_uci(
                        from_sq + to_sq + (promotion.lower() if promotion else "")
                    )
                except Exception:
                    await websocket.send_json({"type": "error", "message": f"Invalid move format: {from_sq}{to_sq}"})
                    continue

                if move not in session.board.legal_moves:
                    await websocket.send_json({"type": "error", "message": f"Illegal move: {move.uci()}"})
                    continue

                # Apply player move
                san = session.board.san(move)
                session.board.push(move)
                session.move_history.append(san)

                result = game_result(session.board)
                if result:
                    winner, reason = result
                    await websocket.send_json({
                        "type": "game_over",
                        "fen": session.board.fen(),
                        "move": move.uci(),
                        "san": san,
                        "by": "player",
                        "result": winner,
                        "reason": reason,
                        "move_history": session.move_history,
                    })
                    continue

                await websocket.send_json({
                    "type": "move_made",
                    "fen": session.board.fen(),
                    "move": move.uci(),
                    "san": san,
                    "by": "player",
                    "status": board_status(session.board),
                    "legal_moves": legal_moves_uci(session.board),
                    "move_history": session.move_history,
                })

                # Bot response
                await asyncio.sleep(0.2)
                bot_move = await session.get_bot_move()
                if bot_move:
                    bot_san = session.board.san(bot_move)
                    session.board.push(bot_move)
                    session.move_history.append(bot_san)

                    result = game_result(session.board)
                    if result:
                        winner, reason = result
                        await websocket.send_json({
                            "type": "game_over",
                            "fen": session.board.fen(),
                            "move": bot_move.uci(),
                            "san": bot_san,
                            "by": "bot",
                            "result": winner,
                            "reason": reason,
                            "move_history": session.move_history,
                        })
                    else:
                        await websocket.send_json({
                            "type": "move_made",
                            "fen": session.board.fen(),
                            "move": bot_move.uci(),
                            "san": bot_san,
                            "by": "bot",
                            "status": board_status(session.board),
                            "legal_moves": legal_moves_uci(session.board),
                            "move_history": session.move_history,
                        })

            # ------------------------------------------------------------------
            # RESIGN
            # ------------------------------------------------------------------
            elif msg_type == "resign":
                if not session:
                    await websocket.send_json({"type": "error", "message": "No active game."})
                    continue
                winner = "black" if session.player_color == chess.WHITE else "white"
                await websocket.send_json({
                    "type": "game_over",
                    "result": winner,
                    "reason": "resignation",
                    "move_history": session.move_history,
                })

            # ------------------------------------------------------------------
            # GET STATE
            # ------------------------------------------------------------------
            elif msg_type == "get_state":
                if not session:
                    await websocket.send_json({"type": "error", "message": "No active game."})
                    continue
                await websocket.send_json({
                    "type": "state",
                    "fen": session.board.fen(),
                    "turn": "white" if session.board.turn == chess.WHITE else "black",
                    "legal_moves": legal_moves_uci(session.board),
                    "status": board_status(session.board),
                    "move_history": session.move_history,
                    "player_color": "white" if session.player_color == chess.WHITE else "black",
                    "elo": session.elo,
                    "skill": session.skill,
                })

            else:
                await websocket.send_json({"type": "error", "message": f"Unknown message type: {msg_type}"})

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {session_id}")
    finally:
        if session:
            await session.close()
            sessions.pop(session_id, None)
