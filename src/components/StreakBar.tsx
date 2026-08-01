import { useEffect, useState } from 'react'
import { getStreakInfo } from '../lib/streak'

export function StreakBar() {
  const [info, setInfo] = useState(() => getStreakInfo())

  useEffect(() => {
    const update = () => setInfo(getStreakInfo())
    update()
    window.addEventListener('pg:streak', update)
    return () => window.removeEventListener('pg:streak', update)
  }, [])

  return (
    <div
      className="flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
      title={`连续 ${info.streak} 天 · 最佳 ${info.best} 天`}
    >
      <span aria-hidden>🔥</span>
      <span>{info.streak}</span>
    </div>
  )
}
