import { useRef, useState } from 'react'
import { copyText, currentGameUrl, downloadDataUrl, makeQrDataUrl, nodeToPng } from '../lib/shareText'
import { SharePoster } from './SharePoster'
import { ShareModal } from './ShareModal'

interface ShareButtonProps {
  title: string
  getShareText: () => string
  label?: string
}

export function ShareButton({ title, getShareText, label = '分享' }: ShareButtonProps) {
  const posterRef = useRef<HTMLDivElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [posterDataUrl, setPosterDataUrl] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  async function openPoster() {
    setOpen(true)
    setStatus('')
    setQrDataUrl('')
    setPosterDataUrl('')
    try {
      const url = currentGameUrl()
      const qr = await makeQrDataUrl(url)
      setQrDataUrl(qr)
      // 等待隐藏海报 DOM 挂载并拿到 ref 后再截图
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))))
      if (!posterRef.current) return
      const png = await nodeToPng(posterRef.current)
      setPosterDataUrl(png)
    } catch {
      // 降级：直接复制文案 + 链接
      const ok = await copyText(`${getShareText()}\n🔗 ${currentGameUrl()}`)
      setStatus(ok ? '已复制分享文案与链接' : '分享生成失败，请重试')
    }
  }

  function flash(msg: string) {
    setStatus(msg)
    window.setTimeout(() => setStatus(''), 1800)
  }

  async function onNativeShare() {
    if (!posterDataUrl) return
    try {
      const res = await fetch(posterDataUrl)
      const blob = await res.blob()
      const file = new File([blob], `脑力小站-${title}.png`, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `脑力小站 · ${title}`,
          text: getShareText(),
          files: [file],
        })
        flash('已分享')
      } else {
        downloadDataUrl(posterDataUrl, `脑力小站-${title}.png`)
        flash('已保存图片')
      }
    } catch {
      /* 用户取消分享，忽略 */
    }
  }

  function onSave() {
    if (!posterDataUrl) return
    setSaving(true)
    try {
      if (canNativeShare) {
        onNativeShare()
      } else {
        downloadDataUrl(posterDataUrl, `脑力小站-${title}.png`)
        flash('已保存图片')
      }
    } finally {
      setSaving(false)
    }
  }

  async function onCopyLink() {
    const ok = await copyText(currentGameUrl())
    flash(ok ? '已复制游戏链接' : '复制失败')
  }

  const canNativeShare =
    typeof navigator !== 'undefined' &&
    !!navigator.share &&
    typeof navigator.canShare === 'function'

  return (
    <>
      <button className="btn btn-accent" onClick={openPoster}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <path d="M16 6l-4-4-4 4M12 2v14" />
        </svg>
        {label}
      </button>

      {/* 隐藏海报节点，供截图 */}
      {open && qrDataUrl && (
        <SharePoster ref={posterRef} title={title} text={getShareText()} qrDataUrl={qrDataUrl} />
      )}

      {open && (
        <ShareModal
          title={title}
          posterDataUrl={posterDataUrl}
          onClose={() => setOpen(false)}
          onSave={onSave}
          onCopyLink={onCopyLink}
          onNativeShare={canNativeShare ? onNativeShare : undefined}
          saving={saving}
          status={status}
        />
      )}
    </>
  )
}
