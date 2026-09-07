import { useCallback, useEffect, useRef, useState } from 'react'
import { GameShell } from '../../components/GameShell'
import { ShareButton } from '../../components/ShareButton'
import { markPlayedToday } from '../../lib/streak'
import { getJSON, setJSON } from '../../lib/storage'
import { cn } from '../../lib/cn'
import {
  frac,
  fracToString,
  fAdd,
  fSub,
  fMul,
  fDiv,
  fEquals24,
  fValue,
  type Frac,
  solve,
  generateRandomPuzzle,
} from './solver'

/* ═══════════════════════════════════════════
   类型与常量
   ═══════════════════════════════════════════ */

interface Card {
  id: number
  value: Frac
  expr: string // 展示用表达式
  computed: boolean // true=运算得到的中间牌；false=初始数字牌
}

const OPS: { sym: string; label: string; calc: (a: Frac, b: Frac) => Frac | null }[] = [
  { sym: '+', label: '加', calc: fAdd },
  { sym: '-', label: '减', calc: fSub },
  { sym: '×', label: '乘', calc: fMul },
  { sym: '÷', label: '除', calc: fDiv },
]

let nextId = 1
function makeCard(value: Frac, expr: string, computed: boolean): Card {
  return { id: nextId++, value, expr, computed }
}

