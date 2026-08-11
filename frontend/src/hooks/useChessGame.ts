import { useCallback, useEffect, useRef, useState } from "react";
import type {
  GameState,
  PlayerColor,
  ServerMessage,
} from "../types/chess";

const WS_URL = "ws://localhost:8000/ws";
const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const initialState: GameState = {
  fen: INITIAL_FEN,
  playerColor: "white",
  legalMoves: [],
  moveHistory: [],
  status: "idle",
  result: null,
  resultReason: "",
  isPlayerTurn: false,
  isBotThinking: false,
  elo: 1500,
  skill: 7,
};

export function useChessGame() {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionId = useRef<string>(crypto.randomUUID());

  const send = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const handleMessage = useCallback((msg: ServerMessage) => {
    setError(null);

    switch (msg.type) {
      case "game_started":
        setGameState((prev) => ({
          ...prev,
          fen: msg.fen,
          playerColor: msg.player_color,
          legalMoves: msg.legal_moves,
          moveHistory: [],
          status: "playing",
          result: null,
          resultReason: "",
          isPlayerTurn: msg.player_color === "white", // white moves first
          isBotThinking: msg.player_color === "black", // bot is white → thinking immediately
          elo: msg.elo,
          skill: msg.skill,
        }));
        break;

      case "move_made": {
        const isCheck = msg.status === "check";
        setGameState((prev) => ({
          ...prev,
          fen: msg.fen,
          legalMoves: msg.legal_moves,
          moveHistory: msg.move_history,
          status: isCheck ? "check" : "playing",
          isPlayerTurn: msg.by === "bot",
          isBotThinking: msg.by === "player",
        }));
        break;
      }

      case "game_over":
        setGameState((prev) => ({
          ...prev,
          fen: msg.fen ?? prev.fen,
          moveHistory: msg.move_history,
          legalMoves: [],
          status: msg.reason === "resignation" ? "resigned" : (
            msg.reason === "stalemate" ||
            msg.reason.includes("draw") ||
            msg.reason.includes("repetition") ||
            msg.reason.includes("material") ||
            msg.reason.includes("moves")
              ? "draw"
              : "checkmate"
          ),
          result: msg.result,
          resultReason: msg.reason,
          isPlayerTurn: false,
          isBotThinking: false,
        }));
        break;

      case "state":
        setGameState((prev) => ({
          ...prev,
          fen: msg.fen,
          legalMoves: msg.legal_moves,
          moveHistory: msg.move_history,
          playerColor: msg.player_color,
          isPlayerTurn: msg.turn === msg.player_color,
          isBotThinking: msg.turn !== msg.player_color,
          elo: msg.elo,
          skill: msg.skill,
        }));
        break;

      case "error":
        setError(msg.message);
        setGameState((prev) => ({ ...prev, isBotThinking: false }));
        break;
    }
  }, []);

  // Connect WebSocket
  useEffect(() => {
    const url = `${WS_URL}/${sessionId.current}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setError("Connection error. Is the backend running?");
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        handleMessage(msg);
      } catch {
        setError("Failed to parse server message");
      }
    };

    return () => {
      ws.close();
    };
  }, [handleMessage]);

  const startGame = useCallback(
    (elo: number, color: PlayerColor) => {
      setGameState((prev) => ({
        ...initialState,
        elo: prev.elo,
        status: "idle",
      }));
      send({ type: "new_game", elo, color });
    },
    [send]
  );

  const makeMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      send({ type: "move", from, to, promotion });
    },
    [send]
  );

  const resign = useCallback(() => {
    send({ type: "resign" });
  }, [send]);

  return {
    gameState,
    connected,
    error,
    startGame,
    makeMove,
    resign,
  };
}