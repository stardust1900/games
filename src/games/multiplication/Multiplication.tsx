import { useEffect, useMemo, useRef, useState } from 'react'
import { GameShell } from '../../components/GameShell'
import { dateKey, seededRng } from '../../lib/dailySeed'
import { markPlayedToday } from '../../lib/streak'
import { getJSON, setJSON } from '../../lib/storage'
import { cn } from '../../lib/cn'

/* ═══════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════ */

type Screen = 'lobby' | 'battle' | 'poster'
type Weapon = 'kar98k' | 'm416'
type Mode = 'group' | 'add' | 'line' | 'matrix' | 'swap'
type Device = 'pc' | 'mobile'

const MODES: { key: Mode; label: string }[] = [
  { key: 'group', label: '分组' },
  { key: 'add', label: '连加' },
  { key: 'line', label: '数轴' },
  { key: 'matrix', label: '阵列' },
  { key: 'swap', label: '交换' },
]

const TOTAL = 12

interface Pair { a: number; b: number }

interface PetState {
  happiness: number
  energy: number
  accessories: string[]
}

interface StageInfo { name: string; enemy: string; weapon: Weapon }

const STAGES: StageInfo[] = [
  { name: '新兵仓库', enemy: '短裤新兵·徒手', weapon: 'kar98k' },
  { name: '护腕靶场', enemy: '护腕·弹弓', weapon: 'kar98k' },
  { name: '木棒森林', enemy: '木棒民兵', weapon: 'm416' },
  { name: '弩箭峡谷', enemy: '弩箭手', weapon: 'm416' },
  { name: '火枪要塞', enemy: '火枪手', weapon: 'kar98k' },
  { name: '狙击巅峰', enemy: '狙击精英', weapon: 'm416' },
]

/* ═══════════════════════════════════════════
   PIXEL SPRITE ENGINE (SVG rect grid)
   ═══════════════════════════════════════════ */

function PixelSprite({ rows, palette, scale = 4, className }: {
  rows: string[]; palette: Record<string, string>; scale?: number; className?: string
}) {
  const h = rows.length, w = rows[0]?.length || 0
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w * scale} height={h * scale}
      shapeRendering="crispEdges" className={cn('pixelated', className)} aria-hidden>
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) => palette[ch]
          ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[ch]} />
          : null)
      )}
    </svg>
  )
}

/* ── pixel grid helpers (guarantee uniform width) ── */
const mkGrid = (W: number, H: number) => Array.from({ length: H }, () => Array<string>(W).fill('.'))
type Grid = string[][]
const setPx = (g: Grid, x: number, y: number, c: string, W: number, H: number) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c }
const fillPx = (g: Grid, x0: number, x1: number, y0: number, y1: number, c: string, W: number, H: number) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setPx(g, x, y, c, W, H)
}

/* ── Blue soldier: helmet + face + rifle ── */
const SOLDIER_W = 16, SOLDIER_H = 18
function soldierRows(weapon: Weapon): string[] {
  const W = SOLDIER_W, H = SOLDIER_H
  const g = mkGrid(W, H)
  // Helmet
  fillPx(g, 6, 9, 0, 0, 'B', W, H)
  fillPx(g, 5, 10, 1, 1, 'B', W, H)
  fillPx(g, 4, 11, 2, 3, 'B', W, H)
  // Face
  fillPx(g, 4, 11, 4, 8, 'F', W, H)
  // Eyes (white + pupil)
  fillPx(g, 5, 6, 5, 6, 'W', W, H); setPx(g, 6, 5, 'K', W, H)
  fillPx(g, 9, 10, 5, 6, 'W', W, H); setPx(g, 9, 5, 'K', W, H)
  // Mouth
  fillPx(g, 6, 9, 7, 7, 'M', W, H)
  // Neck
  fillPx(g, 6, 9, 9, 9, 'F', W, H)
  // Shoulders (dark uniform)
  fillPx(g, 3, 12, 10, 10, 'U', W, H)
  // Torso (blue) + arms (dark)
  fillPx(g, 4, 11, 11, 14, 'B', W, H)
  fillPx(g, 3, 3, 11, 14, 'U', W, H); fillPx(g, 12, 12, 11, 14, 'U', W, H)
  // Chest badge
  setPx(g, 7, 12, 'A', W, H); setPx(g, 8, 12, 'A', W, H)
  // Belt
  fillPx(g, 4, 11, 15, 15, 'K', W, H)
  // Legs
  fillPx(g, 5, 7, 16, 17, 'U', W, H); fillPx(g, 8, 10, 16, 17, 'U', W, H)
  // Rifle (held by right arm)
  fillPx(g, 13, 14, 6, 15, 'S', W, H)
  if (weapon === 'kar98k') { fillPx(g, 14, 14, 2, 5, 'S', W, H); setPx(g, 13, 4, 'K', W, H) }
  else { fillPx(g, 12, 12, 12, 14, 'S', W, H) }
  return g.map(r => r.join(''))
}
const SOLDIER_PALETTE = {
  B: '#3b82f6', F: '#f1c27d', W: '#ffffff', K: '#1e2937',
  M: '#b9763f', U: '#1e3a8a', S: '#94a3b8', A: '#22d3ee',
}

