import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useParams, Link } from 'react-router-dom'
import { AnalysisProgress } from '../lyrics/analysis/AnalysisProgress'
import { useAnalysisStore } from '../lyrics/analysis/analysis-store'
import { useProviderStore } from '../settings/provider-store'
import { extractLyricPairs } from '../lyrics/import/prepare-lyrics'
import type { SourceLanguage } from '@lyriclingo/contracts'
import { Spinner, Notice } from '../../components/ui'

interface SongDetail {
  id: string
  title: string
  artist: string
  language: string
  lyrics: string
  lyricsRaw?: string | null
  analysisStatus?: string | null
  analysisError?: string | null
}

export function SongDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [song, setSong] = useState<SongDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [needConfig, setNeedConfig] = useState(false)
  const [done, setDone] = useState(false)
  const analyzeSong = useAnalysisStore((s) => s.analyzeSong)
  const analyzing = useAnalysisStore((s) => s.analyzing)
  const analysisError = useAnalysisStore((s) => s.error)
  const loadActiveProvider = useProviderStore((s) => s.loadActiveProvider)
  const providerId = useProviderStore((s) => s.providerId)
  const baseUrl = useProviderStore((s) => s.baseUrl)
  const model = useProviderStore((s) => s.model)

  useEffect(() => {
    if (id) {
      invoke<SongDetail>('get_song', { id }).then(setSong).catch((e) => setError(String(e)))
    }
    loadActiveProvider().then((p) => setNeedConfig(!p || !p.hasKey))
  }, [id, loadActiveProvider])

  if (!song) return <p style={{ padding: 24 }}>{error ?? '加载中…'}</p>
  const songInfo = song

  async function handleAnalyze() {
    setDone(false)
    const raw = songInfo.lyricsRaw && songInfo.lyricsRaw.trim() ? songInfo.lyricsRaw : songInfo.lyrics
    const language = songInfo.language as SourceLanguage
    const pairs = extractLyricPairs(raw, language).map((p) => ({
      seq: p.seq,
      source: p.source,
      referenceTranslation: p.referenceTranslation ?? null,
    }))
    if (pairs.length === 0) {
      alert('没有识别到可分析的歌词行')
      return
    }
    if (!providerId) {
      setNeedConfig(true)
      return
    }
    // Persist in_progress so the library list shows a spinner too.
    invoke('set_song_status', { songId: songInfo.id, status: 'in_progress' }).catch(() => {})
    await analyzeSong({ songId: songInfo.id, baseUrl, model, providerId, pairs })
    const s = useAnalysisStore.getState()
    if (s.error == null) {
      setDone(true)
      invoke('set_song_status', { songId: songInfo.id, status: 'succeeded' }).catch(() => {})
    } else {
      invoke('set_song_status', { songId: songInfo.id, status: 'failed', error: s.error }).catch(() => {})
    }
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <Link to="/" className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 13 }}>
          ← 返回歌曲库
        </Link>
      </div>

      <h1>{song.title}</h1>
      {song.artist && <p className="page-sub">{song.artist}</p>}

      <div className="glass-panel" style={{ padding: 20, marginBottom: 16 }}>
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, color: 'var(--text-primary)', lineHeight: 1.8 }}>
          {song.lyrics}
        </pre>
      </div>

      <div className="glass-panel" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>分析歌词</h3>

        {needConfig ? (
          <Notice kind="err">
            尚未保存有效的模型配置。请先到{' '}
            <Link to="/settings" style={{ color: 'var(--accent)' }}>模型设置</Link>{' '}
            填写并保存 Base URL / API Key / 模型。
          </Notice>
        ) : (
          <Notice kind="info">将使用已保存的配置：{baseUrl} · {model}</Notice>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
          <button className="btn" disabled={analyzing || needConfig} onClick={handleAnalyze} style={{ padding: '10px 24px', fontSize: 15 }}>
            {analyzing ? <Spinner label="分析中…" /> : '开始分析'}
          </button>
          {done && !analysisError && (
            <>
              <Link to={`/workspace/${songInfo.id}`} className="btn" style={{ padding: '10px 24px', fontSize: 15 }}>
                查看工作台 →
              </Link>
              <Link to={`/export/${songInfo.id}`} className="btn btn-ghost" style={{ padding: '10px 24px', fontSize: 15 }}>
                导出学习页
              </Link>
            </>
          )}
        </div>
      </div>

      <AnalysisProgress />
    </div>
  )
}
