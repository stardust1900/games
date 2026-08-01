import { Link, Outlet } from 'react-router-dom'
import { StreakBar } from '../components/StreakBar'
import { ThemeToggle } from '../components/ThemeToggle'

export function Layout() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-3">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-sm shadow-indigo-500/30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a4 4 0 0 0-4 4 4 4 0 0 0-1 7 4 4 0 0 0 5 6 4 4 0 0 0 5-6 4 4 0 0 0-1-7 4 4 0 0 0-4-4z" />
              </svg>
            </span>
            <span className="text-gradient text-base font-extrabold">脑力小站</span>
          </Link>
          <div className="flex items-center gap-2">
            <StreakBar />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
