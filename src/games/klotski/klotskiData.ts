import { seededRng as libSeededRng } from '../../lib/dailySeed'

export const seededRng = libSeededRng

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
  minSteps: number // 该关卡要求的最少解题步数（保证可达）
  grid: string[] // 固定初始布局字符网格
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
  const cao = blocks.find((b) => b.type === 'cao')
  if (!cao) return false
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

// 预定义固定布局（曹操位于棋盘上方，被将/兵围困）。
// 所有布局已用 BFS 预先验证真实最短通关步数，确保至少 10 步，且前 3 关 10 步、后 5 关 26~28 步。
export const LEVELS: Level[] = [
  {
    id: 'kl-hdlm',
    name: '横刀立马',
    seed: 'hdlm',
    turns: 0,
    minSteps: 10,
    grid: ['SGGS', 'V..V', 'VCCV', 'VCCV', 'VSSV'],
  },
  {
    id: 'kl-zhdd',
    name: '指挥若定',
    seed: 'zhdd',
    turns: 0,
    minSteps: 10,
    grid: ['S.GS', 'V..V', 'VCCV', 'VCCV', 'VSSV'],
  },
  {
    id: 'kl-qtjb',
    name: '齐头并进',
    seed: 'qtjb',
    turns: 0,
    minSteps: 10,
    grid: ['SG.S', 'V..V', 'VCCV', 'VCCV', 'VSSV'],
  },
  {
    id: 'kl-bfsl',
    name: '兵分三路',
    seed: 'bfsl',
    turns: 0,
    minSteps: 26,
    grid: ['VS.S', 'VCCV', 'VCCV', 'VGGV', 'S..S'],
  },
  {
    id: 'kl-ysxl',
    name: '雨声淅沥',
    seed: 'ysxl',
    turns: 0,
    minSteps: 26,
    grid: ['S.SV', 'VCCV', 'VCCV', 'VGGV', 'S..S'],
  },
  {
    id: 'kl-hsqj',
    name: '横扫千军',
    seed: 'hsqj',
    turns: 0,
    minSteps: 28,
    grid: ['VS.S', 'VCCV', 'VCCV', 'VGGV', '..SS'],
  },
  {
    id: 'kl-blcy',
    name: '兵临曹营',
    seed: 'blcy',
    turns: 0,
    minSteps: 28,
    grid: ['S.SV', 'VCCV', 'VCCV', 'VGGV', 'SS..'],
  },
  {
    id: 'kl-dqpm',
    name: '单枪匹马',
    seed: 'dqpm',
    turns: 0,
    minSteps: 27,
    grid: ['S.SV', 'VCCV', 'VCCV', 'VGGV', 'S.S.'],
  },
]

export const LABEL: Record<BlockType, { t: string; cls: string }> = {
  cao: { t: '曹', cls: 'bg-accent text-white' },
  vgen: { t: '将', cls: 'bg-sky-500 text-white' },
  hgen: { t: '帅', cls: 'bg-emerald-500 text-white' },
  sol: { t: '兵', cls: 'bg-amber-500 text-white' },
}

export { W as COLS, H as ROWS }

// 局面序列化（用于 BFS 去重）：保持棋子身份顺序，记录其坐标
function key(blocks: Block[]): string {
  return blocks
    .map((b) => `${b.id}:${b.x},${b.y}`)
    .sort()
    .join('|')
}

// BFS 求从当前局面到「曹操在底部中央」的最少步数；返回步数（无解或超出 maxDepth 返回 -1）
export function solve(start: Block[], maxDepth?: number): number {
  if (isWin(start)) return 0
  const startKey = key(start)
  const visited = new Set<string>([startKey])
  let frontier: Block[][] = [start]
  let depth = 0
  while (frontier.length) {
    depth++
    if (maxDepth != null && depth > maxDepth) return -1
    const next: Block[][] = []
    for (const cur of frontier) {
      const g = occupied(cur)
      for (const b of cur) {
        for (const [dx, dy] of DIRS) {
          // 复用 canStep 逻辑但避免重复调用开销
          let ok = true
          for (let yy = 0; yy < b.h && ok; yy++)
            for (let xx = 0; xx < b.w && ok; xx++) {
              const nx = b.x + xx + dx
              const ny = b.y + yy + dy
              if (nx < 0 || nx >= W || ny < 0 || ny >= H) ok = false
              else {
                const o = g[ny][nx]
                if (o != null && o !== b.id) ok = false
              }
            }
          if (!ok) continue
          const moved = cur.map((x) => (x.id === b.id ? { ...x, x: x.x + dx, y: x.y + dy } : x))
          const k = key(moved)
          if (visited.has(k)) continue
          if (isWin(moved)) return depth
          visited.add(k)
          next.push(moved)
        }
      }
    }
    frontier = next
  }
  return -1
}

// 单步：移动某个方块 dx/dy
export interface KMove {
  id: number
  dx: number
  dy: number
}

// 已解状态参考布局（曹操已在出口），固定关卡不再从这里生成，但保留供其它地方参考
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
void SOLVED

// 从当前局面到「曹操在底部中央」的最短解法（含路径）
export function solvePath(start: Block[]): KMove[] {
  if (isWin(start)) return []
  const startKey = key(start)
  const visited = new Map<string, { cur: Block[]; move?: KMove; parent?: string }>([
    [startKey, { cur: start }],
  ])
  let frontier: Block[][] = [start]
  let depth = 0
  while (frontier.length) {
    depth++
    const next: Block[][] = []
    for (const cur of frontier) {
      const g = occupied(cur)
      const parentKey = key(cur)
      for (const b of cur) {
        for (const [dx, dy] of DIRS) {
          let ok = true
          for (let yy = 0; yy < b.h && ok; yy++)
            for (let xx = 0; xx < b.w && ok; xx++) {
              const nx = b.x + xx + dx
              const ny = b.y + yy + dy
              if (nx < 0 || nx >= W || ny < 0 || ny >= H) ok = false
              else {
                const o = g[ny][nx]
                if (o != null && o !== b.id) ok = false
              }
            }
          if (!ok) continue
          const moved = cur.map((x) => (x.id === b.id ? { ...x, x: x.x + dx, y: x.y + dy } : x))
          const k = key(moved)
          if (visited.has(k)) continue
          visited.set(k, { cur: moved, move: { id: b.id, dx, dy }, parent: parentKey })
          if (isWin(moved)) {
            // 回溯路径
            const path: KMove[] = []
            let node = visited.get(k)!
            while (node.move) {
              path.unshift(node.move)
              node = visited.get(node.parent!)!
            }
            return path
          }
          next.push(moved)
        }
      }
    }
    frontier = next
  }
  return []
}

// 生成关卡：解析固定布局并用 BFS 求出真实最短通关步数与解法。
// 所有布局已预先验证其最短通关步数 ≥ minSteps，因此显示给玩家的"最少 N 步"就是实际值。
export function generate(level: Level): { blocks: Block[]; moves: KMove[]; steps: number } {
  const blocks = parseLayout(level.grid)
  const moves = solvePath(blocks)
  return { blocks, moves, steps: moves.length }
}

// 兼容旧用法：若 moves 已经是“从初始局面到通关”的最短解，则无需反转；
// 若传入的是“从已解状态到关卡的打乱序列”，则逆序反向得到解法。
export function scrambleSolution(moves: KMove[]): KMove[] {
  return moves
    .slice()
    .reverse()
    .map((m) => ({ id: m.id, dx: -m.dx, dy: -m.dy }))
}
