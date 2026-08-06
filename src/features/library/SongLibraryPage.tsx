import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLibraryStore } from './library-store'
import { NewSongDialog } from './NewSongDialog'
import { SongStatus } from '../../components/ui'
import { useProviderStore } from '../settings/provider-store'
import { useAnalysisStore } from '../lyrics/analysis/analysis-store'
import type { LyricPair } from '../lyrics/import/prepare-lyrics'

export function SongLibraryPage() {
  const { songs, loading, error, loadSongs, deleteSong, updateStatus } = useLibraryStore()
  const [showNew, setShowNew] = useState(false)
  const loadActiveProvider = useProviderStore((s) => s.loadActiveProvider)
  const providerId = useProviderStore((s) => s.providerId)
  const baseUrl = useProviderStore((s) => s.baseUrl)
  const model = useProviderStore((s) => s.model)
  const analyzeSong = useAnalysisStore((s) => s.analyzeSong)

  useEffect(() => {
    loadSongs()
    loadActiveProvider()
  }, [loadSongs, loadActiveProvider])

  // Poll status while any song is analyzing.
  useEffect(() => {
    const analyzing = songs.some((s) => s.analysisStatus === 'in_progress')
    if (!analyzing) return
    const t = setInterval(() => loadSongs(), 2500)
    return () => clearInterval(t)
  }, [songs, loadSongs])

  async function handleCreated(songId: string, pairs: LyricPair[]) {
    setShowNew(false)
    await loadSongs()
    // Auto-analyze with the saved provider config.
    if (!providerId) {
      updateStatus(songId, 'failed', '未配置模型，请先到「模型设置」保存')
      await updateSongStatus(songId, 'failed', '未配置模型，请先到「模型设置」保存')
      return
    }
    // Show spinner immediately (local state) AND persist to DB so the polling
    // refresh keeps the spinner instead of reverting to idle.
    updateStatus(songId, 'in_progress')
    await updateSongStatus(songId, 'in_progress')
    try {
      const seqPairs = pairs.map((p) => ({
        seq: p.seq,
        source: p.source,
        referenceTranslation: p.referenceTranslation ?? null,
      }))
      await analyzeSong({ songId, baseUrl, model, providerId, pairs: seqPairs })
      updateStatus(songId, 'succeeded')
      await loadSongs()
    } catch (e) {
      updateStatus(songId, 'failed', String(e))
      await updateSongStatus(songId, 'failed', String(e))
    }
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1>歌曲库</h1>
          <p className="page-sub">导入歌词后自动分析</p>
        </div>
        <button className="btn" onClick={() => setShowNew(true)}>
          + 导入歌曲
        </button>
      </div>

      {error && <div className="notice notice-err">{error}</div>}

      {showNew && (
        <div className="glass-panel" style={{ padding: 20, marginBottom: 16 }}>
          <NewSongDialog onCreated={handleCreated} />
        </div>
      )}

      {loading && songs.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>加载中…</p>
      ) : songs.length === 0 ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          还没有歌曲。点击「导入歌曲」开始。
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 8 }}>
          {songs.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: 10,
                borderBottom: '1px solid var(--border-soft)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <SongStatus status={s.analysisStatus ?? 'idle'} error={s.analysisError} />
                <div>
                  <Link to={`/workspace/${s.id}`} style={{ color: 'var(--text-primary)' }}>
                    <strong style={{ fontSize: 15 }}>{s.title}</strong>
                  </Link>
                  {s.artist && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{s.artist}</span>}
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 12 }}>{s.language}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {s.analysisStatus === 'succeeded' && (
                  <Link to={`/export/${s.id}`} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 13 }}>
                    导出
                  </Link>
                )}
                <button
                  className="btn btn-danger"
                  style={{ padding: '4px 10px', fontSize: 13 }}
                  onClick={() => {
                    if (confirm(`删除歌曲「${s.title}」？`)) deleteSong(s.id)
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

async function updateSongStatus(songId: string, status: string, error?: string) {
  const { invoke } = await import('@tauri-apps/api/core')
  try {
    await invoke('set_song_status', { songId, status, error })
  } catch {
    // ignore
  }
}
