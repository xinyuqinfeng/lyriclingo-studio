import { useState } from 'react'
import type { SourceLanguage } from '@lyriclingo/contracts'
import { parseLyrics } from '../lyrics/import/parse-lyrics'
import { prepareSongLyrics } from '../lyrics/import/prepare-lyrics'
import { detectLanguage } from '../lyrics/import/detect-language'
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

  const detectedLanguage: SourceLanguage =
    language === 'auto' ? detectLanguage(lyrics).language : (language as SourceLanguage)

  function handleLyricsChange(v: string) {
    setLyrics(v)
    try {
      const detection = detectLanguage(v)
      if (detection.confident) {
        setLanguage(detection.language)
      }
      // Auto-fill artist from metadata if the field is still empty.
      if (!artist) {
        const a = extractMeta(v, '作词|作詞|演唱|singer|artist')
        if (a) setArtist(a)
      }
      if (!title) {
        // no reliable auto-title; leave for the user
      }
    } catch {
      // ignore
    }
  }

  async function submit() {
    setError(null)
    setInfo(null)
    let cleaned = lyrics
    try {
      parseLyrics(lyrics) // throws if empty
      const prepared = prepareSongLyrics(lyrics, detectedLanguage)
      cleaned = prepared.lines
        .map((l) => (l.isSectionBreak ? '' : l.text))
        .join('\n')
        .trim()
      if (cleaned === '') {
        setError('过滤后没有可分析的歌词行，请确认语言设置正确')
        return
      }
      if (prepared.skippedMetadata + prepared.skippedTranslations > 0) {
        setInfo(
          `已自动过滤 ${prepared.skippedMetadata} 行元信息、${prepared.skippedTranslations} 行翻译/无关行，保留 ${prepared.lines.filter((l) => !l.isSectionBreak).length} 行歌词`,
        )
      }
      setSaving(true)
      const result = await invoke<{ song: { id: string } }>('create_song', {
        input: { title, artist, language: detectedLanguage, lyrics: cleaned },
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
        歌词 *（可粘贴网易云等平台的原文+翻译混合格式，会自动过滤元信息与翻译行）
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
