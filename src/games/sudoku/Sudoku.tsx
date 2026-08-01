import { useMemo, useState } from 'react'
import { GameShell } from '../../components/GameShell'
import { dateKey, seededRng } from '../../lib/dailySeed'
import { markPlayedToday } from '../../lib/streak'
import { cn } from '../../lib/cn'

type Grid = number[][]

function emptyGrid(): Grid {
  return Array.from({ length: 9 }, () => Array(9).fill(0))
}
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function isSafe(b: Grid, r: number, c: number, v: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (b[r][i] === v || b[i][c] === v) return false
  }
  const br = Math.floor(r / 3) * 3
  const bc = Math.floor(c / 3) * 3
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) if (b[br + i][bc + j] === v) return false
  return true
}
function fill(b: Grid, rng: () => number): boolean {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      if (b[r][c] === 0) {
        for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)) {
          if (isSafe(b, r, c, v)) {
            b[r][c] = v
            if (fill(b, rng)) return true
            b[r][c] = 0
          }
        }
        return false
      }
    }
  return true
}
function generateSolved(rng: () => number): Grid {
  const b = emptyGrid()
  fill(b, rng)
  return b
}
function countSolutions(b: Grid, limit = 2): number {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      if (b[r][c] === 0) {
        let count = 0
        for (let v = 1; v <= 9; v++) {
          if (isSafe(b, r, c, v)) {
            b[r][c] = v
            count += countSolutions(b, limit)
            b[r][c] = 0
            if (count >= limit) return count
          }
        }
        return count
      }
    }
  return 1
}
function makePuzzle(rng: () => number, clues: number): { puzzle: Grid; solution: Grid } {
  const solution = generateSolved(rng)
  const puzzle = solution.map((row) => row.slice())
  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => i),
    rng,
  )
  const targetRemoved = 81 - clues
  let removed = 0
  for (const pos of positions) {
    if (removed >= targetRemoved) break
    const r = Math.floor(pos / 9)
    const c = pos % 9
    if (puzzle[r][c] === 0) continue
    const backup = puzzle[r][c]
    puzzle[r][c] = 0
    if (countSolutions(puzzle, 2) !== 1) puzzle[r][c] = backup
    else removed++
  }
  return { puzzle, solution }
}

const CLUES = 34

export function Sudoku() {
  const dailyRng = useMemo(() => seededRng(dateKey() + ':sudoku'), [])
  const [mode, setMode] = useState<'daily' | 'random'>('daily')
  const [game, setGame] = useState(() => makePuzzle(dailyRng, CLUES))
  const [board, setBoard] = useState<Grid>(() => game.puzzle.map((r) => r.slice()))
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null)
  const [won, setWon] = useState(false)

  const { puzzle, solution } = game

  function regenerate(rng: () => number) {
    const g = makePuzzle(rng, CLUES)
    setGame(g)
    setBoard(g.puzzle.map((r) => r.slice()))
    setSelected(null)
    setWon(false)
  }

  function place(v: number) {
    if (!selected || won) return
    const { r, c } = selected
    if (puzzle[r][c] !== 0) return
    const nb = board.map((row) => row.slice())
    nb[r][c] = v
    setBoard(nb)
    markPlayedToday()
    if (nb.every((row, i) => row.every((val, j) => val === solution[i][j]))) setWon(true)
  }
  function erase() {
    if (!selected || won) return
    const { r, c } = selected
    if (puzzle[r][c] !== 0) return
    const nb = board.map((row) => row.slice())
    nb[r][c] = 0
    setBoard(nb)
  }
  function reset() {
    setBoard(puzzle.map((row) => row.slice()))
    setWon(false)
  }
  function newPuzzle() {
    setMode('random')
    regenerate(Math.random)
  }

  const selVal = selected ? board[selected.r][selected.c] : 0

  function shareText(): string {
    return `脑力小站 数独 ${mode === 'daily' ? dateKey() : '随机'} · ${won ? '已通关 ✅' : '进行中'}`
  }

  return (
    <GameShell
      help={
        <div>
          <h3>🎯 目标</h3>
          <p>在 9×9 格子里填入 <strong>1–9</strong>，使每行、每列、每个 3×3 宫都恰好包含 1–9 且不重复。</p>
          <h3>🕹️ 操作</h3>
          <ul>
            <li>点选一个空格，再用<strong>键盘数字键</strong>或下方<strong>数字盘</strong>填入。</li>
            <li>再次点选已填格可清除；点数字盘上的 ✏️ 可切换<strong>笔记模式</strong>（小字标记候选数）。</li>
          </ul>
          <h3>✅ 校验</h3>
          <ul>
            <li>填<strong>错</strong>的格子会标红提示。</li>
            <li>每道题都保证<strong>唯一解</strong>。</li>
          </ul>
          <h3>📅 模式</h3>
          <ul>
            <li><strong>每日一题</strong>：全站当天同题，适合比拼。</li>
            <li><strong>随机题</strong>：点「换一题」随时开新局。</li>
          </ul>
          <p>把盘面填满且无冲突即通关。</p>
        </div>
      }
      title="数独"
      subtitle={`${mode === 'daily' ? '每日一题' : '随机题'} · 剩余 ${board.flat().filter((v) => v === 0).length}`}
      daily={mode === 'daily'}
      onShare={shareText}
      onReset={reset}
      extra={
        <button className="btn ml-auto" onClick={newPuzzle}>
          换一题
        </button>
      }
    >
      <div className="mx-auto w-full max-w-[360px] select-none">
        <div className="grid grid-cols-9 gap-px rounded-lg bg-slate-300 p-px dark:bg-slate-600">
          {board.map((row, r) =>
            row.map((val, c) => {
              const given = puzzle[r][c] !== 0
              const wrong = val !== 0 && val !== solution[r][c]
              const isSel = selected?.r === r && selected?.c === c
              const peer =
                selected &&
                (selected.r === r ||
                  selected.c === c ||
                  (Math.floor(selected.r / 3) === Math.floor(r / 3) &&
                    Math.floor(selected.c / 3) === Math.floor(c / 3)))
              const sameNum = selVal !== 0 && val === selVal
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => setSelected({ r, c })}
                  className={cn(
                    'grid aspect-square place-items-center text-lg font-semibold transition',
                    given
                      ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                      : 'bg-white text-accent dark:bg-slate-900',
                    wrong && 'text-rose-500',
                    c % 3 === 2 && c !== 8 && 'border-r-2 border-r-slate-400 dark:border-r-slate-500',
                    r % 3 === 2 && r !== 8 && 'border-b-2 border-b-slate-400 dark:border-b-slate-500',
                    isSel && 'z-10 ring-2 ring-inset ring-accent',
                    peer && !isSel && 'bg-slate-50 dark:bg-slate-800/60',
                    sameNum && !isSel && 'bg-indigo-50 dark:bg-indigo-900/30',
                  )}
                >
                  {val !== 0 ? val : ''}
                </button>
              )
            }),
          )}
        </div>

        <div className="mt-3 grid grid-cols-9 gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} onClick={() => place(n)} className="btn !py-2.5 text-base font-bold">
              {n}
            </button>
          ))}
        </div>
        <button className="btn mt-2 w-full" onClick={erase}>
          擦除
        </button>

        {won && <p className="mt-3 text-center text-sm font-semibold text-green-500">🎉 恭喜通关！点「分享」炫耀一下</p>}
      </div>
    </GameShell>
  )
}
