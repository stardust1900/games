// 验证华容道关卡：棋盘互不相同 + 难度（最短通关步数）单调递增
import fs from 'fs'

const src = fs.readFileSync('./src/games/klotski/klotskiData.ts', 'utf8')

// 从真实源码中提取每关的 id / name / grid
const blocks = [...src.matchAll(/id:\s*'([^']+)',\s*name:\s*'([^']+)',[\s\S]*?grid:\s*\[([^\]]+)\]/g)]
const LEVELS = blocks.map((m) => ({
  id: m[1],
  name: m[2],
  grid: eval('[' + m[3] + ']'),
}))

const W = 4, H = 5
function mk(type, x, y, id) {
  const w = type === 'cao' ? 2 : type === 'hgen' ? 2 : 1
  const h = type === 'cao' ? 2 : type === 'vgen' ? 2 : 1
  return { id, type, w, h, x, y }
}
function parseLayout(grid) {
  const used = Array.from({ length: H }, () => Array(W).fill(false))
  const out = []
  let id = 0
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (used[y][x]) continue
      const ch = grid[y][x]
      if (ch === 'C') { out.push(mk('cao', x, y, id++)); used[y][x]=used[y][x+1]=used[y+1][x]=used[y+1][x+1]=true }
      else if (ch === 'G') { out.push(mk('hgen', x, y, id++)); used[y][x]=used[y][x+1]=true }
      else if (ch === 'V') { out.push(mk('vgen', x, y, id++)); used[y][x]=used[y+1][x]=true }
      else if (ch === 'S') { out.push(mk('sol', x, y, id++)); used[y][x]=true }
    }
  return out
}
function occupied(blocks) {
  const g = Array.from({ length: H }, () => Array(W).fill(null))
  for (const b of blocks)
    for (let yy = 0; yy < b.h; yy++) for (let xx = 0; xx < b.w; xx++) g[b.y + yy][b.x + xx] = b.id
  return g
}
function canStep(blocks, id, dx, dy) {
  const b = blocks.find((x) => x.id === id)
  const g = occupied(blocks)
  for (let yy = 0; yy < b.h; yy++) for (let xx = 0; xx < b.w; xx++) {
    const nx = b.x + xx + dx, ny = b.y + yy + dy
    if (nx < 0 || nx >= W || ny < 0 || ny >= H) return false
    if (g[ny][nx] != null && g[ny][nx] !== id) return false
  }
  return true
}
function isWin(blocks) {
  const cao = blocks.find((b) => b.type === 'cao')
  return cao && cao.x === 1 && cao.y === 3
}
const DIRS = [[1,0],[-1,0],[0,1],[0,-1]]
function key(blocks) { return blocks.map((b) => `${b.id}:${b.x},${b.y}`).sort().join('|') }
function solvePath(start) {
  if (isWin(start)) return []
  const visited = new Map([[key(start), { cur: start }]])
  let frontier = [start]
  while (frontier.length) {
    const next = []
    for (const cur of frontier) {
      const g = occupied(cur)
      const parentKey = key(cur)
      for (const b of cur) for (const [dx, dy] of DIRS) {
        let ok = true
        for (let yy = 0; yy < b.h && ok; yy++) for (let xx = 0; xx < b.w && ok; xx++) {
          const nx = b.x + xx + dx, ny = b.y + yy + dy
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) ok = false
          else { const o = g[ny][nx]; if (o != null && o !== b.id) ok = false }
        }
        if (!ok) continue
        const moved = cur.map((x) => (x.id === b.id ? { ...x, x: x.x + dx, y: x.y + dy } : x))
        const k = key(moved)
        if (visited.has(k)) continue
        visited.set(k, { cur: moved, move: { id: b.id, dx, dy }, parent: parentKey })
        if (isWin(moved)) {
          const path = []
          let node = visited.get(k)
          while (node.move) { path.unshift(node.move); node = visited.get(node.parent) }
          return path
        }
        next.push(moved)
      }
    }
    frontier = next
  }
  return null
}

// 计算每关真实最短步数 + 形状签名
const rows = LEVELS.map((lv, i) => {
  const blocks = parseLayout(lv.grid)
  const sig = blocks.map((b) => `${b.type}:${b.x},${b.y}`).sort().join('|')
  const path = solvePath(blocks)
  const steps = path ? path.length : -1
  return { i, id: lv.id, name: lv.name, sig, steps }
})

console.log('关卡真实最短通关步数（BFS）：')
rows.forEach((r) => console.log(`  ${r.i + 1}. [${r.id}] ${r.name} -> ${r.steps} 步`))

// 1) 棋盘互不相同
const sigSeen = new Map()
const dupPairs = []
for (const r of rows) {
  for (const [s, other] of sigSeen) if (s === r.sig) dupPairs.push(`${other} == ${r.i + 1}`)
  sigSeen.set(r.sig, r.i + 1)
}
console.log('\n棋盘互不相同检查：', dupPairs.length ? '发现重复! ' + dupPairs.join(', ') : '全部不同 ✅')

// 2) 难度单调递增
let mono = true, badAt = []
for (let i = 1; i < rows.length; i++) {
  if (rows[i].steps <= rows[i - 1].steps) { mono = false; badAt.push(`${rows[i-1].name}(${rows[i-1].steps}) -> ${rows[i].name}(${rows[i].steps})`) }
}
console.log('难度单调递增检查：', mono ? '全部递增 ✅' : '非递增! ' + badAt.join(', '))
