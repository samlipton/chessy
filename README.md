# Chess App

Play chess against a Stockfish bot with tunable ELO (800–2800).

---

## Project Structure

```
chess_app/
├── backend/          # Python FastAPI + python-chess + Stockfish
│   ├── main.py
│   └── requirements.txt
└── frontend/         # React + TypeScript + Vite
    └── src/
        ├── components/
        │   ├── ChessGame.tsx       # Main board layout
        │   ├── EloSlider.tsx       # Bot strength control
        │   ├── MoveHistory.tsx     # Scrollable move list
        │   └── StatusBanner.tsx    # Turn / check / game-over indicator
        ├── hooks/
        │   └── useChessGame.ts     # WebSocket connection + game state
        └── types/
            └── chess.ts            # TypeScript interfaces
```

---

## Prerequisites

### 1. Stockfish
Install the Stockfish chess engine:

```bash
# Ubuntu / Debian
sudo apt install stockfish

# macOS
brew install stockfish

# Windows
# Download from https://stockfishchess.org/download/
# Add to PATH or place binary in the backend folder
```

### 2. Python 3.10+
### 3. Node.js 18+

---

## Setup

### Backend

```bash
cd chess_app/backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server (port 8000)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Health check: http://localhost:8000/health

### Frontend 

```bash
cd chess_app/frontend

# Install dependencies
npm install
npm install react-chessboard chess.js react-router-dom

# Start dev server (port 5173)
npm run dev
```

Open: http://localhost:5173

---

## How to Play

1. Set bot strength with the ELO slider (800 = Beginner → 2800 = Grandmaster)
2. Choose your color (White / Black)
3. Click **Start Game**
4. Click a piece to select it, then click the destination square
5. Legal move destinations are highlighted with green dots

---

## WebSocket Protocol

The backend communicates via WebSocket at `ws://localhost:8000/ws/{session_id}`.

| Direction | Message | Description |
|-----------|---------|-------------|
| Client→Server | `new_game` | Start a game with `elo` and `color` |
| Client→Server | `move` | Send `from`, `to`, optional `promotion` |
| Client→Server | `resign` | Forfeit the game |
| Server→Client | `game_started` | Initial FEN + legal moves |
| Server→Client | `move_made` | Updated FEN after any move |
| Server→Client | `game_over` | Result + reason |
| Server→Client | `error` | Error message |
