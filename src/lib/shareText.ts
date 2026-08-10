export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to legacy */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/** 生成指向当前游戏页面的二维码 dataURL（轻量 qrcode 库，按需动态加载） */
export async function makeQrDataUrl(text: string, size = 220): Promise<string> {
  const QRCode = (await import('qrcode')).default
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    color: { dark: '#1e293b', light: '#ffffff' },
  })
}

/** 把指定 DOM 节点截图为 PNG dataURL（html2canvas 按需动态加载） */
export async function nodeToPng(node: HTMLElement): Promise<string> {
  const html2canvas = (await import('html2canvas')).default
  const canvas = await html2canvas(node, {
    backgroundColor: null,
    scale: 2,
    useCORS: true,
    logging: false,
  })
  return canvas.toDataURL('image/png')
}

/** 触发浏览器下载一个 dataURL 图片 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/** 当前游戏页完整 URL（Hash 路由下即为可直达链接） */
export function currentGameUrl(): string {
  return window.location.href
}
