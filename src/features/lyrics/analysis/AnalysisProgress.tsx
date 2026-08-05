import { useAnalysisStore } from './analysis-store'

export function AnalysisProgress() {
  const { analyzing, progress, error } = useAnalysisStore()

  if (!analyzing && progress.length === 0 && !error) return null

  const succeeded = progress.filter((p) => p.status === 'succeeded').length
  const failed = progress.filter((p) => p.status === 'failed').length

  return (
    <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 16, margin: '16px 0' }}>
      {error && (
        <div style={{ color: '#c00', marginBottom: 8 }}>分析失败：{error}</div>
      )}
      {analyzing && <p>正在分析歌词（{succeeded + failed}/{progress.length || '…'}）…</p>}
      {!analyzing && progress.length > 0 && (
        <p>
          分析完成：成功 {succeeded}，失败 {failed}
        </p>
      )}
      {progress.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {progress.map((p) => (
            <li key={p.index} style={{ marginBottom: 4 }}>
              第 {p.index + 1} 句：{p.status}
              {p.error && <span style={{ color: '#c00' }}> — {p.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
