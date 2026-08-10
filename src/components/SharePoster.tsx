import { forwardRef } from 'react'

interface SharePosterProps {
  title: string
  text: string
  qrDataUrl: string
}

/**
 * 隐藏的海报 DOM 节点，供 html2canvas 截图。
 * 使用固定亮色内联样式，避免暗色模式 / Tailwind 动态类导致截图异常。
 */
export const SharePoster = forwardRef<HTMLDivElement, SharePosterProps>(
  ({ title, text, qrDataUrl }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: 360,
          boxSizing: 'border-box',
          padding: 28,
          borderRadius: 20,
          background:
            'linear-gradient(160deg, #6366F1 0%, #0EA5E9 100%)',
          color: '#ffffff',
          fontFamily:
            'PingFang SC, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
          boxShadow: '0 20px 60px rgba(15, 23, 42, 0.35)',
        }}
      >
        {/* 顶部品牌角标 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: 'rgba(255,255,255,0.18)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 16,
            }}
          >
            🧠
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.5 }}>脑力小站</span>
        </div>

        {/* 游戏标题 */}
        <h2
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 800,
            lineHeight: 1.25,
            textShadow: '0 2px 8px rgba(15,23,42,0.25)',
          }}
        >
          {title}
        </h2>

        {/* 成绩文案卡片 */}
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.16)',
            backdropFilter: 'blur(4px)',
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {text}
        </div>

        {/* 底部：标语 + 二维码 */}
        <div style={{ marginTop: 22, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>
              来脑力小站，
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.4 }}>挑战一下吧！</div>
            <div style={{ marginTop: 6, fontSize: 11, opacity: 0.8 }}>扫码即玩 · 无需下载</div>
          </div>
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: 12,
              background: '#ffffff',
              padding: 8,
              boxSizing: 'border-box',
              flexShrink: 0,
            }}
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="游戏二维码"
                style={{ width: '100%', height: '100%', display: 'block', borderRadius: 6 }}
              />
            ) : null}
          </div>
        </div>
      </div>
    )
  },
)

SharePoster.displayName = 'SharePoster'
