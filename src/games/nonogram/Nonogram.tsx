import { useEffect, useMemo, useState } from 'react'
import { GameShell } from '../../components/GameShell'
import { markPlayedToday } from '../../lib/streak'
import { getJSON, setJSON } from '../../lib/storage'
import { cn } from '../../lib/cn'
import { NONOGRAM_PUZZLES } from './nonogramData'

// 0 空 / 1 填 / 2 标记(叉)
type Cell = 0 | 1 | 2

function toGrid(rows: string[]): number[][] {
  return rows.map((r) => r.split('').map((ch) => (ch === '1' ? 1 : 0)))
}

function lineClues(line: number[]): number[] {
  const res: number[] = []
  let run = 0
  for (const v of line) {
    if (v === 1) run++
    else if (run > 0) {
      res.push(run)
      run = 0
    }
  }
  if (run > 0) res.push(run)
  if (res.length === 0) res.push(0)
  return res
}

// 某行/列是否已完全且正确地解出（填格集合与答案一致）
function lineResolved(gline: number[], sline: number[]): boolean {
  for (let i = 0; i < gline.length; i++) {
    if ((gline[i] === 1) !== (sline[i] === 1)) return false
  }
  return true
}

// 对已完成（且正确）的整行/整列，把剩余空格自动标叉
function autoMark(g: Cell[][], sol: number[][]): Cell[][] {
  const R = g.length
  const C = g[0].length
  const ng: Cell[][] = g.map((row) => row.slice() as Cell[])
  for (let r = 0; r < R; r++) {
    if (lineResolved(g[r], sol[r])) {
      for (let c = 0; c < C; c++) if (ng[r][c] === 0) ng[r][c] = 2
    }
  }
  for (let c = 0; c < C; c++) {
    let ok = true
    for (let r = 0; r < R; r++) {
      if ((g[r][c] === 1) !== (sol[r][c] === 1)) {
        ok = false
        break
      }
    }
    if (ok) for (let r = 0; r < R; r++) if (ng[r][c] === 0) ng[r][c] = 2
  }
  return ng
}

function isSolved(g: Cell[][], sol: number[][]): boolean {
  for (let r = 0; r < g.length; r++)
    for (let c = 0; c < g[0].length; c++)
      if ((g[r][c] === 1) !== (sol[r][c] === 1)) return false
  return true
}

const MAX_HINTS = 3

