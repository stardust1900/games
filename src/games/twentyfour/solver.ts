// 算24点核心逻辑：精确分数运算 + 暴力求解 + 确定性出题
import { seededRng } from '../../lib/dailySeed'

/* ═══════════════════════════════════════════
   精确分数 Frac —— 避免浮点除法累积误差
   ═══════════════════════════════════════════ */

export interface Frac {
  n: number // 分子（可为负）
  d: number // 分母（恒为正）
}

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) {
    ;[a, b] = [b, a % b]
  }
  return a || 1
}

export function frac(n: number, d: number): Frac {
  if (d < 0) {
    n = -n
    d = -d
  }
  const g = gcd(n, d)
  return { n: n / g, d: d / g }
}

export function fAdd(a: Frac, b: Frac): Frac {
  return frac(a.n * b.d + b.n * a.d, a.d * b.d)
}
export function fSub(a: Frac, b: Frac): Frac {
  return frac(a.n * b.d - b.n * a.d, a.d * b.d)
}
export function fMul(a: Frac, b: Frac): Frac {
  return frac(a.n * b.n, a.d * b.d)
}
export function fDiv(a: Frac, b: Frac): Frac | null {
  if (b.n === 0) return null // 除零
  return frac(a.n * b.d, a.d * b.n)
}

export function fValue(f: Frac): number {
  return f.n / f.d
}

export function fEquals24(f: Frac): boolean {
  return Math.abs(f.n / f.d - 24) < 1e-6
}

export function fracToString(f: Frac): string {
  return f.d === 1 ? `${f.n}` : `${f.n}/${f.d}`
}

/* ═══════════════════════════════════════════
   求解器 —— 同时用于「校验」与「查看解法」
   ═══════════════════════════════════════════ */

interface Node {
  value: Frac
  expr: string // 已加必要括号的展示表达式
}

const OPS: {
  sym: string
  calc: (a: Frac, b: Frac) => Frac | null
  commutative: boolean
}[] = [
  { sym: '+', calc: fAdd, commutative: true },
  { sym: '-', calc: fSub, commutative: false },
  { sym: '×', calc: fMul, commutative: true },
  { sym: '÷', calc: fDiv, commutative: false },
]

function wrap(a: Node, paren: boolean): string {
  return paren ? `(${a.expr})` : a.expr
}

// 递归枚举：每次从集合中取两个节点合并，直到剩一个
function search(nodes: Node[]): string | null {
  if (nodes.length === 1) {
    return fEquals24(nodes[0].value) ? nodes[0].expr : null
  }
  for (let i = 0; i < nodes.length; i++) {
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue
      const a = nodes[i]
      const b = nodes[j]
      const rest = nodes.filter((_, k) => k !== i && k !== j)
      for (const op of OPS) {
        const r = op.calc(a.value, b.value)
        if (!r) continue
        // 减/除非交换：仅生成 a op b 一种顺序（避免重复）
        const child: Node = {
          value: r,
          expr: `${wrap(a, needsParen(a, op, true))} ${op.sym} ${wrap(b, needsParen(b, op, false))}`,
        }
        const found = search([...rest, child])
        if (found) return found
        // 减法/除法再补一个反向（b op a），覆盖 (b-a) 与 (b÷a) 的情况
        if (!op.commutative) {
          const r2 = op.calc(b.value, a.value)
          if (r2) {
            const child2: Node = {
              value: r2,
              expr: `${wrap(b, needsParen(b, op, true))} ${op.sym} ${wrap(a, needsParen(a, op, false))}`,
            }
            const found2 = search([...rest, child2])
            if (found2) return found2
          }
        }
      }
    }
  }
  return null
}

// 简化括号：+ × 外层优先级低无需包；- ÷ 作为子项被 + × 包时无需；- ÷ 内部需要视情况
function needsParen(node: Node, op: (typeof OPS)[number], isLeft: boolean): boolean {
  if (node.expr.indexOf(' ') === -1) return false // 单数字
  // 子节点本身含运算符时，除最外层 + × 同级外，减/除需要括号
  const childTop = node.expr.slice(0, node.expr.indexOf(' '))
  const childOp = childTop === '' ? '' : ''
  void childOp
  // 简单策略：子节点若含 + 或 -，且当前是 × 或 ÷，需要括号；子节点含 + - × ÷ 且当前是 - ÷ 且位于右侧，需要括号
  const hasAddSub = node.expr.includes(' + ') || node.expr.includes(' - ')
  const hasAnyOp = node.expr.includes(' ')
  if (op.sym === '×' || op.sym === '÷') {
    return hasAddSub // (a+b)×c 需要括号
  }
  // 当前是 +：子节点任何运算符都不需要额外括号（a+(b×c) 括号可省，但保留也无害）
  if (op.sym === '+') return false
  // 当前是 -：
  if (isLeft) {
    // a - (b×c) 中 b×c 无需括号；a - (b+c) 需要
    return hasAddSub
  } else {
    // (a×b) - c 中 a×b 无需； (a+b) - c 中 a+b 需要括号（避免 a+b - c 歧义保留）
    return hasAnyOp
  }
  // 当前是 ÷：
  if (isLeft) {
    // a ÷ (b×c) b×c 无需；a ÷ (b+c) 需要
    return hasAddSub
  } else {
    // (a×b) ÷ c 需要括号避免歧义
    return hasAnyOp
  }
}

/** 用递归合并求解，返回一条能算出 24 的表达式；无解返回 null */
export function solve(nums: number[]): string | null {
  const nodes: Node[] = nums.map((v) => ({ value: frac(v, 1), expr: `${v}` }))
  return search(nodes)
}

/* ═══════════════════════════════════════════
   出题 —— 保证有解
   ═══════════════════════════════════════════ */

function randomInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

function pickSolvable(rng: () => number): number[] {
  for (let t = 0; t < 500; t++) {
    const nums = [
      randomInt(rng, 1, 13),
      randomInt(rng, 1, 13),
      randomInt(rng, 1, 13),
      randomInt(rng, 1, 13),
    ]
    if (solve(nums)) return nums
  }
  // 兜底：已知的必有解组合
  return [4, 6, 1, 1]
}

/** 用日期种子确定性生成 4 个 1-13 且保证有解的牌组（每日挑战） */
export function generateDailyPuzzle(dateStr: string): number[] {
  return pickSolvable(seededRng(dateStr + ':24'))
}

/** 随机生成 4 个 1-13 且保证有解的牌组（练习模式） */
export function generateRandomPuzzle(): number[] {
  return pickSolvable(Math.random)
}
