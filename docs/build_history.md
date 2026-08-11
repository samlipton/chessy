# Legacy Notes

--------
## Frontend

The chessboard UI is implemented using `react-chessboard` 
- components: main board, ELO slider, move history panel, status panel
- hooks: game management 

### [Building a React app from Scratch](https://react.dev/learn/build-a-react-app-from-scratch)

#### 1. Install a build tool: 
The first step is to install a build tool like vite, parcel, or rsbuild. These build tools provide features to package and run source code, provide a development server for local development and a build command to deploy your app to a production server.
- Vite: ```npm create vite@latest my-app -- --template react-ts```

#### 2. Build common application patterns:
The build tools listed above start off with a client-only, single-page app (SPA), but don’t include any further solutions for common functionality like routing, data fetching, or styling.
- Routing
- Data fetching
- Code splitting
- Improving application performance  

--------
## Backend

- `FastAPI`: server with WebSocket support for real-time game state
- `python-chess`: library for move validation, game logic, and FEN/PGN handling
- `Stockfish`: engine integration with configurable skill level (ELO mapping)