export function Nonogram() {
  const [pIdx, setPIdx] = useState(0)
  const puzzle = NONOGRAM_PUZZLES[pIdx]
  const solution = useMemo(() => toGrid(puzzle.rows), [puzzle])
  const rows = solution.length
  const cols = solution[0].length

  const rowClues = useMemo(() => solution.map((r) => lineClues(r)), [solution])
  const colClues = useMemo(() => {
    const res: number[][] = []
    for (let c = 0; c < cols; c++) res.push(lineClues(solution.map((r) => r[c])))
    return res
  }, [solution])

  const [grid, setGrid] = useState<Cell[][]>(() => solution.map((r) => r.map(() => 0) as Cell[]))
  const [tool, setTool] = useState<'fill' | 'mark'>('fill')
  const [mistakes, setMistakes] = useState(0)
  const [hints, setHints] = useState(0)
  const [started, setStarted] = useState(false)
  const [solved, setSolved] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [showErrors, setShowErrors] = useState(false)
  const bestKey = `nonogram:best:${puzzle.id}`
  const [best, setBest] = useState<number | null>(() => getJSON<number | null>(bestKey, null))

  // 切换关卡时重置
  useEffect(() => {
    setGrid(solution.map((r) => r.map(() => 0) as Cell[]))
    setTool('fill')
    setMistakes(0)
    setHints(0)
    setStarted(false)
    setSolved(false)
    setElapsed(0)
    setShowErrors(false)
    setBest(getJSON<number | null>(bestKey, null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pIdx])

  // 计时
  useEffect(() => {
    if (!started || solved) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [started, solved])

  // 通关判定（副作用放在 effect 里，避免 StrictMode 双调用）
  useEffect(() => {
    if (solved) return
    if (isSolved(grid, solution)) {
      setSolved(true)
      markPlayedToday()
      if (best == null || elapsed < best) {
        setJSON(bestKey, elapsed)
        setBest(elapsed)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid])

  function update(r: number, c: number, mode: 'fill' | 'mark') {
    if (solved) return
    setStarted(true)
    setShowErrors(false)
    setGrid((prev) => {
      const ng: Cell[][] = prev.map((row) => row.slice() as Cell[])
      const cur = ng[r][c]
      if (mode === 'fill') ng[r][c] = cur === 1 ? 0 : 1
      else ng[r][c] = cur === 2 ? 0 : 2
      return autoMark(ng, solution)
    })
  }

  function hint() {
    if (solved || hints >= MAX_HINTS) return
    const cand: [number, number][] = []
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (solution[r][c] === 1 && grid[r][c] !== 1) cand.push([r, c])
    if (!cand.length) return
    const [r, c] = cand[Math.floor(Math.random() * cand.length)]
    setStarted(true)
    setGrid((prev) => {
      const ng: Cell[][] = prev.map((row) => row.slice() as Cell[])
      ng[r][c] = 1
      return autoMark(ng, solution)
    })
    setHints((h) => h + 1)
  }

  function check() {
    if (solved) return
    let wrong = 0
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (grid[r][c] === 1 && solution[r][c] === 0) wrong++
    if (wrong > 0) setMistakes((m) => m + wrong)
    setShowErrors(true)
  }

  function reset() {
    setGrid(solution.map((r) => r.map(() => 0) as Cell[]))
    setMistakes(0)
    setHints(0)
    setStarted(false)
    setSolved(false)
    setElapsed(0)
    setShowErrors(false)
  }

  function shareText() {
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
    const ss = String(elapsed % 60).padStart(2, '0')
    return `脑力小站 数织「${puzzle.title}」${rows}×${cols} · 用时 ${mm}:${ss} · 提示 ${hints} · 错误 ${mistakes} · ${solved ? '已通关' : '挑战中'}`
  }

  const cs = cols <= 5 ? '44px' : cols <= 10 ? '34px' : '26px'
  const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`

  return (
    <GameShell
      help={
        <div>
          <h3>🎯 目标</h3>
          <p>根据每行、每列的<strong>线索数字</strong>，在网格中填色，还原出隐藏的图案。</p>
          <h3>🔢 线索怎么看</h3>
          <ul>
            <li>行首 / 列首的一组数字，表示该行 / 列中<strong>连续填色块的长度</strong>。</li>
            <li>例如 <strong>「3 1」</strong> = 先一段 3 格、中间空至少 1 格、再一段 1 格。</li>
          </ul>
          <h3>🕹️ 操作</h3>
          <ul>
            <li><strong>左键 / 点按</strong>：填色。</li>
            <li><strong>右键 / 标记模式</strong>：打叉 ❌ 标记确认是空白。</li>
            <li>某行 / 列<strong>已正确完成</strong>时会自动半透明叉掉确定空白，辅助判断。</li>
          </ul>
          <h3>🧰 辅助</h3>
          <ul>
            <li><strong>检查</strong>：标出当前填错的格。</li>
            <li><strong>提示</strong>：有限次揭示一个正确格（用尽即止）。</li>
          </ul>
          <p>所有图案格填对即通关，并会记录<strong>用时与最佳</strong>。</p>
        </div>
      }
      title="数织 Nonogram"
      subtitle="左键填色 · 右键标记 · 按线索还原图案"
      onReset={reset}
      onShare={shareText}
      extra={
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pIdx}
            onChange={(e) => setPIdx(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            {NONOGRAM_PUZZLES.map((p, i) => (
              <option key={p.id} value={i}>
                {p.title}（{p.rows.length}×{p.rows[0].length}）
              </option>
            ))}
          </select>
          <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
            <button
              onClick={() => setTool('fill')}
              className={cn('px-2.5 py-1 text-sm', tool === 'fill' ? 'bg-accent text-white' : 'bg-white dark:bg-slate-800')}
            >
              填色
            </button>
            <button
              onClick={() => setTool('mark')}
              className={cn('px-2.5 py-1 text-sm', tool === 'mark' ? 'bg-accent text-white' : 'bg-white dark:bg-slate-800')}
            >
              标记
            </button>
          </div>
          <button onClick={hint} disabled={hints >= MAX_HINTS} className="btn px-2.5 py-1 text-sm disabled:opacity-40">
            提示 {hints}/{MAX_HINTS}
          </button>
          <button onClick={check} className="btn px-2.5 py-1 text-sm">
            检查
          </button>
          <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">
            ⏱ {fmt(elapsed)} · ❌ {mistakes} · 最佳 {best != null ? fmt(best) : '—'}
          </span>
        </div>
      }
    >
      <div className="flex justify-center">
        <div className="overflow-x-auto">
          <div
            className="inline-grid gap-1 rounded-2xl bg-slate-50/80 p-3 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800/40 dark:ring-slate-700/60"
            style={{ gridTemplateColumns: `auto repeat(${cols}, ${cs})` }}
          >
            {/* 左上角 */}
            <div />
            {/* 列线索 */}
            {colClues.map((cl, c) => (
              <div
                key={`c${c}`}
                className="flex flex-col justify-end px-1 pb-1.5 text-xs font-bold leading-tight text-slate-600 dark:text-slate-300"
              >
                {cl.map((n, i) => (
                  <span key={i}>{n}</span>
                ))}
              </div>
            ))}
            {/* 行 + 单元格 */}
            {grid.map((row, r) => (
              <div key={`r${r}`} className="contents">
                <div className="flex items-center justify-end gap-1 pr-2 text-xs font-bold leading-tight text-slate-600 dark:text-slate-300">
                  {rowClues[r].map((n, i) => (
                    <span key={i}>{n}</span>
                  ))}
                </div>
                {row.map((v, c) => {
                  const isErr = showErrors && v === 1 && solution[r][c] === 0
                  const groupR = c % 5 === 4 && c < cols - 1
                  const groupB = r % 5 === 4 && r < rows - 1
                  return (
                    <button
                      key={c}
                      onClick={() => update(r, c, tool)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        update(r, c, 'mark')
                      }}
                      style={{ width: cs, height: cs }}
                      className={cn(
                        'grid place-items-center rounded-md border text-base font-semibold transition active:scale-95',
                        v === 1
                          ? 'border-slate-700 bg-slate-800 text-slate-100 dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900'
                          : v === 2
                            ? 'border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
                        groupR && 'border-r-2 border-r-slate-400 dark:border-r-slate-500',
                        groupB && 'border-b-2 border-b-slate-400 dark:border-b-slate-500',
                        isErr && 'border-rose-400 bg-rose-400 text-white dark:text-white',
                      )}
                    >
                      {v === 2 ? '×' : ''}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {solved && (
        <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          🎉 恭喜还原「{puzzle.title}」！用时 {fmt(elapsed)}
          {best != null && best === elapsed && ' · 新纪录！'}
        </div>
      )}
    </GameShell>
  )
}
