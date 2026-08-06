import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useParams } from 'react-router-dom'
import { AnalysisProgress } from '../lyrics/analysis/AnalysisProgress'
import { useAnalysisStore } from '../lyrics/analysis/analysis-store'
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
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const analyzeSong = useAnalysisStore((s) => s.analyzeSong)
  const analyzing = useAnalysisStore((s) => s.analyzing)

  useEffect(() => {
    if (id) {
      invoke<SongDetail>('get_song', { id }).then(setSong).catch((e) => setError(String(e)))
    }
  }, [id])

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
    await analyzeSong({ songId: songInfo.id, baseUrl, model, pairs })
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
        <label style={{ display: 'block', marginBottom: 8 }}>
          Base URL
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.deepseek.com/v1"
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          模型
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="deepseek-v4-flash"
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <button
          disabled={analyzing || !baseUrl.trim() || !model.trim()}
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
