import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'

interface GameMeta {
  path: string
  title: string
  desc: string
  icon: string
  tag: string
  badge: string
}

const GAMES: GameMeta[] = [
  { path: '/play/wordle', title: '猜词', desc: '6 次机会猜出 5 字母单词', icon: '🔤', tag: '文字', badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300' },
  { path: '/play/multiplication', title: '九九乘法表', desc: '5 种思维玩转乘法口诀', icon: '✖️', tag: '数学', badge: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300' },
  { path: '/play/2048', title: '2048', desc: '滑动合并，凑出 2048', icon: '🔢', tag: '数字', badge: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300' },
  { path: '/play/sudoku', title: '数独', desc: '9×9 逻辑填空，每日一题', icon: '🔢', tag: '逻辑', badge: 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300' },
  { path: '/play/minesweeper', title: '扫雷', desc: '标记地雷，经典怀旧', icon: '💣', tag: '逻辑', badge: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300' },
  { path: '/play/slidepuzzle', title: '滑块拼图', desc: '滑动归位，支持图片与自动求解', icon: '🧩', tag: '逻辑', badge: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300' },
]

const FEATURES = [
  { icon: '📅', label: '每日同题' },
  { icon: '🔥', label: '连续打卡' },
  { icon: '📤', label: '一键分享' },
]

export function Home() {
  return (
    <div className="mx-auto max-w-5xl px-3 py-5">
      <section className="mb-5">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span className="text-gradient">脑力小站</span>
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          点开即玩，无需登录。每天来一局，和朋友比谁先通关。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {FEATURES.map((f) => (
            <span key={f.label} className="chip">
              <span>{f.icon}</span>
              {f.label}
            </span>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {GAMES.map((g, i) => (
          <Link
            key={g.path}
            to={g.path}
            style={{ animationDelay: `${i * 45}ms` }}
            className={cn(
              'card group fade-up flex flex-col p-3.5 hover:-translate-y-1 hover:ring-2 hover:ring-accent/40',
            )}
          >
            <div className={cn('mb-2.5 grid h-12 w-12 place-items-center rounded-2xl text-2xl shadow-sm', g.badge)}>
              {g.icon}
            </div>
            <div className="mt-auto">
              <div className="flex items-center justify-between gap-1">
                <h2 className="text-base font-bold">{g.title}</h2>
                <span className="chip !px-2 !py-0.5">{g.tag}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{g.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <section className="card mt-6 p-4">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">怎么玩得更上头？</p>
        <ul className="mt-2 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          <li className="flex gap-2"><span className="text-accent">●</span>每款游戏都有「每日挑战」——全站同一道题，方便和朋友比成绩。</li>
          <li className="flex gap-2"><span className="text-accent">●</span>每天玩任意一款都会点亮 🔥 连续打卡，断一天就清零。</li>
          <li className="flex gap-2"><span className="text-accent">●</span>通关后点「分享」，复制无剧透成绩到聊天框炫耀。</li>
        </ul>
      </section>
    </div>
  )
}
