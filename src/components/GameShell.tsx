import type { ReactNode } from 'react'
import { ShareButton } from './ShareButton'
import { cn } from '../lib/cn'

interface GameShellProps {
  title: string
  subtitle?: string
  daily?: boolean
  wide?: boolean
  compact?: boolean
  onShare?: () => string
  onReset?: () => void
  extra?: ReactNode
  children: ReactNode
}

export function GameShell({ title, subtitle, daily, wide, compact, onShare, onReset, extra, children }: GameShellProps) {
  return (
    <div className={cn('mx-auto w-full px-3', compact ? 'pb-4' : 'pb-10', wide ? 'max-w-5xl' : 'max-w-xl')}>
      <header className={cn('flex items-end justify-between gap-3', compact ? 'mb-2' : 'mb-3')}>
        <div>
          <h1 className={cn('font-bold tracking-tight', compact ? 'text-lg' : 'text-xl')}>{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {daily && (
          <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
            每日挑战
          </span>
        )}
      </header>

      <div className={cn('flex flex-wrap items-center gap-2', compact ? 'mb-2' : 'mb-3')}>
        {onReset && (
          <button className="btn" onClick={onReset}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            重开
          </button>
        )}
        {extra}
        {onShare && <ShareButton getShareText={onShare} />}
      </div>

      <div className={cn(!wide && 'card p-3 sm:p-4')}>{children}</div>
    </div>
  )
}
