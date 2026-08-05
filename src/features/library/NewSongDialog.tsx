import { useState } from 'react'
import { parseLyrics } from '../lyrics/import/parse-lyrics'
import { detectLanguage } from '../lyrics/import/detect-language'
import { invoke } from '@tauri-apps/api/core'

interface Props {
  onCreated: (songId: string) => void
}

export function NewSongDialog({ onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [language, setLanguage] = useState<string>('auto')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function handleLyricsChange(v: string) {
    setLyrics(v)
    try {
      const detection = detectLanguage(v)
      if (detection.confident) {
        setLanguage(detection.language)
      }
    } catch {
      // ignore
    }
  }

  async function submit() {
    setError(null)
    try {
      parseLyrics(lyrics) // throws if empty
      setSaving(true)
      const result = await invoke<{ song: { id: string } }>('create_song', {
        input: { title, artist, language, lyrics },
      })
      setSaving(false)
      onCreated(result.song.id)
    } catch (e) {
      setSaving(false)
      setError(String(e))
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <h2>导入新歌曲</h2>
      {error && (
        <div style={{ color: '#c00', background: '#fdd', padding: 8, borderRadius: 4, marginBottom: 12 }}>
          {error}
        </div>
      )}
      <label style={{ display: 'block', marginBottom: 12 }}>
        歌名 *
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: '100%', padding: 8, marginTop: 4 }}
        />
      </label>
      <label style={{ display: 'block', marginBottom: 12 }}>
        歌手
        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          style={{ width: '100%', padding: 8, marginTop: 4 }}
        />
      </label>
      <label style={{ display: 'block', marginBottom: 12 }}>
        语言
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{ width: '100%', padding: 8, marginTop: 4 }}
        >
          <option value="auto">自动检测</option>
          <option value="ja">日语</option>
          <option value="en">英语</option>
          <option value="ko">韩语</option>
        </select>
      </label>
      <label style={{ display: 'block', marginBottom: 12 }}>
        歌词 *（粘贴原文，每行一句）
        <textarea
          value={lyrics}
          onChange={(e) => handleLyricsChange(e.target.value)}
          rows={12}
          placeholder={'星が降る夜に\nあなたの声が聞こえた'}
          style={{ width: '100%', padding: 8, marginTop: 4, fontFamily: 'monospace' }}
        />
      </label>
      <button onClick={submit} disabled={saving} style={{ padding: '10px 20px' }}>
        {saving ? '保存中…' : '导入歌曲'}
      </button>
    </div>
  )
}
