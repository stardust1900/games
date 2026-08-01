import { dateKey } from './dailySeed'
import { getJSON, setJSON } from './storage'

const KEY = 'streak:dates'

export interface StreakInfo {
  streak: number
  best: number
  playedToday: boolean
}

function loadDates(): string[] {
  return getJSON<string[]>(KEY, [])
}

function saveDates(dates: string[]): void {
  setJSON(KEY, dates)
}

/** 记录今天玩过（任意游戏都算一次打卡），不重复写入 */
export function markPlayedToday(): void {
  const today = dateKey()
  const dates = loadDates()
  if (!dates.includes(today)) {
    dates.push(today)
    // 只保留最近 400 天，避免无限增长
    saveDates(dates.slice(-400))
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('pg:streak'))
  }
}

/** 计算连续天数（截止今天或昨天）与历史最佳 */
export function getStreakInfo(): StreakInfo {
  const dates = loadDates().slice().sort()
  const today = dateKey()
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const yesterday = dateKey(y)

  const playedToday = dates.includes(today)

  let streak = 0
  // 从今天或昨天往前数连续天数
  let cursor = playedToday ? today : dates.includes(yesterday) ? yesterday : null
  if (cursor) {
    streak = 1
    const d = new Date(cursor + 'T00:00:00')
    while (true) {
      d.setDate(d.getDate() - 1)
      const prev = dateKey(d)
      if (dates.includes(prev)) {
        streak++
        cursor = prev
      } else {
        break
      }
    }
  }

  let best = streak
  // 历史最佳：扫描所有连续段
  let run = 0
  let prevDate: Date | null = null
  for (const ds of dates) {
    const cur = new Date(ds + 'T00:00:00')
    if (prevDate && (cur.getTime() - prevDate.getTime()) / 86400000 === 1) {
      run++
    } else {
      run = 1
    }
    best = Math.max(best, run)
    prevDate = cur
  }

  return { streak, best, playedToday }
}
