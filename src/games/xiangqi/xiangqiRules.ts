// 中国象棋规则引擎（纯逻辑，可单测）
// 棋盘：board[y][x]，x=列 0..8，y=行 0..9。红方在底部（y 小），黑方在顶部（y 大）。
// 红方 home：y 0..4，黑方 home：y 5..9。河界在 y=4 与 y=5 之间。

export type Side = 'r' | 'b'
export type PType = 'K' | 'A' | 'B' | 'N' | 'R' | 'C' | 'P'
export interface Piece {
  side: Side
  type: PType
}
export type Board = (Piece | null)[][]
export interface Move {
  fx: number
  fy: number
  tx: number
  ty: number
}

const W = 9
const H = 10

const DIR4: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]
const DIAG4: [number, number][] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

export const VALUE: Record<PType, number> = {
  K: 10000,
  R: 600,
  C: 285,
  N: 270,
  A: 120,
  B: 120,
  P: 30,
}

function inBoard(x: number, y: number) {
  return x >= 0 && x < W && y >= 0 && y < H
}

function inPalace(side: Side, x: number, y: number) {
  if (x < 3 || x > 5) return false
  return side === 'r' ? y >= 0 && y <= 2 : y >= 7 && y <= 9
}

export function kingPos(board: Board, side: Side): [number, number] | null {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p = board[y][x]
      if (p && p.side === side && p.type === 'K') return [x, y]
    }
  return null
}

export function cloneBoard(b: Board): Board {
  return b.map((r) => r.slice())
}

// 伪合法着法（忽略「走后己方被将」）
export function pseudoMoves(board: Board, x: number, y: number): [number, number][] {
  const p = board[y][x]
  if (!p) return []
  const side = p.side
  const out: [number, number][] = []
  const push = (nx: number, ny: number) => {
    if (!inBoard(nx, ny)) return
    const t = board[ny][nx]
    if (t && t.side === side) return
    out.push([nx, ny])
  }

  switch (p.type) {
    case 'K': {
      for (const [dx, dy] of DIR4) {
        const nx = x + dx
        const ny = y + dy
        if (inPalace(side, nx, ny)) push(nx, ny)
      }
      // 飞将：同列且中间无子，可「吃」对方将/帅
      const ek = kingPos(board, side === 'r' ? 'b' : 'r')
      if (ek && ek[0] === x) {
        let clear = true
        const sy = Math.min(y, ek[1]) + 1
        const ey = Math.max(y, ek[1])
        for (let yy = sy; yy < ey; yy++)
          if (board[yy][x]) {
            clear = false
            break
          }
        if (clear) out.push([ek[0], ek[1]])
      }
      break
    }
    case 'A': {
      for (const [dx, dy] of DIAG4) {
        const nx = x + dx
        const ny = y + dy
        if (inPalace(side, nx, ny)) push(nx, ny)
      }
      break
    }
    case 'B': {
      for (const [dx, dy] of DIAG4) {
        const nx = x + dx * 2
        const ny = y + dy * 2
        if (!inBoard(nx, ny)) continue
        if (side === 'r' && ny > 4) continue // 不过河
        if (side === 'b' && ny < 5) continue
        if (board[y + dy][x + dx]) continue // 塞象眼
        push(nx, ny)
      }
      break
    }
    case 'N': {
      const cand: [number, number][] = [
        [1, 2],
        [2, 1],
        [2, -1],
        [1, -2],
        [-1, -2],
        [-2, -1],
        [-2, 1],
        [-1, 2],
      ]
      for (const [dx, dy] of cand) {
        const legX = Math.abs(dx) === 2 ? x + dx / 2 : x
        const legY = Math.abs(dy) === 2 ? y + dy / 2 : y
        if (!inBoard(legX, legY) || board[legY][legX]) continue // 蹩腿
        const nx = x + dx
        const ny = y + dy
        if (!inBoard(nx, ny)) continue
        push(nx, ny)
      }
      break
    }
    case 'R': {
      for (const [dx, dy] of DIR4) {
        let nx = x + dx
        let ny = y + dy
        while (inBoard(nx, ny)) {
          const t = board[ny][nx]
          if (!t) out.push([nx, ny])
          else {
            if (t.side !== side) out.push([nx, ny])
            break
          }
          nx += dx
          ny += dy
        }
      }
      break
    }
    case 'C': {
      for (const [dx, dy] of DIR4) {
        let nx = x + dx
        let ny = y + dy
        let screen = false
        while (inBoard(nx, ny)) {
          const t = board[ny][nx]
          if (!screen) {
            if (!t) out.push([nx, ny])
            else screen = true
          } else if (t) {
            if (t.side !== side) out.push([nx, ny])
            break
          }
          nx += dx
          ny += dy
        }
      }
      break
    }
    case 'P': {
      const fwd = side === 'r' ? 1 : -1
      const tries: [number, number][] = [[0, fwd]]
      const crossed = side === 'r' ? y >= 5 : y <= 4
      if (crossed) {
        tries.push([1, 0], [-1, 0])
      }
      for (const [dx, dy] of tries) push(x + dx, y + dy)
      break
    }
  }
  return out
}

