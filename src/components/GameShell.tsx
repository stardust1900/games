import { useEffect, useState, type ReactNode } from 'react'
import { ShareButton } from './ShareButton'
import { cn } from '../lib/cn'

interface GameShellProps {
  title: string
  subtitle?: string
  daily?: boolean
  wide?: boolean
  compact?: boolean
  help?: ReactNode
  onShare?: () => string
  onReset?: () => void
  extra?: ReactNode
  children: ReactNode
}

export function GameShell({
  title,
  subtitle,
  daily,
  wide,
  compact,
  help,
  onShare,
  onReset,
  extra,
  children,
}: GameShellProps) {
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    if (!helpOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHelpOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [helpOpen])

  return (
    <div className={cn('mx-auto w-full px-3', compact ? 'pb-4' : 'pb-10', wide ? 'max-w-5xl' : 'max-w-xl')}>
      <header className={cn('flex items-end justify-between gap-3', compact ? 'mb-2' : 'mb-3')}>
        <div>
          <h1 className={cn('font-bold tracking-tight', compact ? 'text-lg' : 'text-xl')}>{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {daily && (
            <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">每日挑战</span>
          )}
          {help && (
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              aria-label="玩法说明"
              title="玩法说明"
              className="grid h-8 w-8 place-items-center rounded-full bg-slate-200/80 text-slate-600 transition hover:bg-slate-300 active:scale-95 dark:bg-slate-700/80 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.1 9a3 3 0 1 1 4.6 2.5c-.9.6-1.7 1.2-1.7 2.5" />
                <line x1="12" y1="17" x2="12" y2="17" />
              </svg>
            </button>
          )}
        </div>
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

      {helpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} 玩法说明`}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setHelpOpen(false)} />
          <div className="card relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto p-5 sm:p-6">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">
                <span className="text-gradient">{title}</span>
                <span className="text-slate-400"> · 玩法说明</span>
              </h2>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                aria-label="关闭"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-200/80 text-slate-600 transition hover:bg-slate-300 active:scale-95 dark:bg-slate-700/80 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
            <div className="help-content text-sm text-slate-700 dark:text-slate-300">{help}</div>
          </div>
        </div>
      )}
    </div>
  )
}
