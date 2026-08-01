import { useCallback, useEffect, useRef, useState } from 'react'
import { GameShell } from '../../components/GameShell'
import { getJSON, setJSON } from '../../lib/storage'
import { markPlayedToday } from '../../lib/streak'

type Board = number[][]
const SIZE = 4

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

function slideRowLeft(row: number[]): { row: number[]; gained: number; moved: boolean } {
  const filtered = row.filter((v) => v !== 0)
  const out: number[] = []
  let gained = 0
  for (let i = 0; i < filtered.length; i++) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2
      out.push(merged)
      gained += merged
      i++
    } else {
      out.push(filtered[i])
    }
  }
  while (out.length < SIZE) out.push(0)
  const moved = out.some((v, i) => v !== row[i])
  return { row: out, gained, moved }
}

function transpose(b: Board): Board {
  return b[0].map((_, c) => b.map((r) => r[c]))
}
function reverseRows(b: Board): Board {
  return b.map((r) => r.slice().reverse())
}

type Dir = 'left' | 'right' | 'up' | 'down'

// 把棋盘旋转/翻转，使任意方向的滑动都等价于"向左滑"；该函数对自身可逆（transpose 与 reverseRows 都是自逆）
function transform(b: Board, dir: Dir): Board {
  if (dir === 'left') return b
  if (dir === 'right') return reverseRows(b)
  if (dir === 'up') return transpose(b)
  return transpose(reverseRows(b))
}

function moveLeft(b: Board): { b: Board; gained: number; moved: boolean } {
  let gained = 0
  let moved = false
  const nb = b.map((row) => {
    const r = slideRowLeft(row)
    gained += r.gained
    if (r.moved) moved = true
    return r.row
  })
  return { b: nb, gained, moved }
}

function addRandom(b: Board): Board {
  const empties: [number, number][] = []
  b.forEach((row, r) => row.forEach((v, c) => v === 0 && empties.push([r, c])))
  if (empties.length === 0) return b
  const [r, c] = empties[Math.floor(Math.random() * empties.length)]
  const nb = b.map((row) => row.slice())
  nb[r][c] = Math.random() < 0.9 ? 2 : 4
  return nb
}

function canMove(b: Board): boolean {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (b[r][c] === 0) return true
      if (c + 1 < SIZE && b[r][c] === b[r][c + 1]) return true
      if (r + 1 < SIZE && b[r][c] === b[r + 1][c]) return true
    }
  return false
}

const COLORS: Record<number, string> = {
  0: 'bg-slate-200 dark:bg-slate-700',
  2: 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-100',
  4: 'bg-orange-100 text-slate-700 dark:bg-orange-900/40 dark:text-orange-100',
  8: 'bg-orange-300 text-white',
  16: 'bg-orange-400 text-white',
  32: 'bg-amber-400 text-white',
  64: 'bg-amber-500 text-white',
  128: 'bg-yellow-400 text-white',
  256: 'bg-yellow-500 text-white',
  512: 'bg-lime-400 text-white',
  1024: 'bg-lime-500 text-white',
  2048: 'bg-green-500 text-white',
}
function tileColor(v: number): string {
  return COLORS[v] ?? 'bg-emerald-600 text-white'
}

