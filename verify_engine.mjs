import fs from 'fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const ffish = require('ffish-es6').default
const wasm = fs.readFileSync('./node_modules/ffish-es6/ffish.wasm')

const FILES = 'abcdefghi'
function uciToMove(uci) {
  return { fx: FILES.indexOf(uci[0]), fy: 9 - Number(uci[1]), tx: FILES.indexOf(uci[2]), ty: 9 - Number(uci[3]) }
}

const M = await ffish({ wasmBinary: wasm })

// 用 ffish 自己生成的标准开局 FEN（权威）
const ref = new M.Board('xiangqi').fen()
console.log('ffish std FEN:', ref)

// 用项目 fenFromBoard 逻辑（复制自 xiangqiEngine.ts）构造
const INITIAL_ROWS = [
  'RNBAKABNR', '.........', '1C5C1', 'P.P.P.P.P', '.........',
  '.........', 'p.p.p.p.p', '1c5c1', '.........', 'rnbakabnr',
]
const PIECE_LETTERS = { K: 'k', A: 'a', B: 'b', N: 'n', R: 'r', C: 'c', P: 'p' }
function parse(rows) {
  return rows.map((r) => { const row = []; for (const ch of r) { if (ch === '.') { row.push(null) } else if (ch >= '1' && ch <= '9') { const n = Number(ch); for (let k = 0; k < n; k++) row.push(null) } else { row.push({ side: ch === ch.toLowerCase() ? 'b' : 'r', type: ch.toUpperCase() }) } } return row })
}
function fenFromBoard(board, side) {
  const rows = []
  for (let y = board.length - 1; y >= 0; y--) {
    let row = ''; let empty = 0
    for (let x = 0; x < board[y].length; x++) {
      const p = board[y][x]
      if (!p) { empty++; continue }
      if (empty > 0) { row += empty; empty = 0 }
      const letter = PIECE_LETTERS[p.type]
      row += p.side === 'r' ? letter.toUpperCase() : letter
    }
    if (empty > 0) row += empty
    rows.push(row)
  }
  return `${rows.join('/')} ${side === 'r' ? 'w' : 'b'} - - 0 1`
}

const board = parse(INITIAL_ROWS)
const fen = fenFromBoard(board, 'r')
console.log('my   FEN:', fen)
console.log('MATCH (placement):', fen.split(' ')[0] === ref.split(' ')[0])

// 加载我的 FEN，验证合法着法数 = 221（标准开局）
const b = new M.Board('xiangqi')
b.setFen(fen)
const ucis = b.legalMoves().split(' ').filter((s) => s.length === 4)
console.log('legal count from my FEN:', ucis.length)

// 验证 uciToMove 映射：开局红炮（项目 y=2,x=1 和 x=7）应能走
const cannonMoves = ucis.filter((u) => { const m = uciToMove(u); return (m.fy === 2 && (m.fx === 1 || m.fx === 7)) })
console.log('red cannon moves (expect 2-4):', cannonMoves)
for (const u of cannonMoves) console.log('  ', u, '->', JSON.stringify(uciToMove(u)))
