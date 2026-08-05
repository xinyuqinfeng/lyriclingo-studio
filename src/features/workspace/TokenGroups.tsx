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
  other: '其他',
}

export function TokenCard({
  token,
  onFavorite,
  favorited,
}: {
  token: WorkspaceToken
  onFavorite: () => void
  favorited: boolean
}) {
  return (
    <div
      style={{
        border: `2px solid ${token.confirmed ? '#ccc' : '#e8a100'}`,
        borderRadius: 8,
        padding: 10,
        minWidth: 140,
        background: token.confirmed ? '#fff' : '#fff8e1',
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 600 }}>
        {token.surface}
        <span style={{ fontSize: 12, color: '#888', marginLeft: 6 }}>{POS_LABEL[token.pos] ?? token.pos}</span>
        {!token.confirmed && <span style={{ fontSize: 11, color: '#e8a100', marginLeft: 6 }}>待确认</span>}
      </div>
      {token.reading && <div style={{ color: '#666', fontSize: 13 }}>{token.reading}</div>}
      <div style={{ color: '#333', marginTop: 4 }}>
        <strong>{token.baseForm}</strong>
        {token.conjugation && (
          <span style={{ color: '#a00', fontSize: 12, marginLeft: 6 }}>{token.conjugation}</span>
        )}
      </div>
      <div style={{ color: '#333', marginTop: 4 }}>{token.meaning}</div>
      {token.contextualMeaning && token.contextualMeaning !== token.meaning && (
        <div style={{ color: '#006', fontSize: 13, marginTop: 2 }}>语境：{token.contextualMeaning}</div>
      )}
      <button
        onClick={onFavorite}
        disabled={favorited}
        style={{
          marginTop: 8,
          padding: '3px 10px',
          background: favorited ? '#e6e6e6' : '#ffecb3',
          border: '1px solid #d8a100',
          borderRadius: 4,
          cursor: favorited ? 'default' : 'pointer',
          fontSize: 12,
        }}
      >
        {favorited ? '已收藏 ✓' : '收藏到生词本'}
      </button>
    </div>
  )
}

export function TokenGroups({
  line,
  onFavorite,
  favorited,
}: {
  line: WorkspaceLine
  onFavorite: (token: WorkspaceToken, index: number) => void
  favorited: (token: WorkspaceToken, index: number) => boolean
}) {
  const groups: Record<string, WorkspaceToken[]> = {}
  for (const t of line.tokens) {
    ;(groups[t.pos] ??= []).push(t)
  }
  const order = ['verb', 'noun', 'adjective', 'adverb', 'particle', 'other']
  const sortedKeys = [...Object.keys(groups)].sort(
    (a, b) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)),
  )
  return (
    <div>
      {sortedKeys.map((pos) => (
        <div key={pos} style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6, color: '#555' }}>
            {POS_LABEL[pos] ?? pos}（{groups[pos].length}）
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {groups[pos].map((t, i) => (
              <TokenCard key={i} token={t} onFavorite={() => onFavorite(t, i)} favorited={favorited(t, i)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
