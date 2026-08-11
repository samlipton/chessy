import { Routes, Route } from "react-router-dom";
import { ChessGame } from "./components/ChessGame";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<ChessGame />} />
    </Routes>
  );
}

export default App;