/* ── Yellow robot (YELLOW · AI / BOT) ── */
const ENEMY_W = 16, ENEMY_H = 18
function enemyRows(): string[] {
  const W = ENEMY_W, H = ENEMY_H
  const g = mkGrid(W, H)
  // Antenna + glow ball
  fillPx(g, 7, 8, 0, 1, 'S', W, H); setPx(g, 7, 0, 'E', W, H)
  // Head
  fillPx(g, 4, 11, 3, 7, 'T', W, H)
  // Glowing eyes
  fillPx(g, 5, 6, 4, 5, 'E', W, H); fillPx(g, 9, 10, 4, 5, 'E', W, H)
  // Grille mouth
  fillPx(g, 5, 10, 6, 6, 'G', W, H); setPx(g, 7, 6, 'T', W, H); setPx(g, 8, 6, 'T', W, H)
  // Neck
  fillPx(g, 7, 8, 8, 8, 'K', W, H)
  // Shoulders
  fillPx(g, 3, 12, 9, 9, 'K', W, H)
  // Torso
  fillPx(g, 4, 11, 10, 14, 'T', W, H)
  // Chest panel + glowing core
  fillPx(g, 6, 9, 11, 13, 'G', W, H); setPx(g, 7, 12, 'E', W, H); setPx(g, 8, 12, 'E', W, H)
  // Arms
  fillPx(g, 2, 3, 10, 14, 'K', W, H); fillPx(g, 12, 13, 10, 14, 'K', W, H)
  // Belt
  fillPx(g, 4, 11, 15, 15, 'K', W, H)
  // Legs
  fillPx(g, 5, 7, 16, 17, 'K', W, H); fillPx(g, 8, 10, 16, 17, 'K', W, H)
  return g.map(r => r.join(''))
}
const ENEMY_PALETTE = {
  T: '#eab308', G: '#a16207', K: '#1f2937', S: '#94a3b8', E: '#22d3ee',
}

/* ── Dog: built programmatically so every row is exactly 16 wide ── */
function dogRows(acc: string[]): string[] {
  const W = 16, H = 16
  const g = Array.from({ length: H }, () => Array<string>(W).fill('.'))
  const set = (x: number, y: number, c: string) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c }
  const fill = (x0: number, x1: number, y0: number, y1: number, c: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c)
  }

  // Floppy ears (the key "dog" tell)
  fill(1, 3, 1, 8, 'f'); fill(12, 14, 1, 8, 'f')
  // Head
  fill(3, 12, 2, 8, 'f')
  // Eyes
  fill(5, 5, 4, 5, 'k'); fill(10, 10, 4, 5, 'k')
  // Muzzle (light)
  fill(6, 9, 5, 8, 'm')
  // Nose
  set(7, 6, 'n'); set(8, 6, 'n')
  // Tongue
  set(7, 8, 't'); set(8, 8, 't')
  // Neck + body
  fill(3, 12, 9, 9, 'f')
  fill(2, 13, 10, 12, 'f')
  // Chest
  fill(6, 9, 10, 12, 'm')
  // Front paws
  fill(3, 5, 13, 14, 'f'); fill(10, 12, 13, 14, 'f')
  // Tail
  fill(14, 14, 9, 13, 'f'); set(15, 11, 'f')

  // Accessories
  if (acc.includes('crown')) { fill(5, 10, 0, 0, 'c'); fill(4, 11, 1, 1, 'c') }
  if (acc.includes('scarf')) { fill(3, 12, 9, 9, 's') }
  if (acc.includes('vest')) { fill(5, 10, 10, 12, 'v') }
  if (acc.includes('cape')) { fill(1, 2, 9, 13, 'p'); set(13, 9, 'p'); set(13, 12, 'p') }
  if (acc.includes('pocket')) { fill(7, 8, 11, 11, 'p') }
  if (acc.includes('eye')) { fill(9, 11, 4, 7, 'e') } // eye patch

  return g.map(r => r.join(''))
}
const DOG_PALETTE: Record<string, string> = {
  f: '#dcc6a8', // tan fur
  m: '#fdf6ec', // cream muzzle
  k: '#2b2118', // eye
  n: '#2b2118', // nose
  t: '#f472b6', // tongue
  c: '#fbbf24', // crown
  s: '#ef4444', // scarf
  v: '#22d3ee', // vest
  p: '#a855f7', // cape / pocket
  e: '#1f2937', // eye patch
}

function PixelSoldier({ weapon, className }: { weapon: Weapon; className?: string }) {
  return <PixelSprite rows={soldierRows(weapon)} palette={SOLDIER_PALETTE} scale={5} className={className} />
}
function PixelEnemy({ className }: { className?: string }) {
  return <PixelSprite rows={enemyRows()} palette={ENEMY_PALETTE} scale={5} className={className} />
}
function PixelDog({ accessories, scale = 5, className }: { accessories: string[]; scale?: number; className?: string }) {
  return <PixelSprite rows={dogRows(accessories)} palette={DOG_PALETTE} scale={scale} className={className} />
}

/* ═══════════════════════════════════════════
   SOUND (WebAudio beeps, gated by setting)
   ═══════════════════════════════════════════ */
let audioCtx: AudioContext | null = null
function beep(kind: 'right' | 'wrong' | 'kill', on: boolean) {
  if (!on) return
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    audioCtx = audioCtx || new Ctx()
    const o = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    o.connect(g); g.connect(audioCtx.destination)
    const freq = kind === 'right' ? 680 : kind === 'kill' ? 920 : 200
    o.frequency.value = freq
    o.type = kind === 'wrong' ? 'square' : 'sine'
    g.gain.setValueAtTime(0.08, audioCtx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18)
    o.start(); o.stop(audioCtx.currentTime + 0.18)
  } catch { /* ignore */ }
}

/* ═══════════════════════════════════════════
   GAME LOGIC
   ═══════════════════════════════════════════ */

function buildPairs(seed: string): Pair[] {
  const rng = seededRng(seed + ':mult')
  const all: Pair[] = []
  for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) all.push({ a, b })
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  return all.slice(0, TOTAL)
}

function answerAndPool(p: Pair): { answer: number; pool: number[] } {
  // 所有模式答案都是乘积 a×b；交换模式只是换了个视角展示（a×b 与 b×a 总数相同）
  const product = p.a * p.b
  const pool: number[] = []
  for (let d = 1; d <= 12; d++) {
    if (product - d >= 1) pool.push(product - d)
    if (product + d <= 81) pool.push(product + d)
  }
  return { answer: product, pool: Array.from(new Set(pool)) }
}

function buildChoices(seed: string, answer: number, pool: number[]): number[] {
  const rng = seededRng(seed)
  const candidates = pool.slice()
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }
  const opts = new Set<number>([answer])
  for (const c of candidates) {
    if (opts.size >= 4) break
    opts.add(c)
  }
  return Array.from(opts).sort((x, y) => x - y)
}

