import { useEffect, useMemo, useState } from 'react'
import { GameShell } from '../../components/GameShell'
import { markPlayedToday } from '../../lib/streak'
import { getJSON, setJSON } from '../../lib/storage'
import { cn } from '../../lib/cn'
import {
  Block,
  DIRS,
  KMove,
  LEVELS,
  LABEL,
  canStep,
  generate,
  isWin,
  scrambleSolution,
  step,
  targetCells,
} from './klotskiData'

function fmt(t: number) {
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export function Klotski() {
  const [lvlIdx, setLvlIdx] = useState(0)
  const level = LEVELS[lvlIdx]
  const gen = useMemo(() => generate(level.seed, level.turns), [level])
  const initBlocks = gen.blocks
  const levelSolution = useMemo(() => scrambleSolution(gen.moves), [gen])

  const [blocks, setBlocks] = useState<Block[]>(initBlocks)
  const [selected, setSelected] = useState<number | null>(null)
  const [past, setPast] = useState<Block[][]>([])
  const [steps, setSteps] = useState(0)
  const [started, setStarted] = useState(false)
  const [solved, setSolved] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const bestKey = `klotski:best:${level.id}`
  const [best, setBest] = useState<number | null>(() => getJSON<number | null>(bestKey, null))

  // 解法 / 演示
  const [solution, setSolution] = useState<KMove[] | null>(null)
  const [solutionBase, setSolutionBase] = useState<Block[] | null>(null)
  const [solutionOpen, setSolutionOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [playPos, setPlayPos] = useState(0)

  useEffect(() => {
    setBlocks(initBlocks)
    setSelected(null)
    setPast([])
    setSteps(0)
    setStarted(false)
    setSolved(false)
    setElapsed(0)
    setBest(getJSON<number | null>(bestKey, null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lvlIdx])

  useEffect(() => {
    if (!started || solved) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [started, solved])

  // 解法演示：逐步回放
  useEffect(() => {
    if (!playing || !solution) return
    if (playPos >= solution.length) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => {
      const mv = solution[playPos]
      setBlocks((prev) => step(prev, mv.id, mv.dx, mv.dy))
      setSelected(null)
      setPlayPos((p) => p + 1)
    }, 360)
    return () => clearTimeout(t)
  }, [playing, playPos, solution])

  useEffect(() => {
    if (solved) return
    if (isWin(blocks)) {
      setSolved(true)
      markPlayedToday()
      if (best == null || steps < best) {
        setJSON(bestKey, steps)
        setBest(steps)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks])

  // 当前选中方块可移动到的目标空格集合
  const targets = useMemo(() => {
    const set = new Set<string>()
    if (selected == null) return set
    const b = blocks.find((x) => x.id === selected)
    if (!b) return set
    for (const [dx, dy] of DIRS)
      if (canStep(blocks, b.id, dx, dy))
        for (const [tx, ty] of targetCells(b, dx, dy)) set.add(`${tx},${ty}`)
    return set
  }, [selected, blocks])

  function clickCell(x: number, y: number) {
    if (solved || playing) return
    // 点到方块：选中 / 取消 / 单方向自动走
    const g = blocks.reduce<(number | null)[][]>((acc, b) => {
      for (let yy = 0; yy < b.h; yy++) for (let xx = 0; xx < b.w; xx++) acc[b.y + yy][b.x + xx] = b.id
      return acc
    }, Array.from({ length: 5 }, () => Array(5).fill(null) as (number | null)[]))
    const id = g[y][x]
    if (id != null) {
      if (selected === id) {
        setSelected(null)
        return
      }
      // 计算该方块合法移动方向数：仅一个方向时，点一下直接走过去
      const dirs = DIRS.filter(([dx, dy]) => canStep(blocks, id, dx, dy))
      if (dirs.length === 1) {
        doMove(id, dirs[0][0], dirs[0][1])
        return
      }
      setSelected(id)
      return
    }
    // 点到空格：若选中方块且此格是合法目标，则移动
    if (selected == null) return
    const b = blocks.find((x2) => x2.id === selected)
    if (!b) return
    for (const [dx, dy] of DIRS) {
      if (!canStep(blocks, b.id, dx, dy)) continue
      if (targetCells(b, dx, dy).some(([tx, ty]) => tx === x && ty === y)) {
        doMove(b.id, dx, dy)
        return
      }
    }
  }

  function doMove(id: number, dx: number, dy: number) {
    setPast((p) => [...p, blocks])
    setBlocks((prev) => step(prev, id, dx, dy))
    setSelected(null)
    setStarted(true)
    setSteps((s) => s + 1)
  }

  function undo() {
    if (!past.length || playing) return
    const prev = past[past.length - 1]
    setBlocks(prev)
    setPast((p) => p.slice(0, -1))
    setSelected(null)
    setStarted(true)
    setSteps((s) => Math.max(0, s - 1))
  }

  function reset() {
    setPlaying(false)
    setSolution(null)
    setSolutionBase(null)
    setSolutionOpen(false)
    setPlayPos(0)
    setBlocks(gen.blocks)
    setSelected(null)
    setPast([])
    setSteps(0)
    setStarted(false)
    setSolved(false)
    setElapsed(0)
  }

  // 解法即「初始打乱的逆序反向」，由生成器直接给出，即时可得
  function showSolution() {
    if (playing) return
    setSolution(levelSolution)
    setSolutionBase(gen.blocks)
    setSolutionOpen(true)
  }

  function playSolution() {
    if (!solution || !solutionBase) return
    setSolutionOpen(false)
    setPlaying(true)
    setSelected(null)
    setPast([])
    setStarted(true)
    setSolved(false)
    setBlocks(solutionBase)
    setPlayPos(0)
  }

  function shareText() {
    return `脑力小站 华容道 [${level.name}] ${steps}步 · ${fmt(elapsed)} · ${solved ? '已通关' : '挑战中'}`
  }

  return (
    <GameShell
      help={
        <div>
          <h3>🎯 目标</h3>
          <p>移动棋子，让最大的「<strong>曹操</strong>」从底部中央的<strong>出口</strong>逃出。</p>
          <h3>🕹️ 操作</h3>
          <ul>
            <li>先<strong>点选</strong>要移动的棋子，再点它旁边<strong>高亮的空格</strong>即可滑动。</li>
            <li>若棋子<strong>只有一个方向</strong>可走，点一下就会<strong>自动过去</strong>，无需再点目标格。</li>
            <li>棋子一次只能移到<strong>相邻的空格</strong>，不能跨越；底部中央高亮处即<strong>出口</strong>。</li>
          </ul>
          <h3>🧩 棋子形状</h3>
          <ul>
            <li>曹操 2×2、关羽 1×2（横）、四将 各 1×2（竖）、四兵 各 1×1，另有 2 个空格。</li>
          </ul>
          <h3>↩️ 撤销 & 最佳</h3>
          <ul>
            <li>可<strong>逐步撤销</strong>刚才的走法。</li>
            <li>点「<strong>答案</strong>」查看最短解法，「<strong>播放</strong>」可在盘面逐步演示。</li>
            <li>通关后记录<strong>步数</strong>并保存最佳。</li>
          </ul>
          <p>内置多个经典布局（如「横刀立马」），越往后越烧脑。</p>
        </div>
      }
      title="华容道"
      subtitle="移动棋子，让曹操从底部出口逃出"
      onReset={reset}
      onShare={shareText}
      extra={
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={lvlIdx}
            onChange={(e) => setLvlIdx(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            {LEVELS.map((l, i) => (
              <option key={l.id} value={i}>
                {l.name}
              </option>
            ))}
          </select>
          <button onClick={showSolution} disabled={playing} className="btn px-2.5 py-1 text-sm disabled:opacity-40">
            答案
          </button>
          <button
            onClick={playSolution}
            disabled={!solution || playing}
            className="btn px-2.5 py-1 text-sm disabled:opacity-40"
          >
            播放
          </button>
          <button onClick={undo} disabled={!past.length || playing} className="btn px-2.5 py-1 text-sm disabled:opacity-40">
            撤销
          </button>
          <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">
            步数 {steps} · ⏱ {fmt(elapsed)} · 最佳 {best != null ? `${best}步` : '—'}
          </span>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-[340px]">
        <div className="relative aspect-[4/5] w-full rounded-xl bg-slate-300/60 p-1 dark:bg-slate-700/60">
          {/* 底层空格（捕捉点击） */}
          <div className="absolute inset-1 grid grid-cols-4 grid-rows-5 gap-1">
            {Array.from({ length: 5 }).map((_, y) =>
              Array.from({ length: 4 }).map((_, x) => {
                const isTarget = targets.has(`${x},${y}`)
                return (
                  <button
                    key={`${x},${y}`}
                    onClick={() => clickCell(x, y)}
                    className={cn(
                      'rounded-md transition',
                      isTarget && 'bg-emerald-400/50 ring-2 ring-emerald-400 dark:bg-emerald-400/30',
                    )}
                  />
                )
              }),
            )}
          </div>
          {/* 方块层 */}
          {blocks.map((b) => {
            const lab = LABEL[b.type]
            return (
              <button
                key={b.id}
                onClick={() => clickCell(b.x, b.y)}
                style={{
                  position: 'absolute',
                  left: `calc(0.25rem + ${b.x} * (100% - 0.5rem) / 4)`,
                  top: `calc(0.25rem + ${b.y} * (100% - 0.5rem) / 5)`,
                  width: `calc(${b.w} * (100% - 0.5rem) / 4 - 0.25rem)`,
                  height: `calc(${b.h} * (100% - 0.5rem) / 5 - 0.25rem)`,
                }}
                className={cn(
                  'grid place-items-center rounded-md text-lg font-bold shadow-md transition active:scale-95',
                  lab.cls,
                  selected === b.id && 'ring-2 ring-offset-1 ring-accent dark:ring-offset-slate-900',
                )}
              >
                {lab.t}
              </button>
            )
          })}
          {/* 底部中央出口高亮（曹操逃出处） */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-emerald-400/50 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-7 items-end justify-center">
            <span className="mb-0.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              出口
            </span>
          </div>
        </div>

        {/* 出口说明 */}
        <div className="mt-2 flex flex-col items-center gap-0.5">
          <span className="text-2xl leading-none text-emerald-500">⬇</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            曹操从此处逃出
          </span>
        </div>

        {solved && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            🎉 曹操成功突围！用了 {steps} 步 · {fmt(elapsed)}
            {best === steps && ' · 步数新纪录！'}
          </div>
        )}

        {/* 解法面板 */}
        {solutionOpen && solution && solutionBase && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white/70 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/60">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="font-semibold text-slate-700 dark:text-slate-200">
                {solution.length === 0
                  ? '当前已是通关局面'
                  : `最短解法：共 ${solution.length} 步`}
              </div>
              <button
                onClick={() => setSolutionOpen(false)}
                className="rounded-md px-2 py-0.5 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700"
              >
                收起
              </button>
            </div>
            <ol className="max-h-44 space-y-1 overflow-y-auto pr-1">
              {solution.map((mv, i) => {
                const b = solutionBase.find((x) => x.id === mv.id)!
                const name = LABEL[b.type].t
                const d = mv.dx > 0 ? '右' : mv.dx < 0 ? '左' : mv.dy > 0 ? '下' : '上'
                return (
                  <li key={i} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400">{i + 1}.</span>
                    <span className="font-medium">{name}</span>
                    <span>→</span>
                    <span>{d}</span>
                  </li>
                )
              })}
            </ol>
            <button onClick={playSolution} className="btn mt-2 w-full justify-center py-1.5 text-sm">
              ▶️ 在盘面播放演示
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}
