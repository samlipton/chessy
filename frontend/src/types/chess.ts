// Chess game types

export type PlayerColor = "white" | "black";
export type GameStatus =
  | "idle"
  | "playing"
  | "check"
  | "checkmate"
  | "stalemate"
  | "draw"
  | "resigned";

export type GameResult = "white" | "black" | "draw" | null;

// WebSocket message types — Server → Client
export type ServerMessage =
  | GameStartedMsg
  | MoveMadeMsg
  | GameOverMsg
  | StateMsg
  | ErrorMsg;

export interface GameStartedMsg {
  type: "game_started";
  fen: string;
  player_color: PlayerColor;
  elo: number;
  skill: number;
  legal_moves: string[];
}

export interface MoveMadeMsg {
  type: "move_made";
  fen: string;
  move: string;       // UCI e.g. "e2e4"
  san: string;        // SAN e.g. "e4"
  by: "player" | "bot";
  status: string;
  legal_moves: string[];
  move_history: string[];
}

export interface GameOverMsg {
  type: "game_over";
  fen?: string;
  move?: string;
  san?: string;
  by?: "player" | "bot";
  result: GameResult;
  reason: string;
  move_history: string[];
}

export interface StateMsg {
  type: "state";
  fen: string;
  turn: PlayerColor;
  legal_moves: string[];
  status: string;
  move_history: string[];
  player_color: PlayerColor;
  elo: number;
  skill: number;
}

export interface ErrorMsg {
  type: "error";
  message: string;
}

// Client → Server
export interface NewGamePayload {
  type: "new_game";
  elo: number;
  color: PlayerColor;
}

export interface MovePayload {
  type: "move";
  from: string;
  to: string;
  promotion?: string;
}

export interface ResignPayload {
  type: "resign";
}

// App state
export interface GameState {
  fen: string;
  playerColor: PlayerColor;
  legalMoves: string[];
  moveHistory: string[];
  status: GameStatus;
  result: GameResult;
  resultReason: string;
  isPlayerTurn: boolean;
  isBotThinking: boolean;
  elo: number;
  skill: number;
}
