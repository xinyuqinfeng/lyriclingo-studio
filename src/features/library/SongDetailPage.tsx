import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useParams } from 'react-router-dom'
import { AnalysisProgress } from '../lyrics/analysis/AnalysisProgress'
import { useAnalysisStore } from '../lyrics/analysis/analysis-store'

interface SongDetail {
  id: string
  title: string
  artist: string
  language: string
  lyrics: string
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
            placeholder="https://api.openai.com/v1"
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          模型
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4o-mini"
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <button
          disabled={analyzing || !baseUrl.trim() || !model.trim()}
          onClick={() =>
            analyzeSong({ songId: song.id, baseUrl, model })
          }
          style={{ padding: '10px 20px' }}
        >
          {analyzing ? '分析中…' : '开始分析'}
        </button>
      </div>

      <AnalysisProgress />
    </div>
  )
}