/* Pet persistence */
function loadPet(): PetState {
  return getJSON<PetState>('mult:pet', { happiness: 80, energy: 80, accessories: ['crown'] })
}
function savePet(p: PetState) { setJSON('mult:pet', p) }
function defaultPet(): PetState { return { happiness: 80, energy: 80, accessories: ['crown'] } }

function getLevel(): number { return getJSON<number>('mult:level', 1) }

/* Tip text per mode */
const TIPS: Record<Mode, string> = {
  group: '分组弹仓正适合这道题，命中会触发战术暴击！',
  add: '切换为连加弹匣：把相同的数连续加起来',
  line: '切换为数轴跳点：从 0 开始等距离跳',
  matrix: '切换为阵列瞄准：看清几排、每排几个',
  swap: '切换为交换视角：转个方向，用熟悉的口诀',
}

function modeQuestion(mode: Mode, a: number, b: number): string {
  switch (mode) {
    case 'group': return `${a} 组，每组 ${b} 个；看圈数一数`
    case 'add': return `把 ${a} 个 ${b} 连续加起来`
    case 'line': return `每次跳 ${b}，跳 ${a} 次会到哪里？`
    case 'matrix': return `${a} 排，每排 ${b} 个；一共有多少？`
    case 'swap': return `方向改变，点的总数一样多`
  }
}

function actionLabel(mode: Mode, a: number, b: number): string {
  return mode === 'group' || mode === 'matrix' ? `击中锁定 ${a} × ${b}` : `拦截 ${a} × ${b}`
}

/* ═══════════════════════════════════════════
   MODE VISUALIZATIONS
   ═══════════════════════════════════════════ */

function GroupViz({ a, b }: { a: number; b: number }) {
  const total = a * b
  const size = total > 60 ? 10 : total > 30 ? 14 : 20
  const innerGap = size > 12 ? 4 : 2
  return (
    <div className="flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-3">
      {Array.from({ length: a }).map((_, gi) => (
        <div key={gi} className="flex shrink-0" style={{ gap: innerGap }}>
          {Array.from({ length: b }).map((_, bi) => (
            <span key={bi} className="rounded-sm bg-[#3b82f6]" style={{ width: size, height: size }} />
          ))}
        </div>
      ))}
    </div>
  )
}

function AddViz({ a, b }: { a: number; b: number }) {
  const terms = Array(a).fill(b).join(' + ')
  return (
    <p className="text-2xl font-bold text-[#e2e8f0]">
      {terms} = <span className="text-[#fbbf24]">?</span>
    </p>
  )
}

function LineViz({ a, b }: { a: number; b: number }) {
  const steps = Array.from({ length: a + 1 }, (_, i) => i * b)
  return (
    <div className="w-full max-w-[280px]">
      <div className="relative h-8">
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-600" />
        {steps.map((s, i) => (
          <div key={i} className="absolute bottom-0" style={{ left: `${(s / (a * b)) * 100}%` }}>
            <div className="h-3 w-[2px] bg-[#22d3ee]" />
            <span className="mt-1 text-[10px] font-medium text-[#94a3b8]">{s}</span>
          </div>
        ))}
        {Array.from({ length: a }).map((_, i) => (
          <div key={`j${i}`} className="absolute bottom-2 text-[10px] font-bold text-[#fbbf24]"
            style={{ left: `${((i * b) / (a * b)) * 100}%`, right: `${(((a - 1 - i) * b) / (a * b)) * 100}%` }}>
            <span className="absolute -top-3 left-1/2 -translate-x-1/2">+{b}</span>
          </div>
        ))}
        <div className="absolute bottom-0 right-0 translate-x-1/4">
          <span className="text-lg font-bold text-[#fbbf24]">?</span>
        </div>
      </div>
    </div>
  )
}

function MatrixViz({ a, b }: { a: number; b: number }) {
  const cell = Math.max(10, Math.min(22, Math.floor(200 / Math.max(a, b))))
  const gap = 4
  return (
    <div
      className="mx-auto grid"
      style={{
        gridTemplateColumns: `repeat(${b}, ${cell}px)`,
        gridTemplateRows: `repeat(${a}, ${cell}px)`,
        gap: `${gap}px`,
      }}
    >
      {Array.from({ length: a * b }).map((_, i) => (
        <span key={i} className="rounded-sm bg-[#3b82f6]/80" />
      ))}
    </div>
  )
}

function SwapViz({ a, b }: { a: number; b: number }) {
  const cell = Math.max(8, Math.min(18, Math.floor(150 / Math.max(a, b))))
  const gap = 3
  const gridStyle = (rows: number, cols: number) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
    gridTemplateRows: `repeat(${rows}, ${cell}px)`,
    gap: `${gap}px`,
  })
  return (
    <div className="flex items-center justify-center gap-4">
      <div className="text-center">
        <div style={gridStyle(a, b)}>
          {Array.from({ length: a * b }).map((_, i) => (
            <span key={i} className="rounded-sm bg-[#3b82f6]/80" />
          ))}
        </div>
        <p className="mt-1 text-xs font-semibold text-[#e2e8f0]">{a} × {b}</p>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-bold text-[#fbbf24]">转90°</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5">
          <path d="M7 16V4M7 4l-4 4M7 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="text-center">
        <div style={gridStyle(b, a)}>
          {Array.from({ length: a * b }).map((_, i) => (
            <span key={i} className="rounded-sm bg-[#60a5fa]/80" />
          ))}
        </div>
        <p className="mt-1 text-xs font-semibold text-[#e2e8f0]">{b} × {a}</p>
      </div>
    </div>
  )
}

function ModeViz({ mode, a, b }: { mode: Mode; a: number; b: number }) {
  switch (mode) {
    case 'group': return <GroupViz a={a} b={b} />
    case 'add': return <AddViz a={a} b={b} />
    case 'line': return <LineViz a={a} b={b} />
    case 'matrix': return <MatrixViz a={a} b={b} />
    case 'swap': return <SwapViz a={a} b={b} />
  }
}

