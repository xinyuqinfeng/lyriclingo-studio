import type { ReactNode } from 'react'

export function Modal({
  title,
  onClose,
  children,
  width,
}: {
  title: string
  onClose?: () => void
  children: ReactNode
  width?: number
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal anim-pop"
        onClick={(e) => e.stopPropagation()}
        style={width ? { width } : undefined}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
          {onClose && (
            <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 10px' }}>
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export function Notice({ kind, children }: { kind: 'info' | 'err' | 'ok'; children: ReactNode }) {
  return <div className={`notice notice-${kind}`}>{children}</div>
}

/** Analysis status indicator: spinner / ok / error. */
export function StatusDot({ status }: { status: 'pending' | 'in_progress' | 'succeeded' | 'failed' | 'cancelled' | 'idle' }) {
  switch (status) {
    case 'in_progress':
      return <span className="spinner" />
    case 'succeeded':
      return <span className="status-ok">✓</span>
    case 'failed':
      return <span className="status-err">✕</span>
    case 'pending':
      return <span style={{ color: 'var(--text-muted)' }}>○</span>
    default:
      return null
  }
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span className="spinner" />
      {label && <span style={{ color: 'var(--text-secondary)' }}>{label}</span>}
    </span>
  )
}

/** Song-level analysis status shown in the library list. */
export function SongStatus({ status, error }: { status: string; error?: string | null }) {
  const map: Record<string, 'idle' | 'pending' | 'in_progress' | 'succeeded' | 'failed' | 'cancelled'> = {
    pending: 'pending',
    in_progress: 'in_progress',
    succeeded: 'succeeded',
    failed: 'failed',
    cancelled: 'cancelled',
  }
  const s = map[status] ?? 'idle'
  if (s === 'idle') {
    return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>未分析</span>
  }
  return (
    <span title={error ?? undefined}>
      <StatusDot status={s} />
      {s === 'failed' && error && (
        <span style={{ color: 'var(--danger)', fontSize: 12, marginLeft: 6 }}>{error}</span>
      )}
    </span>
  )
}
