import { useEffect, useMemo, useState } from 'react'
import { GameShell } from '../../components/GameShell'
import { dateKey, pickBySeed } from '../../lib/dailySeed'
import { markPlayedToday } from '../../lib/streak'
import { cn } from '../../lib/cn'

const WORDS = [
  'apple','beach','brain','bread','brush','chair','chest','chord','click','clock','cloud','crane','dance','dream','drink','eagle','earth','field','flame','flash','flock','floor','flower','fruit','ghost','glass','globe','grain','grape','grass','green','horse','house','juice','lemon','light','lunch','magic','metal','money','month','mouse','music','night','ocean','onion','paint','panel','paper','pearl','phone','piano','piece','pilot','pizza','plant','plate','point','pound','power','pride','queen','quick','quiet','radio','river','robot','rough','round','royal','salad','scale','scarf','scene','score','sense','shadow','shape','sharp','sheep','shirt','shock','shore','short','sight','skill','sleep','slide','small','smile','smoke','snake','sound','space','spark','spice','spoon','sport','steam','steel','stone','store','storm','story','sugar','sweet','table','taste','teeth','theme','thing','tiger','toast','torch','tower','trace','train','treat','truck','trust','truth','uncle','value','vapor','vivid','voice','water','wheat','whale','wheel','world','worth','wound','youth','zebra',
]

const LEN = 5
const MAX = 6
type Cell = 'correct' | 'present' | 'absent'
const EMOJI: Record<Cell, string> = { correct: '🟩', present: '🟨', absent: '⬛' }

function evaluate(guess: string, answer: string): Cell[] {
  const res: Cell[] = new Array(LEN).fill('absent')
  const rest: Record<string, number> = {}
  for (const ch of answer) rest[ch] = (rest[ch] ?? 0) + 1
  for (let i = 0; i < LEN; i++) {
    if (guess[i] === answer[i]) {
      res[i] = 'correct'
      rest[guess[i]]--
    }
  }
  for (let i = 0; i < LEN; i++) {
    if (res[i] === 'correct') continue
    const ch = guess[i]
    if (rest[ch] > 0) {
      res[i] = 'present'
      rest[ch]--
    }
  }
  return res
}

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

export function Wordle() {
  const answer = useMemo(() => pickBySeed(dateKey(), WORDS), [])
  const [guesses, setGuesses] = useState<string[]>([])
  const [current, setCurrent] = useState('')
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing')
  const [invalid, setInvalid] = useState(false)
  const [toast, setToast] = useState('')

  const keyStates = useMemo(() => {
    const m: Record<string, Cell> = {}
    guesses.forEach((g) => {
      evaluate(g, answer).forEach((c, i) => {
        const ch = g[i]
        const rank = { absent: 0, present: 1, correct: 2 } as const
        if (!m[ch] || rank[c] > rank[m[ch]]) m[ch] = c
      })
    })
    return m
  }, [guesses, answer])

  useEffect(() => {
    if (status !== 'playing') markPlayedToday()
  }, [status])

  function submit() {
    if (current.length !== LEN) {
      flash('长度不足')
      return
    }
    if (!WORDS.includes(current)) {
      flash('不在词库')
      return
    }
    const next = [...guesses, current]
    setGuesses(next)
    setCurrent('')
    if (current === answer) setStatus('won')
    else if (next.length === MAX) setStatus('lost')
  }

  function flash(msg: string) {
    setInvalid(true)
    setToast(msg)
    setTimeout(() => setInvalid(false), 500)
    setTimeout(() => setToast(''), 1400)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (status !== 'playing') return
      const k = e.key.toLowerCase()
      if (k === 'enter') submit()
      else if (k === 'backspace') setCurrent((c) => c.slice(0, -1))
      else if (/^[a-z]$/.test(k) && current.length < LEN) setCurrent((c) => c + k)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, guesses, status, answer])

  function shareText(): string {
    const grid = guesses.map((g) => evaluate(g, answer).map((c) => EMOJI[c]).join('')).join('\n')
    const score = status === 'won' ? guesses.length : 'X'
    return `脑力小站 猜词 ${dateKey()} ${score}/${MAX}\n${grid}`
  }

  const cellColor: Record<Cell, string> = {
    correct: 'bg-accent text-white border-accent',
    present: 'bg-amber-400 text-white border-amber-400',
    absent: 'bg-slate-400 text-white border-slate-400 dark:bg-slate-600 dark:border-slate-600',
  }

  return (
    <GameShell
      title="猜词"
      subtitle="6 次机会猜出 5 字母单词"
      daily
      onShare={shareText}
      onReset={() => {
        setGuesses([])
        setCurrent('')
        setStatus('playing')
      }}
    >
      <div className={cn('relative', invalid && 'animate-shake')}>
        {toast && (
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-md bg-black/80 px-3 py-1 text-xs text-white">
            {toast}
          </div>
        )}
        <div className="mx-auto flex max-w-[280px] flex-col gap-1.5">
          {Array.from({ length: MAX }).map((_, r) => {
            const g = guesses[r] ?? (r === guesses.length ? current : '')
            return (
              <div key={r} className="flex gap-1.5">
                {Array.from({ length: LEN }).map((_, c) => {
                  const ch = g[c] ?? ''
                  const revealed = guesses[r]
                  const st = revealed ? evaluate(revealed, answer)[c] : undefined
                  return (
                    <div
                      key={c}
                      className={cn(
                        'grid h-12 flex-1 place-items-center rounded-md border-2 text-xl font-bold uppercase',
                        !revealed && ch && 'border-slate-400 dark:border-slate-500',
                        !revealed && !ch && 'border-slate-200 dark:border-slate-700',
                        st && cellColor[st],
                      )}
                    >
                      {ch}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mx-auto mt-4 max-w-[340px] select-none">
        {ROWS.map((row, ri) => (
          <div key={ri} className="mb-1.5 flex justify-center gap-1">
            {ri === 2 && (
              <KeyBtn label="Enter" onClick={submit} wide />
            )}
            {row.split('').map((ch) => (
              <KeyBtn
                key={ch}
                label={ch}
                state={keyStates[ch]}
                onClick={() => status === 'playing' && current.length < LEN && setCurrent((c) => c + ch)}
              />
            ))}
            {ri === 2 && (
              <KeyBtn label="⌫" onClick={() => setCurrent((c) => c.slice(0, -1))} wide />
            )}
          </div>
        ))}
      </div>

      {(status !== 'playing') && (
        <p className="mt-3 text-center text-sm font-medium">
          {status === 'won' ? `🎉 用了 ${guesses.length} 次猜中！` : `答案是 ${answer.toUpperCase()}`}
        </p>
      )}
    </GameShell>
  )
}

function KeyBtn({
  label,
  onClick,
  wide,
  state,
}: {
  label: string
  onClick: () => void
  wide?: boolean
  state?: Cell
}) {
  const color = state
    ? state === 'correct'
      ? 'bg-accent text-white'
      : state === 'present'
        ? 'bg-amber-400 text-white'
        : 'bg-slate-400 text-white dark:bg-slate-600'
    : 'bg-slate-200 dark:bg-slate-700'
  return (
    <button
      onClick={onClick}
      className={cn(
        'grid h-11 min-w-[28px] flex-1 place-items-center rounded-md text-sm font-semibold uppercase transition active:scale-95',
        wide && 'flex-[1.5]',
        color,
      )}
    >
      {label}
    </button>
  )
}
