import { useEffect, useRef, useState } from 'react'
import { GameShell } from '../../components/GameShell'
import { markPlayedToday } from '../../lib/streak'
import { cn } from '../../lib/cn'

type Mode = 'number' | 'photo'

/** 已解状态：[1,2,...,N*N-1, 0] */
function solvedTiles(N: number): number[] {
  const n = N * N
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? 0 : i + 1))
}

function isSolved(tiles: number[]): boolean {
  const n = tiles.length
  for (let i = 0; i < n - 1; i++) if (tiles[i] !== i + 1) return false
  return tiles[n - 1] === 0
}

function neighborsOf(idx: number, N: number): number[] {
  const r = Math.floor(idx / N)
  const c = idx % N
  const out: number[] = []
  if (r > 0) out.push(idx - N)
  if (r < N - 1) out.push(idx + N)
  if (c > 0) out.push(idx - 1)
  if (c < N - 1) out.push(idx + 1)
  return out
}

/** 从已解状态出发，做若干随机有效移动 → 保证可解，并记录打乱路径 */
function scramble(N: number): { tiles: number[]; path: number[] } {
  const tiles = solvedTiles(N)
  let blank = tiles.length - 1
  const path: number[] = []
  const steps = N * N * 6
  let prev = -1
  for (let s = 0; s < steps; s++) {
    const nbs = neighborsOf(blank, N).filter((x) => x !== prev)
    const pick = nbs[Math.floor(Math.random() * nbs.length)]
    path.push(blank) // 记录移动前的空格位置（用于后续反推还原）
    tiles[blank] = tiles[pick]
    tiles[pick] = 0
    prev = pick
    blank = pick
  }
  if (isSolved(tiles)) return scramble(N)
  return { tiles, path }
}

/* ---------- A* (IDA*) 求解器：曼哈顿距离 + 线性冲突 ---------- */
function manhattan(tiles: number[], N: number): number {
  let d = 0
  for (let i = 0; i < tiles.length; i++) {
    const v = tiles[i]
    if (v === 0) continue
    const gr = Math.floor((v - 1) / N)
    const gc = (v - 1) % N
    const r = Math.floor(i / N)
    const c = i % N
    d += Math.abs(r - gr) + Math.abs(c - gc)
  }
  return d
}

function linearConflict(tiles: number[], N: number): number {
  let lc = 0
  for (let r = 0; r < N; r++)
    for (let c1 = 0; c1 < N; c1++) {
      const v1 = tiles[r * N + c1]
      if (v1 === 0 || Math.floor((v1 - 1) / N) !== r) continue
      for (let c2 = c1 + 1; c2 < N; c2++) {
        const v2 = tiles[r * N + c2]
        if (v2 === 0 || Math.floor((v2 - 1) / N) !== r) continue
        if ((v1 - 1) % N > (v2 - 1) % N) lc += 2
      }
    }
  for (let c = 0; c < N; c++)
    for (let r1 = 0; r1 < N; r1++) {
      const v1 = tiles[r1 * N + c]
      if (v1 === 0 || (v1 - 1) % N !== c) continue
      for (let r2 = r1 + 1; r2 < N; r2++) {
        const v2 = tiles[r2 * N + c]
        if (v2 === 0 || (v2 - 1) % N !== c) continue
        if (Math.floor((v1 - 1) / N) > Math.floor((v2 - 1) / N)) lc += 2
      }
    }
  return lc
}

function heuristic(tiles: number[], N: number): number {
  return manhattan(tiles, N) + linearConflict(tiles, N)
}