function numsToCards(nums: number[]): Card[] {
  return nums.map((v) => makeCard(frac(v, 1), `${v}`, false))
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/* ═══════════════════════════════════════════
   主组件 —— 链式交互：选牌 → 点运算符 → 点下一张牌
   ═══════════════════════════════════════════ */

interface Snapshot {
  cards: Card[]
  current: number | null
  pendingOp: string | null
  steps: number
}

export function TwentyFour() {
  const [original, setOriginal] = useState<number[]>(() => generateRandomPuzzle())
  const [cards, setCards] = useState<Card[]>(() => numsToCards(generateRandomPuzzle()))
  const [current, setCurrent] = useState<number | null>(null) // 当前「持有」的牌
  const [pendingOp, setPendingOp] = useState<string | null>(null) // 待应用的运算符
  const [history, setHistory] = useState<Snapshot[]>([])
  const [steps, setSteps] = useState(0)
  const [solved, setSolved] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [solution, setSolution] = useState<string | null>(null)
  const [bestSteps, setBestSteps] = useState<number | null>(() =>
    getJSON<number | null>('24:best', null),
  )
  const [toast, setToast] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(true)
  const [bestTime, setBestTime] = useState<number | null>(() =>
    getJSON<number | null>('24:bestTime', null),
  )
  const startRef = useRef<number>(Date.now())

  const flash = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 1600)
  }, [])

  function loadPuzzle(nums: number[]) {
    setOriginal(nums)
    setCards(numsToCards(nums))
    setCurrent(null)
    setPendingOp(null)
    setHistory([])
    setSteps(0)
    setSolved(false)
    setRevealed(false)
    setSolution(null)
    setElapsed(0)
    setRunning(true)
    startRef.current = Date.now()
  }

  // 还原：回到同一道题的初始 4 张牌，但计时继续（不停止、不归零）
  const restoreBoard = () => {
    setCards(numsToCards(original))
    setCurrent(null)
    setPendingOp(null)
    setHistory([])
    setSteps(0)
    setSolved(false)
    setRevealed(false)
    setSolution(null)
    setRunning(true)
  }

  // 下一题：持续随机出新题（重新计时）
  const onNext = () => loadPuzzle(generateRandomPuzzle())

  function onCardClick(id: number) {
    if (solved) return
    if (current == null) {
      setCurrent(id)
      return
    }
    if (pendingOp == null) {
      flash('先点运算符，再选下一张牌')
      setCurrent(id) // 改选这张牌作为新的起点
      return
    }
    // 应用：current (pendingOp) 这张牌
    const op = OPS.find((o) => o.sym === pendingOp)!
    const a = cards.find((c) => c.id === current)!
    const b = cards.find((c) => c.id === id)!
    const r = op.calc(a.value, b.value)
    if (!r) {
      flash('不能除以 0')
      return
    }
    const newCard = makeCard(r, `${a.expr} ${pendingOp} ${b.expr}`, true)
    const nextCards = cards
      .filter((c) => c.id !== a.id && c.id !== b.id)
      .concat(newCard)
    setHistory((h) => [...h, { cards, current, pendingOp, steps }])
    setCards(nextCards)
    setCurrent(newCard.id) // 结果自动保持选中，可继续链式合并
    setPendingOp(null)
    setSteps((s) => s + 1)
    if (nextCards.length === 1) {
      const t = Math.floor((Date.now() - startRef.current) / 1000)
      if (fEquals24(r)) {
        setElapsed(t)
        setRunning(false)
        setSolved(true)
        markPlayedToday()
        if (bestSteps == null || steps + 1 < bestSteps) {
          setBestSteps(steps + 1)
          setJSON('24:best', steps + 1)
        }
        if (bestTime == null || t < bestTime) {
          setBestTime(t)
          setJSON('24:bestTime', t)
        }
        flash('🎉 成功算出 24！')
      } else {
        flash('只剩一张牌但不是 24，可撤销或换一题')
      }
    }
  }

  function onOp(sym: string) {
    if (solved) return
    if (current == null) {
      flash('先点一张牌')
      return
    }
    setPendingOp(sym)
  }

  function undo() {
    const last = history[history.length - 1]
    if (!last) return
    setHistory((h) => h.slice(0, -1))
    setCards(last.cards)
    setCurrent(last.current)
    setPendingOp(last.pendingOp)
    setSteps(last.steps)
    setSolved(false)
  }

  function showSolution() {
    const sol = solve(original)
    setSolution(sol)
    setRevealed(true)
    flash(sol ? '已显示一种解法' : '本题无解（理论上不会出现）')
  }

  // 键盘快捷键：运算符 + - * /（* 视作 ×，/ 视作 ÷）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (solved) return
      const map: Record<string, string> = { '+': '+', '-': '-', '*': '×', 'x': '×', 'X': '×', '/': '÷' }
      const op = map[e.key]
      if (op) {
        e.preventDefault()
        onOp(op)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [solved, current, pendingOp, cards])

  // 计时：题目进行中每秒刷新，通关后停止
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)),
      250,
    )
    return () => window.clearInterval(id)
  }, [running])

  function shareText(): string {
    const nums = original.join(' ')
    const timeStr = fmtTime(elapsed)
    if (solved) {
      const hint = revealed ? '看过解法' : '独立解出'
      const best = bestSteps != null ? ` · 最佳${bestSteps}步` : ''
      const bestT = bestTime != null ? ` · 最快${fmtTime(bestTime)}` : ''
      return `算24点 [${nums}] ${hint} 用${steps}步 用时${timeStr}${best}${bestT}`
    }
    return `算24点 [${nums}] 挑战中 用时${timeStr}`
  }

  const canUndo = history.length > 0
  const currentCard = current != null ? cards.find((c) => c.id === current) : null
  const loneValue = cards.length === 1 && !solved ? fValue(cards[0].value) : null

  return (
    <GameShell
      title="算24点"
      subtitle="四张牌凑出 24，烧脑运算"
      help={
        <div>
          <h3>🎯 目标</h3>
          <p>用 <strong>+ - × ÷</strong>，把 4 张数字牌运算成 <strong>24</strong>。</p>
          <h3>🕹️ 玩法（链式操作）</h3>
          <ul>
            <li>先<strong>点一张牌</strong>选中它（蓝紫色高亮）。</li>
            <li>再<strong>点一个运算符</strong>（也可直接按键盘 + - * /）。</li>
            <li>然后<strong>点下一张牌</strong>，两张牌合并成一张新牌（如先点 7 → 点「−」→ 点 3，得到 4）。</li>
            <li>运算结果会自动保持选中，可<strong>继续点运算符 + 下一张牌</strong>一路合并，直到剩一张且等于 24。</li>
          </ul>
          <h3>🎨 卡片颜色</h3>
          <ul>
            <li><strong>白色牌</strong>＝初始数字；<strong>蓝紫渐变牌</strong>＝运算得到的中间结果。</li>
          </ul>
          <h3>🛠️ 其他</h3>
          <p>点错可<strong>撤销</strong>；想重做本题点<strong>还原</strong>（计时不停）；卡住用「看解法」；通关会点亮连续打卡。点「下一题」换一道新题。</p>
        </div>
      }
      onShare={shareText}
      extra={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="chip !px-2 !py-0.5">⏱ {fmtTime(elapsed)}</span>
          {bestTime != null && <span className="chip !px-2 !py-0.5">最快 {fmtTime(bestTime)}</span>}
          <span className="chip !px-2 !py-0.5">步数 {steps}</span>
          {bestSteps != null && <span className="chip !px-2 !py-0.5">最佳 {bestSteps}</span>}
        </div>
      }
    >
      <div className="animate-appear">
        {/* 牌组区 */}
        <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {cards.map((c) => {
            const isCurrent = current === c.id
            return (
              <button
                key={c.id}
                onClick={() => onCardClick(c.id)}
                disabled={solved}
                className={cn(
                  'group relative flex aspect-[3/4] flex-col items-center justify-center rounded-2xl border-2 p-2 shadow-sm transition active:scale-95',
                  c.computed
                    ? 'border-transparent bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
                    : 'border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
                  isCurrent && 'ring-2 ring-accent ring-offset-2 dark:ring-offset-slate-900 scale-[1.03]',
                  !isCurrent && !c.computed && 'hover:border-accent/50',
                  solved && 'cursor-default',
                )}
              >
                {c.computed && (
                  <span className="absolute left-1.5 top-1.5 rounded bg-white/20 px-1 text-[9px] font-medium">
                    运算
                  </span>
                )}
                <span className="text-3xl font-extrabold tabular-nums">
                  {fracToString(c.value)}
                </span>
                {c.expr.includes(' ') && (
                  <span className={cn(
                    'mt-1 line-clamp-2 text-center text-[10px] leading-tight',
                    c.computed ? 'text-white/80' : 'text-slate-400 dark:text-slate-500',
                  )}>
                    {c.expr}
                  </span>
                )}
                {isCurrent && pendingOp && (
                  <span className="absolute -bottom-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white shadow">
                    {pendingOp}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 运算符区 */}
        <div className="mb-2 flex items-center justify-center gap-2">
          {OPS.map((o) => {
            const active = pendingOp === o.sym
            return (
              <button
                key={o.sym}
                onClick={() => onOp(o.sym)}
                disabled={solved || current == null}
                className={cn(
                  'grid h-12 w-12 place-items-center rounded-xl text-xl font-bold transition active:scale-90',
                  active
                    ? 'bg-accent text-white shadow-md shadow-accent/30'
                    : current != null && !solved
                      ? 'bg-indigo-100 text-accent hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200'
                      : 'cursor-not-allowed bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600',
                )}
                aria-label={o.label}
              >
                {o.sym}
              </button>
            )
          })}
        </div>
        <p className="mb-3 text-center text-xs text-slate-400 dark:text-slate-500">
          {solved
            ? '已通关'
            : pendingOp && currentCard
              ? `${currentCard.expr} ${pendingOp} ? → 再点一张牌`
              : currentCard
                ? `已选 ${currentCard.expr}，点运算符`
                : '先点一张数字牌开始'}
        </p>

        {/* 工具栏 */}
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn" onClick={undo} disabled={!canUndo}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
            撤销
          </button>
          <button className="btn" onClick={restoreBoard}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            还原
          </button>
          <button className="btn btn-accent" onClick={onNext}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
            下一题
          </button>
          <button className="btn" onClick={showSolution}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6M10 22h4" />
              <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z" />
            </svg>
            看解法
          </button>
          <ShareButton title="算24点" getShareText={shareText} />
        </div>

        {/* 解法展示 */}
        {solution && (
          <div className="card mt-3 bg-emerald-50 p-3 text-sm dark:bg-emerald-500/10">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">一种解法：</span>
            <span className="text-slate-700 dark:text-slate-200">{solution} = 24</span>
          </div>
        )}

        {/* 过关成功态 */}
        {solved && (
          <div className="card mt-3 animate-pop bg-gradient-to-br from-emerald-500/15 to-indigo-500/10 p-4 text-center">
            <div className="text-3xl">🎉</div>
            <p className="mt-1 text-base font-bold text-emerald-600 dark:text-emerald-400">成功算出 24！</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              用了 {steps} 步{revealed ? '（看过解法）' : '（独立解出，厉害！）'}
            </p>
            <button className="btn-accent mt-3 rounded-lg px-5 py-2 text-sm font-bold" onClick={onNext}>
              下一题
            </button>
          </div>
        )}

        {/* 卡死提示 */}
        {loneValue != null && (
          <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
            当前结果：{loneValue}（不是 24，可撤销或换一题）
          </p>
        )}

        {toast && (
          <div className="mt-3 rounded-lg bg-accent/10 py-1.5 text-center text-xs font-semibold text-accent">
            {toast}
          </div>
        )}
      </div>
    </GameShell>
  )
}
