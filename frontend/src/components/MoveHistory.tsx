import React, { useEffect, useRef } from "react";
import styles from "./MoveHistory.module.css";

interface MoveHistoryProps {
  moves: string[];
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ moves }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [moves]);

  // Group into pairs: [[w1, b1], [w2, b2], ...]
  const pairs: [string, string | null][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([moves[i], moves[i + 1] ?? null]);
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Move History</h3>
      <div className={styles.list}>
        {pairs.length === 0 && (
          <p className={styles.empty}>No moves yet</p>
        )}
        {pairs.map(([white, black], idx) => (
          <div key={idx} className={styles.row}>
            <span className={styles.moveNum}>{idx + 1}.</span>
            <span className={`${styles.move} ${styles.white}`}>{white}</span>
            <span className={`${styles.move} ${styles.black}`}>{black ?? ""}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
