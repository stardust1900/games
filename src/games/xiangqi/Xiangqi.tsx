import { useEffect, useMemo, useRef, useState } from 'react'
import { GameShell } from '../../components/GameShell'
import { markPlayedToday } from '../../lib/streak'
import {
  Board,
  Move,
  Piece,
  Side,
  SolveResult,
  applyMove,
  bestMove,
  inCheck,
  legalMoves,
  solveLine,
} from './xiangqiRules'
import { ENDGAMES, parseEndgame } from './xiangqiData'

const CHAR: Record<Side, Record<string, string>> = {
  r: { K: '帅', A: '仕', B: '相', N: '马', R: '车', C: '炮', P: '兵' },
  b: { K: '将', A: '士', B: '象', N: '馬', R: '車', C: '砲', P: '卒' },
}

function fmt(t: number) {
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

// 棋盘几何（SVG 坐标，交点式棋盘：9 列 × 10 行交点）
const CELL = 34
const PAD = 22
const BOARD_W = PAD * 2 + 8 * CELL
const BOARD_H = PAD * 2 + 9 * CELL
const px = (x: number) => PAD + x * CELL
// 翻转 y：让红方（数据 y 小）显示在底部，符合走棋习惯
const py = (y: number) => PAD + (9 - y) * CELL

// 传统棋盘「兵 / 炮」初始位置标记（红方在己方半场、黑方在对面）
const PIECE_MARKS: [number, number][] = [
  // 红炮(第3横线) 与 红兵(第4横线)
  [1, 2],
  [7, 2],
  [0, 3],
  [2, 3],
  [4, 3],
  [6, 3],
  [8, 3],
  // 黑炮 与 黑兵
  [1, 7],
  [7, 7],
  [0, 6],
  [2, 6],
  [4, 6],
  [6, 6],
  [8, 6],
]

const FILES = ['一', '二', '三', '四', '五', '六', '七', '八', '九']
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

function moveText(b: Board, m: Move): string {
  const p = b[m.fy][m.fx]
  const ch = p ? CHAR[p.side][p.type] : '?'
  return `${ch} ${FILES[m.fx]}${RANKS[m.fy]}→${FILES[m.tx]}${RANKS[m.ty]}`
}

export function Xiangqi() {
  const [endIdx, setEndIdx] = useState(0)
  const endgame = ENDGAMES[endIdx]

  const [board, setBoard] = useState<Board>(() => parseEndgame(endgame.rows))
  const [turn, setTurn] = useState<Side>('r')
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [history, setHistory] = useState<Board[]>([])
  const [aiThinking, setAiThinking] = useState(false)
  const [result, setResult] = useState<null | 'win' | 'lose'>(null)
  const [started, setStarted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [depth, setDepth] = useState(3)

  // 解法 / 演示
  const [solution, setSolution] = useState<SolveResult | null>(null)
  const [solutionBase, setSolutionBase] = useState<Board | null>(null)
  const [solutionOpen, setSolutionOpen] = useState(false)
  const [solving, setSolving] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [playPos, setPlayPos] = useState(0)

  const boardRef = useRef(board)
  boardRef.current = board

  const targets = useMemo(() => {
    const set = new Set<string>()
    if (!selected || turn !== 'r' || playing) return set
    for (const m of legalMoves(board, 'r'))
      if (m.fx === selected[0] && m.fy === selected[1]) set.add(`${m.tx},${m.ty}`)
    return set
  }, [selected, board, turn, playing])

  const check = useMemo(() => inCheck(board, turn), [board, turn])

  // 切换残局时重置
  useEffect(() => {
    loadEndgame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endIdx])

  useEffect(() => {
    if (!started || result || playing) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [started, result, playing])

  // 电脑（黑方）走子
  useEffect(() => {
    if (result || turn !== 'b' || aiThinking || playing) return
    setAiThinking(true)
    const id = setTimeout(() => {
      const m = bestMove(boardRef.current, depth)
      if (!m) {
        setResult('win')
        setAiThinking(false)
        return
      }
      const nb = applyMove(boardRef.current, m)
      setBoard(nb)
      setTurn('r')
      setAiThinking(false)
      if (legalMoves(nb, 'r').length === 0) setResult('lose')
    }, 90)
    return () => clearTimeout(id)
  }, [turn, result, aiThinking, depth, playing])

  // 解法演示：逐步回放主变线
  useEffect(() => {
    if (!playing || !solution) return
    if (playPos >= solution.line.length) {
      setPlaying(false)
      const b = boardRef.current
      if (inCheck(b, 'b') && legalMoves(b, 'b').length === 0) setResult('win')
      return
    }
    const t = setTimeout(() => {
      const m = solution.line[playPos]
      setBoard((prev) => applyMove(prev, m))
      setSelected(null)
      setPlayPos((p) => p + 1)
    }, 430)
    return () => clearTimeout(t)
  }, [playing, playPos, solution])

  function loadEndgame() {
    setBoard(parseEndgame(endgame.rows))
    setTurn('r')
    setSelected(null)
    setHistory([])
    setResult(null)
    setAiThinking(false)
    setStarted(false)
    setElapsed(0)
    setSolution(null)
    setSolutionBase(null)
    setSolutionOpen(false)
    setPlaying(false)
    setPlayPos(0)
  }

  function click(x: number, y: number) {
    if (result || aiThinking || playing || turn !== 'r') return
    const p: Piece | null = board[y][x]
    if (selected) {
      if (targets.has(`${x},${y}`)) {
        doPlayerMove({ fx: selected[0], fy: selected[1], tx: x, ty: y })
        return
      }
      if (p && p.side === 'r') {
        setSelected([x, y])
        return
      }
      setSelected(null)
      return
    }
    if (p && p.side === 'r') setSelected([x, y])
  }

  function doPlayerMove(m: Move) {
    const nb = applyMove(board, m)
    setHistory((h) => [...h, board])
    setBoard(nb)
    setSelected(null)
    setTurn('b')
    setStarted(true)
    markPlayedToday()
    if (legalMoves(nb, 'b').length === 0) setResult('win')
  }

  function undo() {
    if (!history.length || aiThinking || turn !== 'r' || playing) return
    const prev = history[history.length - 1]
    setBoard(prev)
    setHistory((h) => h.slice(0, -1))
    setSelected(null)
    setResult(null)
  }

  function reset() {
    setPlaying(false)
    loadEndgame()
  }

  function showSolution() {
    if (playing) return
    setSolving(true)
    setSolutionOpen(false)
    const base = boardRef.current
    // 让出主线程渲染「计算中」再计算
    setTimeout(() => {
      const sol = solveLine(base, 24, 3)
      setSolution(sol)
      setSolutionBase(base)
      setSolving(false)
      setSolutionOpen(true)
    }, 30)
  }

  function playSolution() {
    if (!solution || !solutionBase) return
    setSolutionOpen(false)
    setPlaying(true)
    setSelected(null)
    setHistory([])
    setResult(null)
    setBoard(solutionBase)
    setTurn('r')
    setPlayPos(0)
  }

  function shareText() {
    const r =
      result === 'win' ? '将死对方' : result === 'lose' ? '被将死' : '挑战中'
    return `脑力小站 象棋残局 [${endgame.name}] ${r} · ${fmt(elapsed)}`
  }

  const status = playing
    ? '▶️ 解法演示中…'
    : result
      ? result === 'win'
        ? '🎉 将死黑方，胜利！'
        : '💀 红方被将死，失败'
      : aiThinking
        ? 'AI 思考中…'
        : check
          ? '⚠️ 将军！'
          : '轮到你走（红方）'

  const solutionSummary =
    solution && solution.mated
      ? solution.winner === 'r'
        ? `✅ 红方将死黑方（共 ${solution.line.length} 着）`
        : `⚠️ 红方被将死（共 ${solution.line.length} 着）`
      : solution
        ? `推荐解法（共 ${solution.line.length} 着）`
        : ''

  return (
    <GameShell
      help={
        <div>
          <h3>🎯 目标</h3>
          <p>你执<strong>红方</strong>（位于下方），电脑执黑；把对方的「将 / 帅」<strong>将死</strong>即获胜。</p>
          <h3>🕹️ 操作</h3>
          <ul>
            <li>点选己方棋子，再点<strong>高亮格</strong>落子。</li>
            <li>可<strong>撤销</strong>上一步，并随时切换 AI 难度。</li>
            <li>点「<strong>答案</strong>」查看推荐解法，再点「<strong>播放</strong>」可在盘面逐步演示。</li>
          </ul>
          <h3>♟️ 走子规则</h3>
          <ul>
            <li><strong>车</strong>：直线任意格；<strong>马</strong>：走「日」，被「蹩腿」受限。</li>
            <li><strong>炮</strong>：隔一个棋子（炮架）才能吃子。</li>
            <li><strong>象 / 相</strong>：走「田」，不过河、怕「塞象眼」。</li>
            <li><strong>士 / 仕</strong>：在九宫内斜行；<strong>兵 / 卒</strong>：过河前只能前进，过河后可左右平移。</li>
            <li><strong>将 / 帅</strong>：不可在同一直线上照面（飞将）。</li>
          </ul>
          <h3>⚠️ 提示</h3>
          <ul>
            <li>棋板上浅色「+」是传统棋盘的<strong>兵 / 炮</strong>初始位置记号。</li>
            <li>被<strong>将军</strong>时会高亮提醒；轮到电脑时它会思考后落子。</li>
          </ul>
          <p>内置经典残局与古谱排局，多为红方先手占优——想想如何一击制胜！</p>
        </div>
      }
      title="象棋残局"
      subtitle="你执红（下方），电脑执黑，将死对方即胜"
      onReset={reset}
      onShare={shareText}
      extra={
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={endIdx}
            onChange={(e) => setEndIdx(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            {ENDGAMES.map((e, i) => (
              <option key={e.id} value={i}>
                {e.name}
              </option>
            ))}
          </select>
          <select
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            <option value={2}>简单</option>
            <option value={3}>普通</option>
            <option value={4}>困难</option>
          </select>
          <button onClick={showSolution} disabled={solving || playing} className="btn px-2.5 py-1 text-sm disabled:opacity-40">
            {solving ? '计算中…' : '答案'}
          </button>
          <button
            onClick={playSolution}
            disabled={!solution || playing}
            className="btn px-2.5 py-1 text-sm disabled:opacity-40"
          >
            播放
          </button>
          <button onClick={undo} disabled={!history.length} className="btn px-2.5 py-1 text-sm disabled:opacity-40">
            撤销
          </button>
          <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">⏱ {fmt(elapsed)}</span>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-[360px]">
        <div className="mb-2 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">{status}</div>
        <svg
          viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
          className="w-full select-none rounded-lg shadow-md"
          style={{ touchAction: 'manipulation' }}
        >
          {/* 木色底板 */}
          <rect x={0} y={0} width={BOARD_W} height={BOARD_H} rx={8} fill="#f0d9a8" />
          {/* 横线（10 条，全宽贯通） */}
          {Array.from({ length: 10 }).map((_, y) => (
            <line key={`h${y}`} x1={px(0)} y1={py(y)} x2={px(8)} y2={py(y)} stroke="#7c5a2e" strokeWidth={1.2} />
          ))}
          {/* 竖线（9 条；内线在楚河汉界处断开，外边线贯通） */}
          {Array.from({ length: 9 }).map((_, x) =>
            x === 0 || x === 8 ? (
              <line key={`v${x}`} x1={px(x)} y1={py(0)} x2={px(x)} y2={py(9)} stroke="#7c5a2e" strokeWidth={1.2} />
            ) : (
              <g key={`v${x}`}>
                <line x1={px(x)} y1={py(0)} x2={px(x)} y2={py(4)} stroke="#7c5a2e" strokeWidth={1.2} />
                <line x1={px(x)} y1={py(5)} x2={px(x)} y2={py(9)} stroke="#7c5a2e" strokeWidth={1.2} />
              </g>
            ),
          )}
          {/* 九宫斜线 */}
          <line x1={px(3)} y1={py(0)} x2={px(5)} y2={py(2)} stroke="#7c5a2e" strokeWidth={1.2} />
          <line x1={px(5)} y1={py(0)} x2={px(3)} y2={py(2)} stroke="#7c5a2e" strokeWidth={1.2} />
          <line x1={px(3)} y1={py(7)} x2={px(5)} y2={py(9)} stroke="#7c5a2e" strokeWidth={1.2} />
          <line x1={px(5)} y1={py(7)} x2={px(3)} y2={py(9)} stroke="#7c5a2e" strokeWidth={1.2} />
          {/* 兵 / 炮 初始位置标记（传统棋盘记号） */}
          {PIECE_MARKS.map(([mx, my]) => (
            <g key={`mk${mx}-${my}`} stroke="#7c5a2e" strokeWidth={1} opacity={0.4}>
              <line x1={px(mx) - 4} y1={py(my)} x2={px(mx) + 4} y2={py(my)} />
              <line x1={px(mx)} y1={py(my) - 4} x2={px(mx)} y2={py(my) + 4} />
            </g>
          ))}
          {/* 楚河汉界 */}
          <text
            x={BOARD_W / 2}
            y={(py(4) + py(5)) / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={CELL * 0.42}
            letterSpacing={6}
            fontWeight={600}
            fill="#8a6d3b"
          >
            楚 河　　漢 界
          </text>
          {/* 棋子（文字严格居中） */}
          {board.flatMap((row, y) =>
            row.map((p, x) => {
              if (!p) return null
              const isSel = selected && selected[0] === x && selected[1] === y
              const cx = px(x)
              const cy = py(y)
              return (
                <g key={`p${x}-${y}`}>
                  {isSel && <circle cx={cx} cy={cy} r={CELL * 0.5} fill="none" stroke="#6366f1" strokeWidth={3} />}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={CELL * 0.42}
                    fill="#fbf3df"
                    stroke={p.side === 'r' ? '#dc2626' : '#334155'}
                    strokeWidth={2.4}
                  />
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={CELL * 0.62}
                    fontWeight={700}
                    fill={p.side === 'r' ? '#dc2626' : '#334155'}
                  >
                    {CHAR[p.side][p.type]}
                  </text>
                </g>
              )
            }),
          )}
          {/* 落子目标高亮 */}
          {Array.from({ length: 10 }).flatMap((_, y) =>
            Array.from({ length: 9 }).map((_, x) => {
              if (!targets.has(`${x},${y}`)) return null
              const p = board[y][x]
              return p ? (
                <circle key={`t${x}-${y}`} cx={px(x)} cy={py(y)} r={CELL * 0.5} fill="none" stroke="#6366f1" strokeWidth={3} />
              ) : (
                <circle key={`t${x}-${y}`} cx={px(x)} cy={py(y)} r={CELL * 0.18} fill="#6366f1" opacity={0.85} />
              )
            }),
          )}
          {/* 透明点击热区（置于最上层） */}
          {Array.from({ length: 10 }).flatMap((_, y) =>
            Array.from({ length: 9 }).map((_, x) => (
              <circle
                key={`hit${x}-${y}`}
                cx={px(x)}
                cy={py(y)}
                r={CELL * 0.5}
                fill="transparent"
                style={{ cursor: playing ? 'default' : 'pointer' }}
                onClick={() => click(x, y)}
              />
            )),
          )}
        </svg>

        <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
          点选红子查看可走位置（高亮圆点），再点目标格落子。
        </p>

        {/* 解法面板 */}
        {solutionOpen && solution && solutionBase && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white/70 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/60">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="font-semibold text-slate-700 dark:text-slate-200">{solutionSummary}</div>
              <button
                onClick={() => setSolutionOpen(false)}
                className="rounded-md px-2 py-0.5 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700"
              >
                收起
              </button>
            </div>
            <ol className="max-h-44 space-y-1 overflow-y-auto pr-1">
              {solution.line.map((m, i) => {
                const red = i % 2 === 0
                return (
                  <li key={i} className="flex items-center gap-2">
                    <span
                      className={
                        'inline-block h-2 w-2 rounded-full ' + (red ? 'bg-red-500' : 'bg-slate-400')
                      }
                    />
                    <span className="text-slate-500 dark:text-slate-400">{i + 1}.</span>
                    <span className={red ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}>
                      {moveText(solutionBase, m)}
                    </span>
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