export function Game2048() {
  const [board, setBoard] = useState<Board>(() => addRandom(addRandom(emptyBoard())))
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => getJSON<number>('game2048:best', 0))
  const [over, setOver] = useState(false)
  const [won, setWon] = useState(false)
  const touch = useRef<{ x: number; y: number } | null>(null)

  const move = useCallback(
    (dir: Dir) => {
      setBoard((prev) => {
        const t = transform(prev, dir)
        const { b: moved, gained, moved: didMove } = moveLeft(t)
        if (!didMove) return prev
        const next = transform(moved, dir)
        const withNew = addRandom(next)
        setScore((s) => {
          const ns = s + gained
          if (ns > best) {
            setBest(ns)
            setJSON('game2048:best', ns)
          }
          return ns
        })
        if (!won && withNew.some((row) => row.includes(2048))) setWon(true)
        if (!canMove(withNew)) setOver(true)
        markPlayedToday()
        return withNew
      })
    },
    [best, won],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, Dir> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
      }
      const dir = map[e.key]
      if (dir && !over) {
        e.preventDefault()
        move(dir)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [move, over])

  function reset() {
    setBoard(addRandom(addRandom(emptyBoard())))
    setScore(0)
    setOver(false)
    setWon(false)
  }

  function shareText(): string {
    return `脑力小站 2048 · 得分 ${score}${over ? '（游戏结束）' : ''} · 最高 ${best}`
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY }
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touch.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touch.current.x
    const dy = t.clientY - touch.current.y
    touch.current = null
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left')
    else move(dy > 0 ? 'down' : 'up')
  }

  return (
    <GameShell
      help={
        <div>
          <h3>🎯 目标</h3>
          <p>滑动合并相同数字方块，凑出 <strong>2048</strong>（之后还能继续冲 4096、8192…）。</p>
          <h3>🕹️ 操作</h3>
          <ul>
            <li>电脑：方向键或 <strong>WASD</strong> 控制方向。</li>
            <li>手机：在棋盘上<strong>手指滑动</strong>。</li>
          </ul>
          <h3>📐 规则</h3>
          <ul>
            <li>同数字相撞合并为<strong>翻倍</strong>的方块。</li>
            <li>每步所有方块朝同一方向滑到底；一次移动中已合并的方块<strong>本步不再二次合并</strong>。</li>
            <li>每步结束后会随机在空格生成一个新的 <strong>2 或 4</strong>。</li>
          </ul>
          <h3>💀 结束</h3>
          <p>棋盘填满且四个方向都无可合并的方块时，游戏结束。</p>
          <p><strong>最高分</strong>会自动记录，挑战自我吧！</p>
        </div>
      }
      title="2048"
      subtitle="滑动合并相同数字，凑出 2048"
      onShare={shareText}
      onReset={reset}
      extra={
        <div className="ml-auto flex gap-2 text-sm font-semibold">
          <span className="rounded-lg bg-slate-200 px-2.5 py-1 dark:bg-slate-700">分 {score}</span>
          <span className="rounded-lg bg-slate-200 px-2.5 py-1 dark:bg-slate-700">最高 {best}</span>
        </div>
      }
    >
      <div
        className="relative mx-auto aspect-square w-full max-w-[340px] select-none rounded-xl bg-slate-300 p-2 dark:bg-slate-700"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="grid h-full w-full grid-cols-4 grid-rows-4 gap-2">
          {board.flat().map((v, i) => (
            <div
              key={i}
              className={`grid place-items-center rounded-md text-2xl font-bold transition-colors ${tileColor(v)}`}
            >
              {v !== 0 ? v : ''}
            </div>
          ))}
        </div>

        {over && (
          <div className="absolute inset-0 grid place-items-center rounded-xl bg-black/55 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-lg font-bold text-white">游戏结束</p>
              <button className="btn btn-accent mt-2" onClick={reset}>
                再来一局
              </button>
            </div>
          </div>
        )}
        {won && !over && (
          <div className="absolute inset-x-0 bottom-2 mx-auto w-fit rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white shadow">
            已达成 2048！可继续挑战
          </div>
        )}
      </div>

      <div className="mx-auto mt-3 grid w-full max-w-[340px] grid-cols-3 gap-2 sm:hidden">
        <span />
        <button className="btn" onClick={() => move('up')}>↑</button>
        <span />
        <button className="btn" onClick={() => move('left')}>←</button>
        <button className="btn" onClick={() => move('down')}>↓</button>
        <button className="btn" onClick={() => move('right')}>→</button>
      </div>
      <p className="mt-2 text-center text-xs text-slate-400">电脑用方向键，手机滑动或点方向键</p>
    </GameShell>
  )
}
