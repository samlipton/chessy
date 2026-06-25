# Technical Notes

Here is an outlook into some technical elements of the chess analysis application

## Architecture

- Frontend : [ReactJS](https://www.w3schools.com/React/default.asp)
- Backend  : [FastAPI](https://fastapi.tiangolo.com/)
- Engine   : [Stockfish](https://stockfishchess.org/download/)

+------------------------------------------------+
|                  Frontend                      |
|  React + TypeScript + Chessboard UI            |
+----------------------+-------------------------+
                       |
                       | REST / WebSocket
                       v
+------------------------------------------------+
|                  Backend                       |
|            Python (FastAPI)                    |
+------------------------------------------------+
| Game Service      | Engine Service             |
| Session Service   | Config Service             |
+------------------------------------------------+
                       |
                       v
+------------------------------------------------+
|               Chess Engine Layer               |
|                                                |
| python-chess                                   |
| Stockfish                                      |
| Difficulty Controller                          |
+------------------------------------------------+
                       |
                       v
+------------------------------------------------+
|                  Persistence                   |
| SQLite (Phase 1)                               |
| PostgreSQL (later)                             |
+------------------------------------------------+

### Frontend

frontend/
│
├── src/
│
├── pages/
│   ├── Home.tsx
│   ├── Play.tsx
│   └── Settings.tsx
│
├── components/
│   ├── ChessBoard.tsx
│   ├── MoveList.tsx
│   ├── EvaluationBar.tsx
│   └── GameControls.tsx
│
├── services/
│   └── api.ts
│
├── hooks/
│   └── useGame.ts
│
└── types/

### Backend 

Python offers the fastest MVP (FastAPI), huge chess ecosystem (python-chess, stockfish), and easy integration with ML.

backend/
│
├── main.py
│
├── api/
│   ├── game_routes.py
│   ├── engine_routes.py
│   └── health_routes.py
│
├── services/
│   ├── game_service.py
│   ├── engine_service.py
│   ├── session_service.py
│   └── difficulty_service.py
│
├── engine/
│   ├── stockfish_adapter.py
│   ├── elo_mapper.py
│   └── move_generator.py
│
├── models/
│   ├── game.py
│   ├── move.py
│   └── player.py
│
├── database/
│   ├── db.py
│   └── schemas.py
│
├── config/
│   └── settings.py
│
└── tests/