// 某方是否被将（含飞将）
export function inCheck(board: Board, side: Side): boolean {
  const kp = kingPos(board, side)
  if (!kp) return true
  const enemy: Side = side === 'r' ? 'b' : 'r'
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p = board[y][x]
      if (!p || p.side !== enemy) continue
      if (pseudoMoves(board, x, y).some(([tx, ty]) => tx === kp[0] && ty === kp[1])) return true
    }
  return false
}

export function applyMove(board: Board, m: Move): Board {
  const nb = cloneBoard(board)
  const p = nb[m.fy][m.fx]!
  nb[m.ty][m.tx] = p
  nb[m.fy][m.fx] = null
  return nb
}

function isLegal(board: Board, m: Move, side: Side): boolean {
  return !inCheck(applyMove(board, m), side)
}

export function legalMoves(board: Board, side: Side): Move[] {
  const res: Move[] = []
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p = board[y][x]
      if (!p || p.side !== side) continue
      for (const [tx, ty] of pseudoMoves(board, x, y))
        if (isLegal(board, { fx: x, fy: y, tx, ty }, side))
          res.push({ fx: x, fy: y, tx, ty })
    }
  return res
}

// 评估（黑方视角：越大对黑越有利）
export function evaluate(board: Board): number {
  let s = 0
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p = board[y][x]
      if (!p) continue
      let v = VALUE[p.type]
      if (p.type === 'P') {
        const adv = p.side === 'r' ? y : 9 - y
        v += adv * 8
      }
      s += p.side === 'b' ? v : -v
    }
  return s
}

const MATE = 1e7
const INF = 1e9

function cap(board: Board, m: Move): number {
  const t = board[m.ty][m.tx]
  return t ? VALUE[t.type] : 0
}

// 极小化极大 + α-β 剪枝（黑方最大化，红方最小化）
export function search(board: Board, depth: number, alpha: number, beta: number, side: Side): number {
  if (depth === 0) return evaluate(board)
  const moves = legalMoves(board, side)
  if (moves.length === 0) return side === 'b' ? -MATE + depth : MATE - depth
  moves.sort((a, b) => cap(board, b) - cap(board, a))
  if (side === 'b') {
    let best = -INF
    for (const m of moves) {
      const val = search(applyMove(board, m), depth - 1, alpha, beta, 'r')
      if (val > best) best = val
      if (best > alpha) alpha = best
      if (alpha >= beta) break
    }
    return best
  } else {
    let best = INF
    for (const m of moves) {
      const val = search(applyMove(board, m), depth - 1, alpha, beta, 'b')
      if (val < best) best = val
      if (best < beta) beta = best
      if (alpha >= beta) break
    }
    return best
  }
}

// 为指定一方挑选最佳着法
export function bestMoveFor(board: Board, side: Side, depth: number): Move | null {
  const moves = legalMoves(board, side)
  if (moves.length === 0) return null
  moves.sort((a, b) => cap(board, b) - cap(board, a))
  if (side === 'b') {
    let best: Move | null = null
    let bestVal = -INF
    for (const m of moves) {
      const val = search(applyMove(board, m), depth - 1, -INF, INF, 'r')
      if (val > bestVal) {
        bestVal = val
        best = m
      }
    }
    return best
  } else {
    let best: Move | null = null
    let bestVal = INF
    for (const m of moves) {
      const val = search(applyMove(board, m), depth - 1, -INF, INF, 'b')
      if (val < bestVal) {
        bestVal = val
        best = m
      }
    }
    return best
  }
}

export interface SolveResult {
  line: Move[]
  mated: boolean
  winner: Side | null
}

// 逐着贪心求解：每方各走一步「最佳着法」，返回演示主变线（快，适合交互演示）
export function solveLine(board: Board, maxPlies = 30, moveDepth = 4): SolveResult {
  const line: Move[] = []
  let b = board
  let side: Side = 'r'
  let mated = false
  let winner: Side | null = null
  for (let i = 0; i < maxPlies; i++) {
    const m = bestMoveFor(b, side, moveDepth)
    if (!m) break
    line.push(m)
    b = applyMove(b, m)
    const opp: Side = side === 'r' ? 'b' : 'r'
    if (inCheck(b, opp) && legalMoves(b, opp).length === 0) {
      mated = true
      winner = side
      break
    }
    side = opp
  }
  return { line, mated, winner }
}

// 为黑方挑选最佳着法
export function bestMove(board: Board, depth: number): Move | null {
  return bestMoveFor(board, 'b', depth)
}
