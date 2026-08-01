import { useEffect, useState } from 'react'
import { GameShell } from '../../components/GameShell'
import { markPlayedToday } from '../../lib/streak'
import { getJSON, setJSON } from '../../lib/storage'
import { cn } from '../../lib/cn'

interface Level {
  pairs: number
  label: string
}

const LEVELS: Level[] = [
  { pairs: 6, label: '轻松' },
  { pairs: 8, label: '休闲' },
  { pairs: 10, label: '入门' },
  { pairs: 12, label: '进阶' },
  { pairs: 15, label: '挑战' },
  { pairs: 18, label: '困难' },
  { pairs: 20, label: '高手' },
  { pairs: 24, label: '大师' },
]

const EMOJIS = [
  '🐶', '🐱', '🦊', '🐼', '🐸', '🦁', '🐯', '🐨', '🐷', '🐵',
  '🐧', '🦉', '🦄', '🐝', '🐢', '🐙', '🦋', '🐳', '🌵', '🌻',
  '🍎', '🍓', '🍔', '🍕', '⚽', '🎸', '💎', '🔔', '🌟', '🍩',
]

interface Card {
  id: number
  sym: string
  face: boolean
  matched: boolean
}

function shuffle<T>(a: T[]): T[] {
  const r = a.slice()
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

function colsFor(total: number): number {
  if (total <= 12) return 4
  if (total <= 20) return 5
  if (total <= 30) return 6
  return 8
}

function buildCards(pairs: number): Card[] {
  const syms = shuffle(EMOJIS).slice(0, pairs)
  const deck = shuffle([...syms, ...syms]).map((sym, id) => ({ id, sym, face: false, matched: false }))
  return deck
}

function fmt(t: number) {
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export function Memory() {
  const [lvlIdx, setLvlIdx] = useState(0)
  const level = LEVELS[lvlIdx]
  const total = level.pairs * 2

  const [cards, setCards] = useState<Card[]>(() => buildCards(level.pairs))
  const [flipped, setFlipped] = useState<number[]>([])
  const [lock, setLock] = useState(false)
  const [moves, setMoves] = useState(0)
  const [started, setStarted] = useState(false)
  const [solved, setSolved] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const movesKey = `memory:bestMoves:${level.pairs}`
  const timeKey = `memory:bestTime:${level.pairs}`
  const [bestMoves, setBestMoves] = useState<number | null>(() => getJSON<number | null>(movesKey, null))
  const [bestTime, setBestTime] = useState<number | null>(() => getJSON<number | null>(timeKey, null))

  useEffect(() => {
    setCards(buildCards(level.pairs))
    setFlipped([])
    setLock(false)
    setMoves(0)
    setStarted(false)
    setSolved(false)
    setElapsed(0)
    setBestMoves(getJSON<number | null>(movesKey, null))
    setBestTime(getJSON<number | null>(timeKey, null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lvlIdx])

  useEffect(() => {
    if (!started || solved) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [started, solved])

  useEffect(() => {
    if (solved) return
    if (cards.length && cards.every((c) => c.matched)) {
      setSolved(true)
      markPlayedToday()
      if (bestMoves == null || moves < bestMoves) {
        setJSON(movesKey, moves)
        setBestMoves(moves)
      }
      if (bestTime == null || elapsed < bestTime) {
        setJSON(timeKey, elapsed)
        setBestTime(elapsed)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards])

  function flip(i: number) {
    if (solved || lock) return
    if (cards[i].face || cards[i].matched) return
    setStarted(true)
    const newly = [...flipped, i]
    setCards((prev) => prev.map((c, idx) => (idx === i ? { ...c, face: true } : c)))
    setFlipped(newly)
    if (newly.length === 2) {
      setMoves((m) => m + 1)
      setLock(true)
      const [a, b] = newly
      const match = cards[a].sym === cards[b].sym
      setTimeout(() => {
        if (match) {
          setCards((prev) => prev.map((c, idx) => (idx === a || idx === b ? { ...c, matched: true } : c)))
        } else {
          setCards((prev) => prev.map((c, idx) => (idx === a || idx === b ? { ...c, face: false } : c)))
        }
        setFlipped([])
        setLock(false)
      }, match ? 320 : 720)
    }
  }

  function reset() {
    setCards(buildCards(level.pairs))
    setFlipped([])
    setLock(false)
    setMoves(0)
    setStarted(false)
    setSolved(false)
    setElapsed(0)
  }

  function shareText() {
    return `脑力小站 记忆翻牌 [${level.label}] ${level.pairs}对 · 步数 ${moves} · 用时 ${fmt(elapsed)} · ${solved ? '通关' : '挑战中'}`
  }

  const cols = colsFor(total)

  return (
    <GameShell
      help={
        <div>
          <h3>🎯 目标</h3>
          <p>翻开并配对<strong>所有相同的牌</strong>，用最少步数、最短时间通关。</p>
          <h3>🕹️ 操作</h3>
          <ul>
            <li>点一张牌<strong>翻开</strong>，再点另一张。</li>
            <li>两张<strong>相同</strong> → 保留；<strong>不同</strong> → 自动翻回，记住它们的位置！</li>
          </ul>
          <h3>🎚️ 难度</h3>
          <p>共 <strong>8 档</strong>（6–24 对），牌越多越考验记忆力。</p>
          <h3>🏆 计分</h3>
          <ul>
            <li>记录<strong>用时</strong>与<strong>翻牌步数</strong>。</li>
            <li>自动保存<strong>最佳成绩</strong>，挑战更快更少步！</li>
            <li>全部配对完成会有<strong>庆祝动画</strong>。</li>
          </ul>
        </div>
      }
      title="记忆翻牌"
      subtitle="翻开两张相同的牌，用最少步数通关"
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
              <option key={l.pairs} value={i}>
                {l.label}（{l.pairs} 对）
              </option>
            ))}
          </select>
          <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">
            步数 {moves} · ⏱ {fmt(elapsed)} · 最佳 {bestMoves != null ? `${bestMoves}步/${fmt(bestTime!)}` : '—'}
          </span>
        </div>
      }
    >
      <div
        className="mx-auto grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, maxWidth: cols >= 6 ? 520 : 420 }}
      >
        {cards.map((c, i) => {
          const open = c.face || c.matched
          return (
            <button
              key={c.id}
              onClick={() => flip(i)}
              className={cn(
                'relative aspect-square overflow-hidden rounded-xl text-2xl sm:text-3xl transition active:scale-95',
                open
                  ? 'bg-white shadow-inner ring-1 ring-slate-200 dark:bg-slate-700 dark:ring-slate-600'
                  : 'bg-gradient-to-br from-accent to-fuchsia-500 text-white shadow-md',
                c.matched && 'opacity-60',
              )}
            >
              {open ? (
                <span className={cn('grid place-items-center', c.matched && 'animate-pop')}>{c.sym}</span>
              ) : (
                <span className="grid h-full place-items-center text-lg opacity-80">★</span>
              )}
            </button>
          )
        })}
      </div>

      {solved && (
        <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          🎉 全部配对成功！{moves} 步 · {fmt(elapsed)}
          {bestMoves === moves && ' · 步数新纪录！'}
        </div>
      )}
    </GameShell>
  )
}
