import { useEffect } from 'react'
import { useLibraryStore } from './library-store'
import { NewSongDialog } from './NewSongDialog'
import { useState } from 'react'

export function SongLibraryPage() {
  const { songs, loading, error, loadSongs, deleteSong } = useLibraryStore()
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    loadSongs()
  }, [loadSongs])

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>歌曲库</h1>
        <button onClick={() => setShowNew(true)} style={{ padding: '8px 16px' }}>
          + 导入歌曲
        </button>
      </div>

      {error && (
        <div style={{ color: '#c00', background: '#fdd', padding: 8, borderRadius: 4, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {showNew && (
        <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <NewSongDialog onCreated={() => setShowNew(false)} />
        </div>
      )}

      {loading ? (
        <p>加载中…</p>
      ) : songs.length === 0 ? (
        <p style={{ color: '#888' }}>还没有歌曲。点击“导入歌曲”开始。</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {songs.map((s) => (
            <li
              key={s.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                borderBottom: '1px solid #eee',
              }}
            >
              <div>
                <strong>{s.title}</strong>
                {s.artist && <span style={{ color: '#888' }}> — {s.artist}</span>}
                <span style={{ color: '#aaa', marginLeft: 8 }}>{s.language}</span>
              </div>
              <button
                onClick={() => {
                  if (confirm(`删除歌曲「${s.title}」？`)) deleteSong(s.id)
                }}
                style={{ padding: '4px 10px', color: '#c00' }}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
