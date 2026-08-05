import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './theme'
import { Layout } from './Layout'
import { Home } from '../pages/Home'
import { Wordle } from '../games/wordle/Wordle'
import { Multiplication } from '../games/multiplication/Multiplication'
import { Game2048 } from '../games/game2048/Game2048'
import { Sudoku } from '../games/sudoku/Sudoku'
import { Minesweeper } from '../games/minesweeper/Minesweeper'
import { SlidePuzzle } from '../games/slidepuzzle/SlidePuzzle'
import { Nonogram } from '../games/nonogram/Nonogram'
import { Memory } from '../games/memory/Memory'
import { Klotski } from '../games/klotski/Klotski'

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="play/wordle" element={<Wordle />} />
          <Route path="play/multiplication" element={<Multiplication />} />
          <Route path="play/2048" element={<Game2048 />} />
          <Route path="play/sudoku" element={<Sudoku />} />
          <Route path="play/minesweeper" element={<Minesweeper />} />
          <Route path="play/slidepuzzle" element={<SlidePuzzle />} />
          <Route path="play/nonogram" element={<Nonogram />} />
          <Route path="play/memory" element={<Memory />} />
          <Route path="play/klotski" element={<Klotski />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}
