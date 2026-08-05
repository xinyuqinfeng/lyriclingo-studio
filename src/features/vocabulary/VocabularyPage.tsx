import { useEffect } from 'react'
import { useVocabularyStore } from './vocabulary-store'

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

export function VocabularyPage() {
  const { entries, loading, error, load, setFilters, setMastered, unfavorite, filters } =
    useVocabularyStore()

  useEffect(() => {
    load()
  }, [load])

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 24 }}>
      <h1>生词本</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="搜索词或释义…"
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={{ padding: 8, flex: 1, minWidth: 200 }}
        />
        <select
          value={filters.pos ?? ''}
          onChange={(e) => setFilters({ ...filters, pos: e.target.value || undefined })}
          style={{ padding: 8 }}
        >
          <option value="">全部词性</option>
          {Object.entries(POS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={filters.mastered === undefined ? '' : filters.mastered ? 'mastered' : 'not'}
          onChange={(e) => {
            const v = e.target.value
            setFilters({ ...filters, mastered: v === '' ? undefined : v === 'mastered' })
          }}
          style={{ padding: 8 }}
        >
          <option value="">全部状态</option>
          <option value="not">未掌握</option>
          <option value="mastered">已掌握</option>
        </select>
      </div>

      {error && (
        <div style={{ color: '#c00', background: '#fdd', padding: 8, borderRadius: 4, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>加载中…</p>
      ) : entries.length === 0 ? (
        <p style={{ color: '#888' }}>暂无生词。在歌词工作台中点击「收藏」可加入生词本。</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: 8 }}>词</th>
              <th style={{ padding: 8 }}>词性</th>
              <th style={{ padding: 8 }}>释义</th>
              <th style={{ padding: 8 }}>状态</th>
              <th style={{ padding: 8 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>
                  <strong>{e.baseForm}</strong>
                  {e.baseReading && (
                    <span style={{ color: '#888', marginLeft: 6, fontSize: 13 }}>{e.baseReading}</span>
                  )}
                </td>
                <td style={{ padding: 8 }}>{POS_LABEL[e.pos] ?? e.pos}</td>
                <td style={{ padding: 8 }}>{e.meaning}</td>
                <td style={{ padding: 8 }}>
                  {e.mastered ? (
                    <span style={{ color: '#060' }}>已掌握</span>
                  ) : (
                    <button onClick={() => setMastered(e.id, true)} style={{ padding: '2px 8px' }}>
                      标记掌握
                    </button>
                  )}
                </td>
                <td style={{ padding: 8 }}>
                  <button
                    onClick={() => {
                      if (confirm(`从生词本移除「${e.baseForm}」？`)) unfavorite(e.id)
                    }}
                    style={{ padding: '2px 8px', color: '#c00' }}
                  >
                    移除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
