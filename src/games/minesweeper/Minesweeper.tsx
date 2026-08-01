import { useState } from 'react'
import { GameShell } from '../../components/GameShell'
import { markPlayedToday } from '../../lib/streak'
import { cn } from '../../lib/cn'

interface Cell {
  mine: boolean
  adj: number
  revealed: boolean
  flagged: boolean
}
type Board = Cell[][]

const LEVELS = {
  初级: { rows: 9, cols: 9, mines: 10 },
  中级: { rows: 16, cols: 16, mines: 40 },
}

const NUM_COLORS: Record<number, string> = {
  1: 'text-blue-600 dark:text-blue-400',
  2: 'text-green-600 dark:text-green-400',
  3: 'text-red-600 dark:text-red-400',
  4: 'text-indigo-700 dark:text-indigo-300',
  5: 'text-amber-700 dark:text-amber-300',
  6: 'text-teal-600 dark:text-teal-300',
  7: 'text-slate-800 dark:text-slate-200',
  8: 'text-rose-700 dark:text-rose-300',
}

function blankBoard(rows: number, cols: number): Board {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, adj: 0, revealed: false, flagged: false })),
  )
}
function clone(b: Board): Board {
  return b.map((row) => row.map((c) => ({ ...c })))
}
function neighbors(r: number, c: number, rows: number, cols: number): [number, number][] {
  const out: [number, number][] = []
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push([nr, nc])
    }
  return out
}
function placeMines(brd: Board, safeR: number, safeC: number, mines: number) {
  const safe = new Set<string>([`${safeR},${safeC}`])
  neighbors(safeR, safeC, brd.length, brd[0].length).forEach(([r, c]) => safe.add(`${r},${c}`))
  const pool: [number, number][] = []
  brd.forEach((row, r) => row.forEach((_, c) => !safe.has(`${r},${c}`) && pool.push([r, c])))
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  for (let i = 0; i < mines; i++) {
    const [r, c] = pool[i]
    brd[r][c].mine = true
  }
  brd.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (!cell.mine)
        cell.adj = neighbors(r, c, brd.length, brd[0].length).filter(([nr, nc]) => brd[nr][nc].mine).length
    }),
  )
}
function revealAt(brd: Board, r: number, c: number): 'lost' | 'ok' {
  const cell = brd[r][c]
  if (cell.revealed || cell.flagged) return 'ok'
  cell.revealed = true
  if (cell.mine) return 'lost'
  if (cell.adj === 0) {
    for (const [nr, nc] of neighbors(r, c, brd.length, brd[0].length)) {
      if (!brd[nr][nc].revealed) revealAt(brd, nr, nc)
    }
  }
  return 'ok'
}

export function Minesweeper() {
  const [level, setLevel] = useState<keyof typeof LEVELS>('初级')
  const cfg = LEVELS[level]
  const [board, setBoard] = useState<Board>(() => blankBoard(cfg.rows, cfg.cols))
  const [minesPlaced, setMinesPlaced] = useState(false)
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing')
  const [flagMode, setFlagMode] = useState(false)

  function evalStatus(brd: Board): 'playing' | 'won' | 'lost' {
    const total = brd.length * brd[0].length
    const revealed = brd.flat().filter((x) => x.revealed).length
    if (revealed === total - cfg.mines) return 'won'
    return 'playing'
  }

  function onClick(r: number, c: number) {
    if (status !== 'playing') return
    if (flagMode) return toggleFlag(r, c)
    const brd = clone(board)
    if (!minesPlaced) {
      placeMines(brd, r, c, cfg.mines)
      setMinesPlaced(true)
      markPlayedToday()
    }
    const cell = brd[r][c]
    if (cell.revealed || cell.flagged) return
    const res = revealAt(brd, r, c)
    if (res === 'lost') setStatus('lost')
    else setStatus(evalStatus(brd))
    setBoard(brd)
  }

  function toggleFlag(r: number, c: number) {
    if (status !== 'playing') return
    const brd = clone(board)
    const cell = brd[r][c]
    if (cell.revealed) return
    cell.flagged = !cell.flagged
    setBoard(brd)
  }

  function reset() {
    setBoard(blankBoard(cfg.rows, cfg.cols))
    setMinesPlaced(false)
    setStatus('playing')
  }
  function changeLevel(lv: keyof typeof LEVELS) {
    setLevel(lv)
    setBoard(blankBoard(LEVELS[lv].rows, LEVELS[lv].cols))
    setMinesPlaced(false)
    setStatus('playing')
  }

  const flags = board.flat().filter((c) => c.flagged).length
  const minesLeft = cfg.mines - flags

  function shareText(): string {
    return `脑力小站 扫雷（${level}）· ${
      status === 'won' ? '通关 ✅' : status === 'lost' ? '踩雷 💥' : '进行中'
    } · 剩余雷 ${minesLeft}`
  }

  const textSize = level === '初级' ? 'text-base' : 'text-xs'

  return (
    <GameShell
      title="扫雷"
      subtitle="左键翻开 · 右键/标记模式插旗"
      onShare={shareText}
      onReset={reset}
      extra={
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-lg bg-slate-200 px-2 py-1 text-sm font-semibold dark:bg-slate-700">💣 {minesLeft}</span>
          <select
            className="rounded-lg bg-slate-200 px-2 py-1 text-sm font-medium dark:bg-slate-700"
            value={level}
            onChange={(e) => changeLevel(e.target.value as keyof typeof LEVELS)}
          >
            {Object.keys(LEVELS).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-[360px] select-none">
        <div
          className="grid w-full gap-0.5 rounded-lg bg-slate-400 p-0.5 dark:bg-slate-500"
          style={{ gridTemplateColumns: `repeat(${cfg.cols}, minmax(0, 1fr))` }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {board.map((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                onClick={() => onClick(r, c)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  toggleFlag(r, c)
                }}
                className={cn(
                  'grid aspect-square w-full place-items-center rounded-sm font-bold transition active:scale-95',
                  textSize,
                  cell.revealed
                    ? 'bg-slate-100 dark:bg-slate-800'
                    : 'bg-slate-300 hover:bg-slate-400 dark:bg-slate-500 dark:hover:bg-slate-400',
                  status === 'lost' && cell.mine && 'bg-rose-400 text-white',
                )}
              >
                {cell.revealed || (status === 'lost' && cell.mine)
                  ? cell.mine
                    ? '💣'
                    : cell.adj > 0
                      ? <span className={NUM_COLORS[cell.adj]}>{cell.adj}</span>
                      : ''
                  : cell.flagged
                    ? '🚩'
                    : ''}
              </button>
            )),
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button className={cn('btn', flagMode && 'btn-accent')} onClick={() => setFlagMode((f) => !f)}>
            🚩 标记模式 {flagMode ? '开' : '关'}
          </button>
          {status !== 'playing' && (
            <span className={cn('text-sm font-semibold', status === 'won' ? 'text-green-500' : 'text-rose-500')}>
              {status === 'won' ? '🎉 通关！' : '💥 踩雷了'}
            </span>
          )}
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">手机：开「标记模式」后点格子插旗</p>
      </div>
    </GameShell>
  )
}
