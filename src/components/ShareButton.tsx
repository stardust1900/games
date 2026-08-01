import { useState } from 'react'
import { copyText } from '../lib/shareText'

export function ShareButton({ getShareText, label = '分享' }: { getShareText: () => string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function onShare() {
    const ok = await copyText(getShareText())
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    }
  }

  return (
    <button className="btn btn-accent" onClick={onShare}>
      {copied ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          已复制
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <path d="M16 6l-4-4-4 4M12 2v14" />
          </svg>
          {label}
        </>
      )}
    </button>
  )
}
