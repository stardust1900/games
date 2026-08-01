import { seededRng } from '../../lib/dailySeed'

// 棋盘 4 列 × 5 行。坐标 (x=列 0..3, y=行 0..4)
// 经典布局字符：C=曹操(2×2) G=关羽横(1×2) V=竖将(1×2) S=兵(1×1) .=空
export type BlockType = 'cao' | 'vgen' | 'hgen' | 'sol'

export interface Block {
  id: number
  type: BlockType
  w: number
  h: number
  x: number
  y: number
}

export interface Level {
  id: string
  name: string
  seed: string
  turns: number
}

const W = 4
const H = 5

function mk(type: BlockType, x: number, y: number, id: number): Block {
  const w = type === 'cao' ? 2 : type === 'hgen' ? 2 : 1
  const h = type === 'cao' ? 2 : type === 'vgen' ? 2 : 1
  return { id, type, w, h, x, y }
}

// 把字符网格解析为棋子列表（按形状合并 C/G/V/S）
export function parseLayout(grid: string[]): Block[] {
  const used: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false))
  const blocks: Block[] = []
  let id = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (used[y][x]) continue
      const ch = grid[y][x]
      if (ch === 'C') {
        blocks.push(mk('cao', x, y, id++))
        used[y][x] = used[y][x + 1] = used[y + 1][x] = used[y + 1][x + 1] = true
      } else if (ch === 'G') {
        blocks.push(mk('hgen', x, y, id++))
        used[y][x] = used[y][x + 1] = true
      } else if (ch === 'V') {
        blocks.push(mk('vgen', x, y, id++))
        used[y][x] = used[y + 1][x] = true
      } else if (ch === 'S') {
        blocks.push(mk('sol', x, y, id++))
        used[y][x] = true
      }
    }
  }
  return blocks
}

export function occupied(blocks: Block[]): (number | null)[][] {
  const g: (number | null)[][] = Array.from({ length: H }, () => Array(W).fill(null))
  for (const b of blocks)
    for (let yy = 0; yy < b.h; yy++)
      for (let xx = 0; xx < b.w; xx++) g[b.y + yy][b.x + xx] = b.id
  return g
}

export function canStep(blocks: Block[], id: number, dx: number, dy: number): boolean {
  const b = blocks.find((x) => x.id === id)!
  const g = occupied(blocks)
  for (let yy = 0; yy < b.h; yy++)
    for (let xx = 0; xx < b.w; xx++) {
      const nx = b.x + xx + dx
      const ny = b.y + yy + dy
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) return false
      if (g[ny][nx] != null && g[ny][nx] !== id) return false
    }
  return true
}

export function step(blocks: Block[], id: number, dx: number, dy: number): Block[] {
  return blocks.map((b) => (b.id === id ? { ...b, x: b.x + dx, y: b.y + dy } : b))
}

// 曹操位于底部中央 (x=1,y=3) 即为通关
export function isWin(blocks: Block[]): boolean {
  const cao = blocks.find((b) => b.type === 'cao')!
  return cao.x === 1 && cao.y === 3
}

// 某方向上，方块移动后会「新占据」的格子（点击这些格子即可触发移动）
export function targetCells(b: Block, dx: number, dy: number): [number, number][] {
  const res: [number, number][] = []
  for (let yy = 0; yy < b.h; yy++)
    for (let xx = 0; xx < b.w; xx++) {
      const nx = b.x + xx + dx
      const ny = b.y + yy + dy
      const isOrig = nx >= b.x && nx < b.x + b.w && ny >= b.y && ny < b.y + b.h
      if (!isOrig) res.push([nx, ny])
    }
  return res
}

export const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

// 经典风格关卡（由已解状态打乱生成，保证可解；名称沿用经典排局）
export const LEVELS: Level[] = [
  { id: 'kl-hdlm', name: '横刀立马', seed: 'hdlm-7', turns: 70 },
  { id: 'kl-zhdd', name: '指挥若定', seed: 'zhdd-3', turns: 80 },
  { id: 'kl-qtjb', name: '齐头并进', seed: 'qtjb-11', turns: 90 },
  { id: 'kl-bfsl', name: '兵分三路', seed: 'bfsl-5', turns: 85 },
  { id: 'kl-ysxl', name: '雨声淅沥', seed: 'ysxl-9', turns: 95 },
  { id: 'kl-hsqj', name: '横扫千军', seed: 'hsqj-2', turns: 100 },
  { id: 'kl-blcy', name: '兵临曹营', seed: 'blcy-4', turns: 88 },
  { id: 'kl-dqpm', name: '单枪匹马', seed: 'dqpm-6', turns: 76 },
]

export const LABEL: Record<BlockType, { t: string; cls: string }> = {
  cao: { t: '曹', cls: 'bg-accent text-white' },
  vgen: { t: '将', cls: 'bg-sky-500 text-white' },
  hgen: { t: '帅', cls: 'bg-emerald-500 text-white' },
  sol: { t: '兵', cls: 'bg-amber-500 text-white' },
}

export { W as COLS, H as ROWS }

// 单步：移动某个方块 dx/dy
export interface KMove {
  id: number
  dx: number
  dy: number
}

// 从已解状态反向随机打乱，记录每一步，保证可解；返回局面 + 打乱步序
export function generate(seedStr: string, turns: number): { blocks: Block[]; moves: KMove[] } {
  const rng = seededRng(seedStr)
  const SOLVED: Block[] = [
    mk('sol', 0, 0, 0),
    mk('hgen', 1, 0, 1),
    mk('sol', 3, 0, 2),
    mk('vgen', 0, 1, 3),
    mk('sol', 1, 1, 4),
    mk('sol', 2, 2, 5),
    mk('vgen', 3, 1, 6),
    mk('vgen', 0, 3, 7),
    mk('cao', 1, 3, 8),
    mk('vgen', 3, 3, 9),
  ]
  let cur = SOLVED.map((b) => ({ ...b }))
  const moves: KMove[] = []
  let last: [number, number, number] | null = null
  let guard = 0
  while (moves.length < turns && guard < turns * 20) {
    guard++
    const cand: [number, number, number][] = []
    for (const b of cur)
      for (const [dx, dy] of DIRS) if (canStep(cur, b.id, dx, dy)) cand.push([b.id, dx, dy])
    const prev = last
    const filtered: [number, number, number][] = prev
      ? cand.filter(([id, dx, dy]) => !(id === prev[0] && dx === -prev[1] && dy === -prev[2]))
      : cand
    const pool: [number, number, number][] = filtered.length ? filtered : cand
    const [id, dx, dy] = pool[Math.floor(rng() * pool.length)]
    cur = step(cur, id, dx, dy)
    moves.push({ id, dx, dy })
    last = [id, dx, dy]
  }
  if (isWin(cur)) return generate(seedStr + ':retry', turns)
  return { blocks: cur, moves }
}

// 由打乱步序直接得到「解法」：逆序、反向即可回到已解状态（最优且即时）
export function scrambleSolution(moves: KMove[]): KMove[] {
  return moves
    .slice()
    .reverse()
    .map((m) => ({ id: m.id, dx: -m.dx, dy: -m.dy }))
}
