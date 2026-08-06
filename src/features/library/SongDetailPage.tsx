import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useParams } from 'react-router-dom'
import { AnalysisProgress } from '../lyrics/analysis/AnalysisProgress'
import { useAnalysisStore } from '../lyrics/analysis/analysis-store'
import { useProviderStore } from '../settings/provider-store'
import { extractLyricPairs } from '../lyrics/import/prepare-lyrics'
import type { SourceLanguage } from '@lyriclingo/contracts'

interface SongDetail {
  id: string
  title: string
  artist: string
  language: string
  lyrics: string
  lyricsRaw?: string | null
}

export function SongDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [song, setSong] = useState<SongDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [noProvider, setNoProvider] = useState(false)
  const analyzeSong = useAnalysisStore((s) => s.analyzeSong)
  const analyzing = useAnalysisStore((s) => s.analyzing)
  const loadActiveProvider = useProviderStore((s) => s.loadActiveProvider)
  const providerId = useProviderStore((s) => s.providerId)
  const baseUrl = useProviderStore((s) => s.baseUrl)
  const model = useProviderStore((s) => s.model)

  useEffect(() => {
    if (id) {
      invoke<SongDetail>('get_song', { id }).then(setSong).catch((e) => setError(String(e)))
    }
    loadActiveProvider().then((p) => setNoProvider(!p))
  }, [id, loadActiveProvider])

  if (!song) return <p style={{ padding: 24 }}>{error ?? '加载中…'}</p>
  const songInfo = song

  async function handleAnalyze() {
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
      alert('请先到「模型设置」保存 API Key 与模型配置')
      return
    }
    await analyzeSong({ songId: songInfo.id, baseUrl, model, providerId, pairs })
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <h1>{song.title}</h1>
      {song.artist && <p style={{ color: '#888' }}>{song.artist}</p>}
      <pre style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 12, borderRadius: 8 }}>
        {song.lyrics}
      </pre>

      <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
        <h3>分析歌词</h3>
        {noProvider ? (
          <p style={{ color: '#a60', marginBottom: 12 }}>
            尚未保存模型配置。请先到「模型设置」填写并保存 Base URL / API Key / 模型。
          </p>
        ) : (
          <p style={{ color: '#666', marginBottom: 12 }}>
            将使用已保存的配置：{baseUrl} · {model}
          </p>
        )}
        <button
          disabled={analyzing || noProvider}
          onClick={handleAnalyze}
          style={{ padding: '10px 20px' }}
        >
          {analyzing ? '分析中…' : '开始分析'}
        </button>
      </div>

      <AnalysisProgress />
    </div>
  )
}
