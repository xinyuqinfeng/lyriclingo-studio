import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspaceStore } from './workspace-store'
import type { WorkspaceToken } from './workspace-store'
import { TokenGroups } from './TokenGroups'
import { FuriganaText } from './FuriganaText'
import { invoke } from '@tauri-apps/api/core'

export function LyricWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const { data, selectedIndex, loading, error, load, select } = useWorkspaceStore()
  const [favoritedKeys, setFavoritedKeys] = useState<Set<string>>(new Set())
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null)

  useEffect(() => {
    if (id) load(id)
  }, [id, load])

  // Clear hover highlight when switching lines.
  useEffect(() => {
    setHighlightIndex(null)
  }, [selectedIndex])

  if (loading) return <p style={{ padding: 24 }}>加载中…</p>
  if (error) return <p style={{ padding: 24, color: 'var(--danger)' }}>{error}</p>
  if (!data) return <p style={{ padding: 24 }}>暂无数据</p>

  const line = data.lines[selectedIndex]
  if (!line) return <p style={{ padding: 24 }}>没有歌词行</p>

  async function handleFavorite(token: WorkspaceToken, index: number) {
    const key = `${line.line.id}-${index}`
    if (favoritedKeys.has(key)) return
    try {
      await invoke('favorite_token', {
        songId: data!.songId,
        lineId: line.line.id,
        tokenId: key,
        language: data!.language,
        baseForm: token.baseForm,
        baseReading: token.baseReading ?? null,
        meaning: token.meaning,
        pos: token.pos,
        surface: token.surface,
      })
      setFavoritedKeys((prev) => new Set(prev).add(key))
    } catch (e) {
      alert(String(e))
    }
  }

  function isFavorited(_token: WorkspaceToken, index: number) {
    return favoritedKeys.has(`${line.line.id}-${index}`)
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 61px)' }}>
      {/* Left: line navigator */}
      <nav className="glass-panel" style={{ width: 220, overflowY: 'auto', padding: 12, margin: 12, marginRight: 0, borderRadius: 14 }}>
        <h3 style={{ fontSize: 14, margin: '0 0 10px', color: 'var(--text-secondary)' }}>{data.songTitle}</h3>
        {data.lines.map((l, i) => (
          <button
            key={l.line.id}
            onClick={() => select(i)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '7px 10px',
              border: 'none',
              background: i === selectedIndex ? 'var(--accent-soft)' : 'transparent',
              color: i === selectedIndex ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              marginBottom: 2,
            }}
          >
            {l.line.isSectionBreak ? '· · ·' : l.line.text.slice(0, 24) || '(空)'}
          </button>
        ))}
      </nav>

      {/* Middle: line content */}
      <section style={{ flex: 1, padding: '24px 20px', overflowY: 'auto' }}>
        <div className="glass-panel" style={{ padding: '28px 32px', textAlign: 'center' }}>
          {line.line.isSectionBreak ? (
            <span style={{ color: 'var(--text-muted)' }}>（段落间隔）</span>
          ) : (
            <>
              <FuriganaText text={line.line.text} tokens={line.tokens} fontSize={30} highlightIndex={highlightIndex} />
            </>
          )}
          {line.translation && (
            <div
              style={{
                marginTop: 20,
                fontSize: 18,
                color: 'var(--text-primary)',
                borderTop: '1px dashed var(--border-soft)',
                paddingTop: 16,
              }}
            >
              {line.translation}
            </div>
          )}
        </div>

        {line.grammarNotes && line.grammarNotes.length > 0 && (
          <div className="glass-panel" style={{ marginTop: 16, padding: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>语法说明</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20, lineHeight: 1.8 }}>
              {line.grammarNotes.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
        )}
        {line.uncertainty && line.uncertainty.length > 0 && (
          <div className="glass-panel" style={{ marginTop: 12, padding: 16, fontSize: 13, color: 'var(--warning)' }}>
            <strong>待确认</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20, lineHeight: 1.8 }}>
              {line.uncertainty.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </div>
        )}
        {line.model && line.generatedAt && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            模型：{line.model} · {line.generatedAt}
          </div>
        )}
      </section>

      {/* Right: token cards */}
      <aside className="glass-panel" style={{ width: 380, overflowY: 'auto', padding: 16, margin: 12, marginLeft: 0, borderRadius: 14 }}>
        <h3 style={{ margin: '0 0 12px', color: 'var(--text-secondary)' }}>单词卡</h3>
        {line.tokens.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>还没有分析结果。</p>
        ) : (
          <TokenGroups
            line={line}
            onFavorite={(t, i) => handleFavorite(t, i)}
            favorited={(t, i) => isFavorited(t, i)}
            onTokenHover={setHighlightIndex}
          />
        )}
      </aside>
    </div>
  )
}
