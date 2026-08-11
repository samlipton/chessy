import React from "react";
import styles from "./EloSlider.module.css";

interface EloSliderProps {
  elo: number;
  onChange: (elo: number) => void;
  disabled?: boolean;
}

const ELO_MIN = 800;
const ELO_MAX = 2800;

function eloToLabel(elo: number): string {
  if (elo < 1000) return "Beginner";
  if (elo < 1200) return "Novice";
  if (elo < 1500) return "Intermediate";
  if (elo < 1800) return "Advanced";
  if (elo < 2200) return "Expert";
  if (elo < 2500) return "Master";
  return "Grandmaster";
}

function eloToPercent(elo: number): number {
  return ((elo - ELO_MIN) / (ELO_MAX - ELO_MIN)) * 100;
}

export const EloSlider: React.FC<EloSliderProps> = ({ elo, onChange, disabled }) => {
  const pct = eloToPercent(elo);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>Bot Strength</span>
        <span className={styles.tier}>{eloToLabel(elo)}</span>
      </div>

      <div className={styles.sliderWrapper}>
        <input
          type="range"
          min={ELO_MIN}
          max={ELO_MAX}
          step={100}
          value={elo}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className={styles.slider}
          style={{ "--fill-pct": `${pct}%` } as React.CSSProperties}
        />
      </div>

      <div className={styles.scale}>
        <span>{ELO_MIN}</span>
        <span className={styles.eloValue}>{elo} ELO</span>
        <span>{ELO_MAX}</span>
      </div>
    </div>
  );
};
