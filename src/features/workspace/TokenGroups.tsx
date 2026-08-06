import { useState } from 'react'
import type { WorkspaceLine, WorkspaceToken } from './workspace-store'

const POS_LABEL: Record<string, string> = {
  noun: '名词',
  verb: '动词',
  adjective: '形容词',
  adverb: '副词',
  particle: '助词',
  pronoun: '代词',
  article: '冠词',
  conjunction: '连词',
  interjection: '感叹词',
  preposition: '介词',
  determiner: '限定词',
  auxiliary: '助动词',
  other: '其他',
}

const POS_ORDER = ['verb', 'noun', 'adjective', 'adverb', 'particle', 'other']

export function TokenCard({
  token,
  onFavorite,
  favorited,
  onHover,
}: {
  token: WorkspaceToken
  onFavorite: () => void
  favorited: boolean
  onHover: (hovering: boolean) => void
}) {
  return (
    <div
      className="glass-panel"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        borderRadius: 12,
        padding: 12,
        minWidth: 150,
        flex: '1 1 150px',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'default',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{token.surface}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 6 }}>
          {POS_LABEL[token.pos] ?? token.pos}
        </span>
        {!token.confirmed && <span style={{ fontSize: 11, color: 'var(--warning)' }}>待确认</span>}
      </div>
      {token.reading && <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{token.reading}</div>}
      <div style={{ color: 'var(--text-primary)', marginTop: 6 }}>
        <strong>{token.baseForm}</strong>
        {token.conjugation && (
          <span style={{ color: 'var(--danger)', fontSize: 12, marginLeft: 6 }}>{token.conjugation}</span>
        )}
      </div>
      <div style={{ color: 'var(--text-secondary)', marginTop: 4, flex: 1 }}>{token.meaning}</div>
      {token.contextualMeaning && token.contextualMeaning !== token.meaning && (
        <div style={{ color: 'var(--accent)', fontSize: 12, marginTop: 2 }}>语境：{token.contextualMeaning}</div>
      )}
      <button
        className={favorited ? 'btn btn-ghost' : 'btn'}
        onClick={onFavorite}
        disabled={favorited}
        style={{ marginTop: 10, padding: '4px 10px', fontSize: 12, alignSelf: 'flex-start' }}
      >
        {favorited ? '已收藏 ✓' : '收藏'}
      </button>
    </div>
  )
}

export function TokenGroups({
  line,
  onFavorite,
  favorited,
  onTokenHover,
}: {
  line: WorkspaceLine
  onFavorite: (token: WorkspaceToken, index: number) => void
  favorited: (token: WorkspaceToken, index: number) => boolean
  onTokenHover: (index: number | null) => void
}) {
  const [groupByPos, setGroupByPos] = useState(false)

  // Lyric order by default (index = position in line.tokens).
  const tokensWithIndex = line.tokens.map((t, i) => ({ token: t, index: i }))

  if (!groupByPos) {
    return (
      <div>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>按歌词顺序</span>
          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setGroupByPos(true)}>
            按词性排序
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {tokensWithIndex.map(({ token, index }) => (
            <TokenCard
              key={index}
              token={token}
              onFavorite={() => onFavorite(token, index)}
              favorited={favorited(token, index)}
              onHover={(h) => onTokenHover(h ? index : null)}
            />
          ))}
        </div>
      </div>
    )
  }

  // Group by POS (within each group, keep lyric order).
  const groups = new Map<string, { token: WorkspaceToken; index: number }[]>()
  for (const { token, index } of tokensWithIndex) {
    if (!groups.has(token.pos)) groups.set(token.pos, [])
    groups.get(token.pos)!.push({ token, index })
  }
  const sortedKeys = [...groups.keys()].sort(
    (a, b) => (POS_ORDER.indexOf(a) === -1 ? 99 : POS_ORDER.indexOf(a)) - (POS_ORDER.indexOf(b) === -1 ? 99 : POS_ORDER.indexOf(b)),
  )

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>按词性</span>
        <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setGroupByPos(false)}>
          按歌词顺序
        </button>
      </div>
      {sortedKeys.map((pos) => (
        <div key={pos} style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)', fontSize: 13 }}>
            {POS_LABEL[pos] ?? pos}（{groups.get(pos)!.length}）
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {groups.get(pos)!.map(({ token, index }) => (
              <TokenCard
                key={index}
                token={token}
                onFavorite={() => onFavorite(token, index)}
                favorited={favorited(token, index)}
                onHover={(h) => onTokenHover(h ? index : null)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
