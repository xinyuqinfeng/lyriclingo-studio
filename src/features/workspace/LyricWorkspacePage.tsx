import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspaceStore } from './workspace-store'
import { TokenGroups } from './TokenGroups'

export function LyricWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const { data, selectedIndex, loading, error, load, select } = useWorkspaceStore()

  useEffect(() => {
    if (id) load(id)
  }, [id, load])

  if (loading) return <p style={{ padding: 24 }}>加载中…</p>
  if (error) return <p style={{ padding: 24, color: '#c00' }}>{error}</p>
  if (!data) return <p style={{ padding: 24 }}>暂无数据</p>

  const line = data.lines[selectedIndex]
  if (!line) return <p style={{ padding: 24 }}>没有歌词行</p>

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
      {/* Left: line navigator */}
      <nav style={{ width: 200, borderRight: '1px solid #eee', overflowY: 'auto', padding: 12 }}>
        <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>{data.songTitle}</h3>
        {data.lines.map((l, i) => (
          <button
            key={l.line.id}
            onClick={() => select(i)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '6px 8px',
              border: 'none',
              background: i === selectedIndex ? '#e6f0ff' : 'transparent',
              borderRadius: 4,
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
      <section style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        <div style={{ fontSize: 20, lineHeight: 1.8 }}>
          {line.line.isSectionBreak ? (
            <span style={{ color: '#ccc' }}>（段落间隔）</span>
          ) : (
            <>
              {line.readingText && (
                <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>{line.readingText}</div>
              )}
              <div>{line.line.text}</div>
            </>
          )}
        </div>
        {line.translation && (
          <div style={{ marginTop: 12, fontSize: 16, color: '#222', borderTop: '1px solid #eee', paddingTop: 12 }}>
            {line.translation}
          </div>
        )}
        {line.grammarNotes && line.grammarNotes.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: '#555' }}>
            <strong>语法说明：</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
              {line.grammarNotes.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
        )}
        {line.uncertainty && line.uncertainty.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: '#a60' }}>
            <strong>待确认：</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
              {line.uncertainty.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </div>
        )}
        {line.model && line.generatedAt && (
          <div style={{ marginTop: 12, fontSize: 12, color: '#aaa' }}>
            模型：{line.model} · {line.generatedAt}
          </div>
        )}
      </section>

      {/* Right: token cards */}
      <aside style={{ width: 360, borderLeft: '1px solid #eee', overflowY: 'auto', padding: 16 }}>
        <h3 style={{ margin: '0 0 12px' }}>单词卡</h3>
        {line.tokens.length === 0 ? (
          <p style={{ color: '#888' }}>还没有分析结果。请先在歌曲详情页运行分析。</p>
        ) : (
          <TokenGroups line={line} />
        )}
      </aside>
    </div>
  )
}
