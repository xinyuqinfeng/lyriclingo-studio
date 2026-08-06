import { useState } from 'react'
import { parseLyrics } from '../lyrics/import/parse-lyrics'
import { detectLanguage } from '../lyrics/import/detect-language'
import { extractLyricPairs } from '../lyrics/import/prepare-lyrics'
import { invoke } from '@tauri-apps/api/core'

interface Props {
  onCreated: (songId: string) => void
}

function extractMeta(lyrics: string, key: string): string | null {
  const re = new RegExp(`^${key}\\s*[：:．.]?\\s*(.+)$`, 'im')
  const m = lyrics.match(re)
  return m ? m[1].trim() : null
}

export function NewSongDialog({ onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [language, setLanguage] = useState<string>('auto')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  function handleLyricsChange(v: string) {
    setLyrics(v)
    try {
      const detection = detectLanguage(v)
      if (detection.confident) {
        setLanguage(detection.language)
      }
      if (!artist) {
        const a = extractMeta(v, '作词|作詞|演唱|singer|artist')
        if (a) setArtist(a)
      }
    } catch {
      // ignore
    }
  }

  async function submit() {
    setError(null)
    setInfo(null)
    try {
      parseLyrics(lyrics) // throws if empty
      const detected: string = language === 'auto' ? detectLanguage(lyrics).language : language
      const pairs = extractLyricPairs(lyrics, detected as Parameters<typeof extractLyricPairs>[1])
      if (pairs.length === 0) {
        setError('没有识别到源语言歌词行，请检查语言设置')
        return
      }
      const cleaned = pairs.map((p) => p.source).join('\n')
      setInfo(
        `已识别 ${pairs.length} 句源语言歌词${pairs.filter((p) => p.referenceTranslation).length > 0 ? '，其中带官方翻译参考' : ''}`,
      )
      setSaving(true)
      const result = await invoke<{ song: { id: string } }>('create_song', {
        input: { title, artist, language: detected, lyrics: cleaned, lyricsRaw: lyrics },
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
      {info && (
        <div style={{ color: '#060', background: '#dfd', padding: 8, borderRadius: 4, marginBottom: 12 }}>
          {info}
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
        歌词 *（支持纯原文或网易云等平台的原文+翻译混合格式）
        <textarea
          value={lyrics}
          onChange={(e) => handleLyricsChange(e.target.value)}
          rows={12}
          placeholder={'作词 : 某某\n眩しく光る太陽が目に染みる決意の朝に\n在眩目的阳光下，满怀决心的早晨'}
          style={{ width: '100%', padding: 8, marginTop: 4, fontFamily: 'monospace' }}
        />
      </label>
      <button onClick={submit} disabled={saving} style={{ padding: '10px 20px' }}>
        {saving ? '保存中…' : '导入歌曲'}
      </button>
    </div>
  )
}