/** 返回从当前局面到已解的移动序列（每个元素是与空格交换的邻格下标），找不到返回 null */
function solve(tiles: number[], N: number): number[] | null {
  if (isSolved(tiles)) return []
  const work = tiles.slice()
  let blank = work.indexOf(0)
  let bound = heuristic(work, N)
  const path: number[] = []
  const MAX = 600000
  let count = 0

  function dfs(g: number, prev: number): number {
    if (++count > MAX) return Infinity
    const h = heuristic(work, N)
    const f = g + h
    if (f > bound) return f
    if (h === 0) return -1
    const nbs = neighborsOf(blank, N).filter((x) => x !== prev)
    let min = Infinity
    for (const nb of nbs) {
      const from = blank
      const v = work[nb]
      work[from] = v
      work[nb] = 0
      blank = nb
      path.push(nb)
      const t = dfs(g + 1, from)
      if (t === -1) return -1
      if (t < min) min = t
      path.pop()
      work[nb] = v
      work[from] = 0
      blank = from
    }
    return min
  }

  while (true) {
    const t = dfs(0, -1)
    if (t === -1) return path.slice()
    if (t === Infinity || t === bound) return null
    bound = t
  }
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function SlidePuzzle() {
  // 一次性生成初始局面，保证 tiles 与 moveHistory 来自同一次打乱
  const initRef = useRef<{ tiles: number[]; path: number[] }>()
  if (!initRef.current) initRef.current = scramble(4)

  const [size, setSize] = useState(4)
  const [mode, setMode] = useState<Mode>('number')
  const [tiles, setTiles] = useState<number[]>(initRef.current.tiles)
  // 每一步记录「移动前的空格位置」，反序回放即可回到已解状态（始终可解、瞬时）
  const [moveHistory, setMoveHistory] = useState<number[]>(initRef.current.path)
  const [moves, setMoves] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [solved, setSolved] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [showNumbers, setShowNumbers] = useState(true)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [solveSpeed, setSolveSpeed] = useState(450) // 自动求解每步停顿(ms)，默认最慢
  const fileRef = useRef<HTMLInputElement>(null)

  // 计时器
  useEffect(() => {
    if (startedAt == null || solved) return
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250)
    return () => clearInterval(id)
  }, [startedAt, solved])

  // 键盘方向键：方向键 = 该侧的方块向空格滑动
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (animating || solved) return
      const map: Record<string, number> = {
        ArrowUp: size, // 下方方块上移
        ArrowDown: -size, // 上方方块下移
        ArrowLeft: 1, // 右方方块左移
        ArrowRight: -1, // 左方方块右移
      }
      if (!(e.key in map)) return
      e.preventDefault()
      const blank = tiles.indexOf(0)
      const target = blank + map[e.key] // doMove 会校验是否为合法邻格
      doMove(target)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles, animating, solved, size])

  function doMove(target: number) {
    if (animating || solved) return
    const blank = tiles.indexOf(0)
    if (!neighborsOf(blank, size).includes(target)) return
    if (startedAt == null) setStartedAt(Date.now())
    const next = tiles.slice()
    next[blank] = next[target]
    next[target] = 0
    setMoveHistory((h) => [...h, blank]) // 记录移动前的空格位置（反序回放即可还原）
    setTiles(next)
    setMoves((m) => m + 1)
    if (isSolved(next)) {
      setSolved(true)
      markPlayedToday()
    }
  }

  function newPuzzle(nextSize: number = size, nextMode: Mode = mode) {
    const { tiles: t, path } = scramble(nextSize)
    setTiles(t)
    setMoveHistory(path)
    setMoves(0)
    setStartedAt(null)
    setElapsed(0)
    setSolved(false)
    setAnimating(false)
    setSize(nextSize)
    setMode(nextMode)
    setToast(null)
  }

  function changeSize(n: number) {
    newPuzzle(n, mode)
  }
  function changeMode(m: Mode) {
    newPuzzle(size, m)
  }

  async function autoSolve() {
    if (animating || solved) return
    // 3×3 用 A* 求最优解（瞬时）；4×4 / 5×5 直接用打乱+手动历史反序回放（必定可解、无卡顿）
    const sol = size === 3 ? solve(tiles, 3) : null
    const steps: number[] = sol && sol.length ? sol : moveHistory.slice().reverse()
    const speed = solveSpeed // 由「求解速度」按钮控制，默认最慢以便看清
    setAnimating(true)
    if (startedAt == null) setStartedAt(Date.now())
    let cur = tiles.slice()
    let b = cur.indexOf(0)
    for (let i = 0; i < steps.length; i++) {
      const target = steps[i]
      await delay(speed)
      const v = cur[target]
      cur[target] = 0
      cur[b] = v
      b = target
      setTiles(cur.slice())
      setMoves((m) => m + 1) // 逐步累加，步数与动画一一对应
      setToast(`自动求解中… ${i + 1}/${steps.length}`)
    }
    setAnimating(false)
    setToast(null)
    setSolved(true)
    markPlayedToday()
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImageUrl(reader.result as string)
      if (mode !== 'photo') setMode('photo')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function shareText(): string {
    return `脑力小站 拼图 ${size}×${size} · ${solved ? '已通关 ✅' : '进行中'} · 步数 ${moves} · 用时 ${fmtTime(elapsed)}`
  }

  const fontClass = size <= 3 ? 'text-2xl' : size === 4 ? 'text-xl' : 'text-base'

  return (
    <GameShell
      title="滑块拼图"
      subtitle="点击与空格相邻的方块滑动，把数字按顺序排好"
      onReset={() => newPuzzle()}
      onShare={shareText}
      extra={
        <>
          <select
            className="rounded-lg bg-slate-200 px-2 py-1 text-sm font-medium dark:bg-slate-700"
            value={size}
            onChange={(e) => changeSize(Number(e.target.value))}
          >
            <option value={3}>3×3</option>
            <option value={4}>4×4</option>
            <option value={5}>5×5</option>
          </select>
          <select
            className="rounded-lg bg-slate-200 px-2 py-1 text-sm font-medium dark:bg-slate-700"
            value={mode}
            onChange={(e) => changeMode(e.target.value as Mode)}
          >
            <option value="number">数字</option>
            <option value="photo">图片</option>
          </select>
          {mode === 'photo' && (
            <label className="btn cursor-pointer">
              上传图片
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            </label>
          )}
          <div className="flex items-center gap-1">
            <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:inline">求解速度</span>
            {[
              { label: '极慢', v: 450 },
              { label: '慢', v: 300 },
              { label: '中', v: 180 },
              { label: '快', v: 90 },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setSolveSpeed(o.v)}
                disabled={animating}
                className={cn(
                  'rounded-md px-2 py-1 text-xs font-medium transition disabled:opacity-50',
                  solveSpeed === o.v
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button className={cn('btn btn-accent', (animating || solved) && 'opacity-50')} onClick={autoSolve} disabled={animating || solved}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 3 4 4-4 4" />
              <path d="M9 7h9a2 2 0 0 1 2 2v8" />
            </svg>
            自动求解
          </button>
        </>
      }
    >
      <div className="mx-auto w-full max-w-[440px]">
        <div
          className="grid w-full gap-1.5 rounded-xl bg-slate-200 p-1.5 dark:bg-slate-700"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {tiles.map((v, idx) => {
            const isBlank = v === 0
            const home = v - 1
            const homeRow = Math.floor(home / size)
            const homeCol = home % size
            const bgPos = size > 1 ? `${(homeCol / (size - 1)) * 100}% ${(homeRow / (size - 1)) * 100}%` : '0% 0%'
            return (
              <button
                key={idx}
                onClick={() => doMove(idx)}
                disabled={isBlank || animating || solved}
                className={cn(
                  'relative aspect-square select-none rounded-lg font-bold transition active:scale-95',
                  fontClass,
                  isBlank
                    ? 'cursor-default bg-slate-100 shadow-inner dark:bg-slate-800'
                    : 'bg-white text-slate-700 shadow ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-600 dark:text-slate-100 dark:ring-slate-500 dark:hover:bg-slate-500',
                )}
                style={
                  !isBlank && mode === 'photo' && imageUrl
                    ? {
                        backgroundImage: `url(${imageUrl})`,
                        backgroundSize: `${size * 100}% ${size * 100}%`,
                        backgroundPosition: bgPos,
                        backgroundColor: 'transparent',
                      }
                    : undefined
                }
              >
                {!isBlank && (
                  <span
                    className={cn(
                      'grid h-full w-full place-items-center',
                      mode === 'photo' && imageUrl && showNumbers
                        ? 'rounded-lg bg-black/35 text-xs text-white sm:text-sm'
                        : '',
                    )}
                  >
                    {mode === 'photo' && imageUrl && !showNumbers ? '' : v}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold tabular-nums text-slate-600 dark:text-slate-300">
            步数 <span className="text-slate-800 dark:text-slate-100">{moves}</span> · 用时{' '}
            <span className="text-slate-800 dark:text-slate-100">{fmtTime(elapsed)}</span>
          </span>
          <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={showNumbers}
              onChange={(e) => setShowNumbers(e.target.checked)}
              className="h-3.5 w-3.5 accent-indigo-500"
            />
            显示编号
          </label>
        </div>

        {mode === 'photo' && imageUrl && (
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <img src={imageUrl} alt="预览" className="h-10 w-10 rounded-md object-cover ring-1 ring-slate-300 dark:ring-slate-600" />
            原图预览 · 把碎片拼回完整图片
          </div>
        )}

        {solved && (
          <div className="mt-3 rounded-xl bg-green-100 px-3 py-2 text-center text-sm font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
            🎉 完成！用了 {moves} 步 / {fmtTime(elapsed)}
          </div>
        )}
        {toast && <div className="mt-3 rounded-xl bg-amber-100 px-3 py-2 text-center text-sm text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{toast}</div>}
      </div>
    </GameShell>
  )
}
