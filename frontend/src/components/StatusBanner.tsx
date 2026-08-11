import React from "react";
import type { GameResult, GameStatus, PlayerColor } from "../types/chess";
import styles from "./StatusBanner.module.css";

interface StatusBannerProps {
  status: GameStatus;
  result: GameResult;
  reason: string;
  playerColor: PlayerColor;
  isPlayerTurn: boolean;
  isBotThinking: boolean;
}

const REASON_LABELS: Record<string, string> = {
  checkmate: "Checkmate",
  stalemate: "Stalemate",
  insufficient_material: "Insufficient material",
  seventy_five_moves: "75-move rule",
  fivefold_repetition: "Fivefold repetition",
  resignation: "Resignation",
  "75_moves_rule": "75-move rule",
};

export const StatusBanner: React.FC<StatusBannerProps> = ({
  status,
  result,
  reason,
  playerColor,
  isPlayerTurn,
  isBotThinking,
}) => {
  if (status === "idle") return null;

  if (status === "checkmate" || status === "resigned" || status === "draw" || status === "stalemate") {
    const isWin = result === playerColor;
    const isDraw = result === "draw";
    const label = isDraw
      ? "Draw"
      : isWin
      ? "You win!"
      : "You lose";
    const cls = isDraw
      ? styles.draw
      : isWin
      ? styles.win
      : styles.lose;

    return (
      <div className={`${styles.banner} ${cls}`}>
        <span className={styles.mainText}>{label}</span>
        <span className={styles.reason}>{REASON_LABELS[reason] ?? reason}</span>
      </div>
    );
  }

  if (status === "check") {
    return (
      <div className={`${styles.banner} ${styles.check}`}>
        <span className={styles.mainText}>Check!</span>
      </div>
    );
  }

  if (isBotThinking) {
    return (
      <div className={`${styles.banner} ${styles.thinking}`}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.mainText}>Bot is thinking…</span>
      </div>
    );
  }

  if (isPlayerTurn) {
    return (
      <div className={`${styles.banner} ${styles.yourTurn}`}>
        <span className={styles.mainText}>Your turn</span>
      </div>
    );
  }

  return null;
};