/* ═══════════════════════════════════════════
   SCREEN 1 — LOBBY (宠物屋大厅)
   ═══════════════════════════════════════════ */

const TALK_PHRASES = ['汪汪!', '主人最棒!', '一起做乘法~', '摸摸头!', '我饿了…', '毕业冲鸭!']

function Lobby({
  weapon, setWeapon, pet, setPet, device, setDevice,
  onStart, onOpenSettings, onViewPoster, hasPoster,
}: {
  weapon: Weapon; setWeapon: (w: Weapon) => void
  pet: PetState; setPet: (p: PetState) => void
  device: Device; setDevice: (d: Device) => void
  onStart: (stage: number) => void
  onOpenSettings: () => void
  onViewPoster: () => void
  hasPoster: boolean
}) {
  const [tab, setTab] = useState<'stages' | 'pets'>('pets')
  const [bubble, setBubble] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const level = getLevel()
  const currentStage = Math.min(level - 1, STAGES.length - 1)

  const bubbleTimer = useRef<number>()
  function say(text?: string) {
    setBubble(text ?? TALK_PHRASES[Math.floor(Math.random() * TALK_PHRASES.length)])
    window.clearTimeout(bubbleTimer.current)
    bubbleTimer.current = window.setTimeout(() => setBubble(null), 1500)
  }

  const toastTimer = useRef<number>()
  function flash(msg: string) {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 1600)
  }

  function useItem(action: string) {
    const next = { ...pet }
    switch (action) {
      case 'feed': next.happiness = Math.min(100, next.happiness + 10); break
      case 'milk': next.happiness = Math.min(100, next.happiness + 8); break
      case 'sleep': next.energy = Math.min(100, next.energy + 18); break
      case 'play':
        next.accessories = next.accessories.includes('eye')
          ? next.accessories.filter(a => a !== 'eye')
          : [...next.accessories, 'eye']
        break
      case 'wave':
        next.happiness = Math.min(100, next.happiness + 5)
        say('汪汪!')
        break
      default: break
    }
    setPet(next); savePet(next)
  }

  function toggleAccessory(acc: string) {
    const next = { ...pet }
    next.accessories = next.accessories.includes(acc)
      ? next.accessories.filter(a => a !== acc)
      : [...next.accessories, acc]
    setPet(next); savePet(next)
  }

  function copyShare(text: string) {
    navigator.clipboard?.writeText(text).then(() => flash('已复制分享文案')).catch(() => flash('复制失败'))
  }

  function onDogClick() { say() }
  function onDogDouble() {
    toggleAccessory('eye')
    say('戴好眼罩啦!')
  }

  const stageName = `${STAGES[currentStage].name}`

  return (
    <div className="rounded-2xl bg-[#0f172a] bg-grid p-3 text-[#e2e8f0] ring-1 ring-slate-700/60">
      {/* Top bar */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">乘法口决像素射击</h2>
          <p className="text-xs text-[#94a3b8]">用乘法 打出十连胜</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded bg-[#1e293b] p-0.5 text-[11px]">
            <button onClick={() => setDevice('pc')}
              className={cn('rounded px-2 py-0.5 transition', device === 'pc' ? 'bg-[#3b82f6] text-white' : 'text-[#94a3b8]')}>
              电脑模式
            </button>
            <button onClick={() => setDevice('mobile')}
              className={cn('rounded px-2 py-0.5 transition', device === 'mobile' ? 'bg-[#3b82f6] text-white' : 'text-[#94a3b8]')}>
              手机模式
            </button>
          </div>
          <button onClick={onOpenSettings}
            aria-label="设置"
            className="rounded-lg bg-[#1e293b] p-1.5 text-[#94a3b8] transition hover:text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[1fr_1.1fr]">
        {/* LEFT: Soldier + Enter */}
        <div className="flex flex-col items-center justify-between rounded-xl bg-[#16233c] p-3 ring-1 ring-slate-700/50">
          <div className="mb-3 flex w-full gap-2">
            <button onClick={() => setWeapon('kar98k')}
              className={cn('flex-1 rounded-lg py-2 text-xs font-bold transition',
                weapon === 'kar98k' ? 'bg-[#3b82f6] text-white ring-1 ring-[#22d3ee]' : 'bg-[#1e293b] text-[#94a3b8]')}>
              KAR98K
            </button>
            <button onClick={() => setWeapon('m416')}
              className={cn('flex-1 rounded-lg py-2 text-xs font-bold transition',
                weapon === 'm416' ? 'bg-[#3b82f6] text-white ring-1 ring-[#22d3ee]' : 'bg-[#1e293b] text-[#94a3b8]')}>
              M416
            </button>
          </div>

          <div className="my-2 flex flex-1 items-end justify-center">
            <PixelSoldier weapon={weapon} />
          </div>

          <button onClick={() => onStart(currentStage)}
            className="mt-3 w-full rounded-lg bg-[#3b82f6] py-3 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition active:scale-[0.98] hover:bg-blue-600">
            ▶ 进入对决
            <span className="ml-2 block text-[11px] font-normal opacity-75">STAGE {String(currentStage + 1).padStart(2, '0')} · {stageName}</span>
          </button>
        </div>

        {/* RIGHT: Tabs + panel */}
        <div className="flex flex-col rounded-xl bg-[#16233c] ring-1 ring-slate-700/50">
          <div className="flex border-b border-slate-700/50">
            <button onClick={() => setTab('stages')}
              className={cn('flex-1 py-2.5 text-xs font-semibold transition',
                tab === 'stages' ? 'border-b-2 border-[#3b82f6] text-[#e2e8f0]' : 'text-[#94a3b8]')}>
              关卡目录
            </button>
            <button onClick={() => setTab('pets')}
              className={cn('flex-1 py-2.5 text-xs font-semibold transition',
                tab === 'pets' ? 'border-b-2 border-[#3b82f6] text-[#e2e8f0]' : 'text-[#94a3b8]')}>
              萌宠乐园
            </button>
          </div>

          {tab === 'pets' ? (
            <div className="flex-1 p-3">
              <div className="mb-2 text-xs">
                <span className="font-semibold text-[#fbbf24]">电子宠物屋·小狗</span>
                <span className="ml-2 text-[#94a3b8]">满级萌宠·毕业披风</span>
              </div>
              <p className="mb-2 text-[10px] text-[#64748b]">点宠说说话 · 连点两下戴眼头</p>

              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="relative inline-block cursor-pointer select-none" onClick={onDogClick} onDoubleClick={onDogDouble}>
                    <PixelDog accessories={pet.accessories} scale={6} />
                    {bubble && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#0f172a] shadow">
                        {bubble}
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-3 w-40 space-y-1.5">
                  <div>
                    <div className="flex items-center gap-1 text-[11px]"><span>❤️ 开心</span></div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#0f172a]">
                      <div className="h-full bg-rose-400 transition-all" style={{ width: `${pet.happiness}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[11px]"><span>⚡ 活力</span></div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#0f172a]">
                      <div className="h-full bg-cyan-400 transition-all" style={{ width: `${pet.energy}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Items grid */}
              <div className="mt-3 grid grid-cols-5 gap-1.5">
                {[
                  { icon: '🍼', label: '喂奶', action: 'milk' },
                  { icon: '🍖', label: '喂食', action: 'feed' },
                  { icon: '💤', label: '睡觉', action: 'sleep' },
                  { icon: '🎮', label: '玩耍', action: 'play' },
                  { icon: '👋', label: '拇手', action: 'wave' },
                ].map(item => (
                  <button key={item.action} onClick={() => useItem(item.action)}
                    className="flex flex-col items-center gap-0.5 rounded-lg bg-[#0f172a] py-1.5 text-[10px] text-[#94a3b8] transition hover:bg-slate-800">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Accessories row */}
              <div className="mt-3 grid grid-cols-5 gap-1.5">
                {[
                  { key: 'pocket', label: '图兜', color: '#a855f7' },
                  { key: 'scarf', label: '围巾', color: '#ef4444' },
                  { key: 'vest', label: '背心', color: '#22d3ee' },
                  { key: 'crown', label: '皇冠', color: '#fbbf24' },
                  { key: 'cape', label: '披风', color: '#a855f7' },
                ].map(acc => (
                  <button key={acc.key} onClick={() => toggleAccessory(acc.key)}
                    className={cn('rounded-lg py-1.5 text-[10px] font-medium transition',
                      pet.accessories.includes(acc.key) ? 'ring-1 text-white' : 'bg-[#0f172a] text-[#64748b] hover:bg-slate-800')}
                    style={pet.accessories.includes(acc.key) ? { backgroundColor: acc.color + '30', borderColor: acc.color } : undefined}>
                    {acc.label}
                  </button>
                ))}
              </div>

              {/* Share buttons */}
              <div className="mt-3 flex gap-2">
                <button onClick={() => hasPoster ? onViewPoster() : copyShare(`乘法口决像素射击 · 我的像素小狗开心${pet.happiness}% 活力${pet.energy}%`)}
                  className="flex-1 rounded-lg bg-[#1e293b] py-1.5 text-[11px] text-[#94a3b8] transition hover:bg-slate-700">
                  📋 分享海报
                </button>
                <button onClick={() => copyShare('🎓 乘法口决像素射击 · 我已通关九九乘法全表！')}
                  className="flex-1 rounded-lg bg-[#1e293b] py-1.5 text-[11px] text-[#94a3b8] transition hover:bg-slate-700">
                  🎓 毕业纪念
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 p-3">
              <p className="mb-2 text-xs text-[#94a3b8]">选择战区开始训练 · 通关正确率 ≥ 60% 解锁下一关</p>
              <div className="grid grid-cols-2 gap-2">
                {STAGES.map((st, i) => {
                  const unlocked = i < level
                  const isCurrent = i === currentStage
                  return (
                    <button key={i} disabled={!unlocked} onClick={() => onStart(i)}
                      className={cn('rounded-lg p-3 text-left ring-1 transition',
                        !unlocked ? 'cursor-not-allowed bg-[#0f172a] text-[#475569] ring-slate-800'
                          : isCurrent ? 'bg-[#3b82f6]/15 ring-[#3b82f6] hover:bg-[#3b82f6]/25'
                            : 'bg-[#0f172a] text-[#e2e8f0] ring-slate-700/50 hover:bg-slate-800')}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">STAGE {String(i + 1).padStart(2, '0')}</span>
                        <span>{!unlocked ? '🔒' : isCurrent ? '▶' : '✓'}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] font-semibold">{st.name}</div>
                      <div className="mt-0.5 text-[10px] text-[#94a3b8]">对手：{st.enemy}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="mt-3 rounded-lg bg-emerald-500/90 py-1.5 text-center text-xs font-bold text-white">
          {toast}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   SCREEN 2 — BATTLE
   ═══════════════════════════════════════════ */

function Battle({
  weapon, stage, device, sound, setSound, onFinish,
}: {
  weapon: Weapon; stage: number; device: Device; sound: boolean; setSound: (s: boolean) => void
  onFinish: (stats: { correct: number; total: number; maxStreak: number }) => void
}) {
  const seed = useMemo(() => dateKey(), [])
  const pairs = useMemo(() => buildPairs(seed), [seed])

  const [mode, setMode] = useState<Mode>('group')
  const [idx, setIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [killReady, setKillReady] = useState(false)
  const [feedback, setFeedback] = useState<null | 'right' | 'wrong'>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [lock, setLock] = useState(false)
  const [done, setDone] = useState(false)
  const [popup, setPopup] = useState<string | null>(null)

  const levelRef = useRef(getJSON<number>('mult:level', 1)).current
  const bestRef = useRef(getJSON<number>('mult:best', 0)).current

  const correctRef = useRef(0)
  const wrongRef = useRef(0)

  const p = pairs[idx]
  const { answer, pool } = useMemo(() => answerAndPool(p), [p])
  const choices = useMemo(
    () => buildChoices(`${seed}:${idx}:${mode}`, answer, pool),
    [seed, idx, mode, answer, pool],
  )

  const targets = [pairs[idx], pairs[idx + 1], pairs[idx + 2]].filter(Boolean) as Pair[]
  const inRound = (idx % 3) + 1
  const combo = Math.min(streak, 10)
  const killCount = Math.min(Math.floor(streak / 2), 5)
  const enemyName = STAGES[Math.min(stage, STAGES.length - 1)].enemy
  const stageLabel = String(stage + 1).padStart(2, '0')

  useEffect(() => { if (done) markPlayedToday() }, [done])

  function advance() {
    setFeedback(null); setSelected(null); setLock(false); setPopup(null)
    if (idx + 1 >= TOTAL) finish()
    else setIdx(i => i + 1)
  }

  function finish() {
    setDone(true)
    const c = correctRef.current
    onFinish({ correct: c, total: TOTAL, maxStreak })
    if (c / TOTAL >= 0.6) setJSON('mult:level', levelRef + 1)
    if (c > bestRef) setJSON('mult:best', c)
  }

  function choose(n: number) {
    if (lock || done) return
    setLock(true); setSelected(n)
    if (n === answer) {
      setFeedback('right'); beep('right', sound)
      correctRef.current += 1; setCorrect(c => c + 1)
      const ns = streak + 1
      setStreak(ns); setMaxStreak(m => Math.max(m, ns))
      if (ns >= 5) setKillReady(true)
      setPopup(`黄方题弹 ${p.a}×${p.b}`)
    } else {
      setFeedback('wrong'); beep('wrong', sound)
      wrongRef.current += 1; setWrong(w => w + 1)
      setStreak(0); setKillReady(false)
    }
    setTimeout(advance, 750)
  }

  function useKill() {
    if (!killReady || lock || done) return
    setKillReady(false); setLock(true); setFeedback('right')
    beep('kill', sound)
    correctRef.current += 1; setCorrect(c => c + 1)
    setPopup(`⚡ 秒杀 ${p.a}×${p.b}`)
    setTimeout(advance, 750)
  }

  return (
    <div className="rounded-2xl bg-[#0f172a] bg-grid p-2.5 sm:p-3 text-[#e2e8f0] ring-1 ring-slate-700/60">
      <div className={cn('grid grid-cols-1 gap-2.5', device !== 'mobile' && 'lg:grid-cols-2')}>

        {/* LEFT: ARENA */}
        <div className="order-2 flex flex-col gap-1.5 rounded-xl bg-[#16233c] p-2.5 ring-1 ring-slate-700/50 lg:order-1">
          <div className="grid grid-cols-3 gap-1 text-[11px]">
            <div className="rounded-md bg-[#0f172a] p-1.5">
              <div className="font-bold text-[#60a5fa]">BLUE · 你</div>
              <div className="text-[#64748b]">无限护盾 · 永不倒地</div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#0b1220]">
                <div className="h-full w-full bg-[#3b82f6]" />
              </div>
            </div>
            <div className="rounded-md bg-[#0f172a] p-1.5 text-center">
              <div className="font-bold text-[#fbbf24]">STAGE {stageLabel} · {STAGES[Math.min(stage, STAGES.length - 1)].name}</div>
              <div className="text-[#64748b]">秒杀技 {killCount}/5</div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#0b1220]">
                <div className="h-full bg-[#fbbf24] transition-all duration-300" style={{ width: `${(idx / TOTAL) * 100}%` }} />
              </div>
            </div>
            <div className="rounded-md bg-[#0f172a] p-1.5 text-right">
              <div className="font-bold text-[#fbbf24]">YELLOW · AI</div>
              <div className="text-[#64748b]">{enemyName}</div>
              <button onClick={() => setSound(!sound)} aria-label="音效开关"
                className="mt-0.5 text-[#94a3b8] transition hover:text-white">
                {sound ? '🔊' : '🔇'}
              </button>
            </div>
          </div>

          {/* COMBO */}
          <div className="flex items-center gap-2 rounded-md bg-[#0f172a] px-2 py-1.5">
            <span className="text-[11px] font-bold text-[#94a3b8]">COMBO</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={cn('h-3 w-3 rounded-sm transition-colors', i < combo ? 'bg-[#22d3ee]' : 'bg-slate-700')} />
              ))}
            </div>
            <span className="ml-auto text-[11px] font-bold text-[#e2e8f0]">{combo} / 10</span>
          </div>

          {/* Score */}
          <div className="rounded-lg bg-[#fbbf24]/15 p-1.5 text-center ring-1 ring-[#fbbf24]/40">
            <div className="text-[10px] text-[#fbbf24]">本局累计积分</div>
            <div className="text-xl font-extrabold text-[#fbbf24]">{correct}<span className="text-xs font-normal"> 分</span></div>
            <div className="mt-0.5 text-[10px] text-[#94a3b8]">本轮 {inRound}/3 · 每题 1分</div>
          </div>

          {/* Tip */}
          <div className="rounded bg-[#fbbf24] px-2 py-1 text-center text-[11px] font-semibold text-[#1f1300]">
            {TIPS[mode]}
          </div>

          {/* Targets */}
          <div className="grid grid-cols-3 gap-1.5">
            {targets.map((t, i) => (
              <div key={i}
                className={cn('rounded-lg p-1.5 text-center transition ring-1',
                  i === 0 ? 'bg-[#fbbf24]/15 ring-[#22d3ee]' : 'bg-[#fbbf24]/10 ring-[#fbbf24]/30')}>
                <div className="text-[10px] text-[#94a3b8]">目标{i + 1} · {i === 0 ? '已锁定' : '点我锁定'}</div>
                <div className="text-sm font-bold text-[#e2e8f0]">{t.a} × {t.b}</div>
              </div>
            ))}
          </div>

          {/* Characters */}
          <div className="relative mt-1 flex flex-1 items-end justify-between">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-bold text-[#60a5fa]">YOU</span>
              <div className="relative">
                <PixelSoldier weapon={weapon} />
                <div className="animate-float absolute -top-2 -left-2 rounded bg-[#22d3ee] px-1 text-[9px] font-bold text-[#0f172a]">∞ 超吸收</div>
              </div>
            </div>

            {popup && (
              <div className="animate-damage absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#fbbf24] px-3 py-1.5 text-sm font-bold text-[#1f1300] shadow-lg">
                {popup}
              </div>
            )}

            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-bold text-[#fbbf24]">BOT: 装备 {wrong}</span>
              <PixelEnemy />
            </div>
          </div>

          {/* Weapon slots */}
          <div className="flex gap-2">
            <div className={cn('flex-1 rounded bg-[#0f172a] px-2 py-1 text-center text-[10px]', weapon === 'kar98k' ? 'ring-1 ring-[#3b82f6]' : '')}>
              <div className="font-bold">{weapon.toUpperCase()}</div>
              <div className="text-[#64748b]">{weapon === 'kar98k' ? '单发' : '三连精准'}</div>
            </div>
            <div className={cn('flex-1 rounded bg-[#0f172a] px-2 py-1 text-center text-[10px]', weapon === 'm416' ? 'ring-1 ring-[#3b82f6]' : '')}>
              <div className="font-bold">{weapon === 'kar98k' ? 'M416' : 'KAR98K'}</div>
              <div className="text-[#64748b]">{weapon === 'kar98k' ? '三连精准' : '单发'}</div>
            </div>
          </div>
        </div>

        {/* RIGHT: QUESTION */}
        <div className="order-1 flex flex-col gap-1.5 rounded-xl bg-[#16233c] p-2.5 ring-1 ring-slate-700/50 lg:order-2">
          <div className="grid grid-cols-5 gap-1">
            {MODES.map(m => (
              <button key={m.key} onClick={() => setMode(m.key)}
                className={cn('rounded py-1.5 text-xs font-semibold transition',
                  mode === m.key ? 'bg-[#3b82f6] text-white' : 'bg-[#0f172a] text-[#94a3b8] hover:bg-slate-700')}>
                {m.label}
              </button>
            ))}
          </div>

          <div className="min-h-[116px] flex flex-col items-center justify-center rounded-lg bg-[#0b1220] p-2.5 ring-1 ring-slate-700/50">
            <ModeViz mode={mode} a={p.a} b={p.b} />
            <p className="mt-2 text-center text-xs text-[#94a3b8]">{modeQuestion(mode, p.a, p.b)}</p>
          </div>

          <div className="text-center text-sm font-semibold text-[#60a5fa]">{actionLabel(mode, p.a, p.b)}</div>

          {!done && (
            <div className="grid grid-cols-2 gap-2">
              {choices.map(n => {
                const isAnswer = n === answer
                const isPicked = n === selected
                let bg = 'bg-[#0b1220] text-white hover:bg-slate-800'
                if (feedback) {
                  if (isAnswer) bg = 'bg-emerald-500 text-white'
                  else if (isPicked) bg = 'bg-rose-500 text-white'
                  else bg = 'bg-[#0b122a] text-slate-600'
                }
                return (
                  <button key={n} onClick={() => choose(n)} disabled={lock}
                    className={cn('flex items-center justify-center gap-2 rounded-lg py-3.5 text-xl font-bold ring-1 ring-slate-700 transition active:scale-[0.97]', bg, !feedback && 'border-l-4 border-l-[#22d3ee]')}>
                    <span className="text-[#22d3ee] text-sm opacity-50">|</span>
                    {n}
                  </button>
                )
              })}
            </div>
          )}

          {killReady && !done && (
            <button onClick={useKill}
              className="animate-pop rounded-lg bg-[#fbbf24] py-2.5 text-sm font-bold text-[#1f1300] shadow-lg shadow-amber-500/30 active:scale-95">
              ⚡ 秒杀技能就绪！点击直接击落
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   SCREEN 3 — POSTER
   ═══════════════════════════════════════════ */

function Poster({
  stats, pet, onBack, onShare,
}: {
  stats: { correct: number; total: number; maxStreak: number }
  pet: PetState
  onBack: () => void
  onShare: () => string
}) {
  const { correct, total, maxStreak } = stats
  const accPct = Math.round((correct / total) * 100)
  return (
    <div className="rounded-2xl bg-[#0f172a] bg-grid p-3 text-[#e2e8f0] ring-1 ring-slate-700/60">
      <div className="mx-auto max-w-md rounded-xl bg-[#16233c] p-5 text-center ring-2 ring-[#fbbf24]">
        <div className="mb-2 inline-block rounded-full bg-[#3b82f6]/20 px-3 py-0.5 text-[10px] font-bold tracking-wider text-[#60a5fa]">
          GRADUATION POSTER
        </div>
        <h2 className="text-lg font-bold">你的九九乘法通关海报</h2>
        <p className="mt-1 text-2xl font-extrabold text-[#fbbf24]">九九全表通关!</p>
        <p className="mt-1 text-xs text-[#94a3b8]">
          1×1 ~ 9×9 全表训练 · 毕业挑战 {correct}/{total} 题全对 · 正确率 {accPct}%
        </p>

        <div className="my-3 grid grid-cols-3 gap-2">
          {[
            { label: '平业数全对', value: `${correct}/${total}` },
            { label: '战区完胜', value: `${Math.ceil(correct / 2)}/${Math.ceil(total / 2)}` },
            { label: '最高连胜', value: `${maxStreak}` },
          ].map((s, i) => (
            <div key={i} className="rounded bg-[#0f172a] py-2 ring-1 ring-slate-700/50">
              <div className="text-lg font-bold text-[#fbbf24]">{s.value}</div>
              <div className="text-[10px] text-[#64748b]">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="my-3 flex justify-center">
          <PixelDog accessories={pet.accessories} scale={8} />
        </div>

        <p className="font-semibold">我的满级像素小狗</p>
        <p className="text-xs text-[#64748b]">会说话 · 会睡觉 · 会喂饭 · 会跟我做乘法</p>

        <blockquote className="mt-2 rounded-lg bg-[#0f172a] py-2 text-sm font-medium italic text-[#94a3b8]">
          「我用数学思维打败了九九乘法！」
        </blockquote>

        <div className="mt-2 flex flex-wrap justify-center gap-1">
          {['分组', '连加', '数轴', '阵列', '交换'].map(t => (
            <span key={t} className="rounded bg-[#0f172a] px-2 py-0.5 text-[10px] text-[#64748b] ring-1 ring-slate-700/50">{t}</span>
          ))}
        </div>
        <p className="mt-2 text-[9px] text-[#475569]">乘法口诀速查表 · 通关心得备忘</p>
      </div>

      <div className="mt-3 flex gap-2 justify-center">
        <button onClick={() => { navigator.clipboard?.writeText(onShare()) }}
          className="btn-accent rounded-lg px-6 py-2.5 text-sm font-bold">
          分享 / 保存海报
        </button>
        <button onClick={onBack} className="btn rounded-lg px-6 py-2.5 text-sm font-bold">
          返回宠物屋
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   SETTINGS MODAL
   ═══════════════════════════════════════════ */

function SettingsModal({
  sound, setSound, onClose, onResetPet, onResetProgress,
}: {
  sound: boolean; setSound: (s: boolean) => void
  onClose: () => void; onResetPet: () => void; onResetProgress: () => void
}) {
  const [confirm, setConfirm] = useState<null | 'pet' | 'progress'>(null)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-[#16233c] p-4 text-[#e2e8f0] ring-1 ring-slate-700" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold">设置</h3>
          <button onClick={onClose} className="rounded-lg bg-[#0f172a] px-2 py-1 text-sm text-[#94a3b8] hover:text-white">✕</button>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-[#0f172a] px-3 py-2.5">
          <span className="text-sm">🔊 音效</span>
          <button onClick={() => setSound(!sound)}
            className={cn('relative h-6 w-11 rounded-full transition', sound ? 'bg-[#3b82f6]' : 'bg-slate-600')}>
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition', sound ? 'left-[22px]' : 'left-0.5')} />
          </button>
        </div>

        <div className="mt-2 space-y-2">
          <button onClick={() => confirm === 'pet' ? (onResetPet(), setConfirm(null)) : setConfirm('pet')}
            className={cn('w-full rounded-lg px-3 py-2.5 text-sm font-medium transition',
              confirm === 'pet' ? 'bg-rose-500 text-white' : 'bg-[#0f172a] text-[#e2e8f0] hover:bg-slate-800')}>
            {confirm === 'pet' ? '再次点击确认：重置宠物' : '🐶 重置宠物数据'}
          </button>
          <button onClick={() => confirm === 'progress' ? (onResetProgress(), setConfirm(null)) : setConfirm('progress')}
            className={cn('w-full rounded-lg px-3 py-2.5 text-sm font-medium transition',
              confirm === 'progress' ? 'bg-rose-500 text-white' : 'bg-[#0f172a] text-[#e2e8f0] hover:bg-slate-800')}>
            {confirm === 'progress' ? '再次点击确认：清空进度' : '🔄 清空游戏进度'}
          </button>
        </div>

        <button onClick={onClose} className="btn-accent mt-3 w-full rounded-lg py-2.5 text-sm font-bold">完成</button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   MAIN ENTRY
   ═══════════════════════════════════════════ */

function getJsonSafe<T>(key: string, fallback: T): T {
  try { return getJSON<T>(key, fallback) } catch { return fallback }
}

export function Multiplication() {
  const [screen, setScreen] = useState<Screen>('lobby')
  const [weapon, setWeapon] = useState<Weapon>(() => getJsonSafe<Weapon>('mult:weapon', 'kar98k'))
  const [pet, setPet] = useState<PetState>(() => loadPet())
  const [battleStats, setBattleStats] = useState<{ correct: number; total: number; maxStreak: number } | null>(null)
  const [device, setDevice] = useState<Device>('pc')
  const [sound, setSound] = useState<boolean>(() => getJsonSafe<boolean>('mult:sound', true))
  const [showSettings, setShowSettings] = useState(false)
  const [selectedStage, setSelectedStage] = useState(0)
  const [battleKey, setBattleKey] = useState(0)

  useEffect(() => { setJSON('mult:weapon', weapon) }, [weapon])
  useEffect(() => { setJSON('mult:sound', sound) }, [sound])

  function handleFinish(stats: { correct: number; total: number; maxStreak: number }) {
    setBattleStats(stats); setScreen('poster')
  }
  function shareText(): string {
    const s = battleStats
    if (!s) return ''
    return `乘法口决像素射击 毕业 ${s.correct}/${s.total} 最高连胜 ${s.maxStreak}`
  }
  function startBattle(stage: number) {
    setSelectedStage(stage); setBattleKey(k => k + 1); setScreen('battle')
  }
  function resetPet() { const d = defaultPet(); setPet(d); savePet(d) }
  function resetProgress() { setJSON('mult:level', 1); setJSON('mult:best', 0) }

  return (
    <GameShell
      title="乘法口决像素射击"
      subtitle="用乘法打出十连胜"
      wide
      compact
      daily
      onShare={shareText}
      onReset={() => setScreen('lobby')}
    >
      <div className="animate-appear">
        {screen === 'lobby' && (
          <Lobby
            weapon={weapon} setWeapon={setWeapon} pet={pet} setPet={setPet}
            device={device} setDevice={setDevice}
            onStart={startBattle} onOpenSettings={() => setShowSettings(true)}
            onViewPoster={() => battleStats && setScreen('poster')}
            hasPoster={!!battleStats}
          />
        )}
        {screen === 'battle' && (
          <Battle key={battleKey} weapon={weapon} stage={selectedStage} device={device} sound={sound} setSound={setSound} onFinish={handleFinish} />
        )}
        {screen === 'poster' && battleStats && (
          <Poster stats={battleStats} pet={pet} onBack={() => setScreen('lobby')} onShare={shareText} />
        )}
      </div>

      {showSettings && (
        <SettingsModal
          sound={sound} setSound={setSound}
          onClose={() => setShowSettings(false)}
          onResetPet={resetPet}
          onResetProgress={resetProgress}
        />
      )}
    </GameShell>
  )
}
