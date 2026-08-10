import { useEffect } from 'react'

interface ShareModalProps {
  title: string
  posterDataUrl: string
  onClose: () => void
  onSave: () => void
  onCopyLink: () => void
  onNativeShare?: () => void
  saving: boolean
  status: string
}

export function ShareModal({
  title,
  posterDataUrl,
  onClose,
  onSave,
  onCopyLink,
  onNativeShare,
  saving,
  status,
}: ShareModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="分享海报"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="card relative z-10 flex w-full max-w-sm flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">
            <span className="text-gradient">分享海报</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-200/80 text-slate-600 transition hover:bg-slate-300 active:scale-95 dark:bg-slate-700/80 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mb-4 flex justify-center">
          {posterDataUrl ? (
            <img
              src={posterDataUrl}
              alt={`${title} 分享海报`}
              className="w-full max-w-[280px] rounded-2xl shadow-lg"
            />
          ) : (
            <div className="grid h-72 w-[280px] place-items-center rounded-2xl bg-slate-100 text-sm text-slate-400 dark:bg-slate-800">
              海报生成中…
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            className="btn btn-accent"
            onClick={onSave}
            disabled={saving || !posterDataUrl}
          >
            {saving
              ? '生成中…'
              : onNativeShare
                ? '保存 / 分享图片'
                : '保存图片'}
          </button>
          <button
            className="btn"
            onClick={onCopyLink}
            disabled={!posterDataUrl}
          >
            复制游戏链接
          </button>
        </div>

        {status && (
          <p className="mt-3 text-center text-xs text-accent">{status}</p>
        )}
      </div>
    </div>
  )
}
