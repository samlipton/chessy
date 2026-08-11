import { useState, useCallback } from "react";
import { Chessboard } from "react-chessboard";
import { useChessGame } from "../hooks/useChessGame";
import { EloSlider } from "./EloSlider";
import { MoveHistory } from "./MoveHistory";
import { StatusBanner } from "./StatusBanner";
import type { PlayerColor } from "../types/chess";
import styles from "./ChessGame.module.css";

export const ChessGame: React.FC = () => {
  const { gameState, connected, error, startGame, makeMove, resign } = useChessGame();

  const [selectedElo, setSelectedElo] = useState(1500);
  const [selectedColor, setSelectedColor] = useState<PlayerColor>("white");
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [promotionPending, setPromotionPending] = useState<{
    from: string;
    to: string;
  } | null>(null);

  const isGameActive =
    gameState.status === "playing" || gameState.status === "check";

  // Highlight squares: selected + legal destinations
  const highlightSquares = useCallback((): Record<string, React.CSSProperties> => {
    if (!selectedSquare || !gameState.isPlayerTurn) return {};
    const highlights: Record<string, React.CSSProperties> = {
      [selectedSquare]: {
        background: "radial-gradient(circle, rgba(74,222,128,0.35) 0%, rgba(74,222,128,0.15) 100%)",
        borderRadius: "4px",
      },
    };
    // highlight legal destinations from this square
    gameState.legalMoves
      .filter((m) => m.startsWith(selectedSquare))
      .forEach((m) => {
        const dest = m.slice(2, 4);
        highlights[dest] = {
          background:
            "radial-gradient(circle at center, rgba(74,222,128,0.6) 20%, transparent 70%)",
          borderRadius: "50%",
        };
      });
    return highlights;
  }, [selectedSquare, gameState.legalMoves, gameState.isPlayerTurn]);

  const handleSquareClick = useCallback(
    (square: string) => {
      if (!isGameActive || !gameState.isPlayerTurn) return;

      if (selectedSquare) {
        const moveUci = selectedSquare + square;
        const isLegal = gameState.legalMoves.some((m) => m.startsWith(moveUci));

        if (isLegal) {
          // Check for promotion (pawn reaching last rank)
          const isPromotion = gameState.legalMoves.some(
            (m) => m.startsWith(moveUci) && m.length === 5
          );
          if (isPromotion) {
            setPromotionPending({ from: selectedSquare, to: square });
            setSelectedSquare(null);
          } else {
            makeMove(selectedSquare, square);
            setSelectedSquare(null);
          }
          return;
        }
      }

      // Select new square if it has a legal move
      const hasLegal = gameState.legalMoves.some((m) => m.startsWith(square));
      setSelectedSquare(hasLegal ? square : null);
    },
    [selectedSquare, gameState.legalMoves, gameState.isPlayerTurn, isGameActive, makeMove]
  );

  const handlePromotion = useCallback(
    (piece: string) => {
      if (!promotionPending) return;
      makeMove(promotionPending.from, promotionPending.to, piece);
      setPromotionPending(null);
    },
    [promotionPending, makeMove]
  );

  const handleNewGame = () => {
    setSelectedSquare(null);
    setPromotionPending(null);
    startGame(selectedElo, selectedColor);
  };

  return (
    <div className={styles.layout}>
      {/* ── Left sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>♟</span>
          <span className={styles.logoText}>ChessBot</span>
        </div>

        <div className={styles.sidebarSection}>
          <EloSlider
            elo={selectedElo}
            onChange={setSelectedElo}
            disabled={isGameActive}
          />
        </div>

        <div className={styles.sidebarSection}>
          <span className={styles.sectionLabel}>Play as</span>
          <div className={styles.colorPicker}>
            {(["white", "black"] as PlayerColor[]).map((c) => (
              <button
                key={c}
                className={`${styles.colorBtn} ${selectedColor === c ? styles.colorBtnActive : ""}`}
                onClick={() => !isGameActive && setSelectedColor(c)}
                disabled={isGameActive}
              >
                <span className={styles.colorSwatch} data-color={c} />
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button className={styles.newGameBtn} onClick={handleNewGame} disabled={!connected}>
          {isGameActive ? "New Game" : gameState.status === "idle" ? "Start Game" : "Play Again"}
        </button>

        {isGameActive && (
          <button className={styles.resignBtn} onClick={resign}>
            Resign
          </button>
        )}

        <div className={styles.connectionStatus}>
          <span className={`${styles.dot} ${connected ? styles.online : styles.offline}`} />
          <span>{connected ? "Connected" : "Disconnected"}</span>
        </div>
      </aside>

      {/* ── Main board area ── */}
      <main className={styles.main}>
        {error && (
          <div className={styles.errorBanner}>
            ⚠ {error}
          </div>
        )}

        <StatusBanner
          status={gameState.status}
          result={gameState.result}
          reason={gameState.resultReason}
          playerColor={gameState.playerColor}
          isPlayerTurn={gameState.isPlayerTurn}
          isBotThinking={gameState.isBotThinking}
        />

        <div className={styles.boardWrapper}>
          <Chessboard
            options={{
              position: gameState.fen,
              boardOrientation: gameState.playerColor,
              squareStyles: highlightSquares(),
              allowDragging: false,
              darkSquareStyle: { backgroundColor: "#B58863" },
              lightSquareStyle: { backgroundColor: "#F0D9B5" },
              boardStyle: {
                borderRadius: "4px",
                boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
              },
              onSquareClick: ({ square }) => handleSquareClick(square),
            }}
          />
        </div>

        {/* Promotion modal */}
        {promotionPending && (
          <div className={styles.promotionOverlay}>
            <div className={styles.promotionModal}>
              <p className={styles.promotionTitle}>Promote pawn to:</p>
              <div className={styles.promotionPieces}>
                {[
                  { piece: "q", label: "♛ Queen" },
                  { piece: "r", label: "♜ Rook" },
                  { piece: "b", label: "♝ Bishop" },
                  { piece: "n", label: "♞ Knight" },
                ].map(({ piece, label }) => (
                  <button
                    key={piece}
                    className={styles.promotionBtn}
                    onClick={() => handlePromotion(piece)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Right sidebar ── */}
      <aside className={styles.rightSidebar}>
        <MoveHistory moves={gameState.moveHistory} />
      </aside>
    </div>
  );
};
