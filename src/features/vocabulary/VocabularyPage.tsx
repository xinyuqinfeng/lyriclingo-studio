import { useEffect } from 'react'
import { useVocabularyStore } from './vocabulary-store'
import { invoke } from '@tauri-apps/api/core'

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
    <div className="page">
      <h1>生词本</h1>
      <p className="page-sub">收藏的单词会自动汇总到这里</p>

      <div className="glass-panel" style={{ padding: 14, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <select
          className="input"
          value={filters.language ?? ''}
          onChange={(e) => setFilters({ ...filters, language: e.target.value || undefined })}
          style={{ minWidth: 110 }}
        >
          <option value="">全部语言</option>
          <option value="ja">日语</option>
          <option value="en">英语</option>
          <option value="ko">韩语</option>
        </select>
        <input
          className="input"
          placeholder="搜索词或释义…"
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={{ flex: 1, minWidth: 160 }}
        />
        <select
          className="input"
          value={filters.pos ?? ''}
          onChange={(e) => setFilters({ ...filters, pos: e.target.value || undefined })}
        >
          <option value="">全部词性</option>
          {Object.entries(POS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={filters.mastered === undefined ? '' : filters.mastered ? 'mastered' : 'not'}
          onChange={(e) => {
            const v = e.target.value
            setFilters({ ...filters, mastered: v === '' ? undefined : v === 'mastered' })
          }}
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
        <table className="glass-panel" style={{ width: '100%', borderCollapse: 'collapse', padding: 8 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-soft)' }}>
              <th style={{ padding: 8 }}>词</th>
              <th style={{ padding: 8 }}>词性</th>
              <th style={{ padding: 8 }}>释义</th>
              <th style={{ padding: 8 }}>状态</th>
              <th style={{ padding: 8 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
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
                    <span style={{ color: 'var(--success)' }}>已掌握</span>
                  ) : (
                    <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 13 }} onClick={() => setMastered(e.id, true)}>
                      标记掌握
                    </button>
                  )}
                </td>
                <td style={{ padding: 8 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '3px 10px', fontSize: 13, marginRight: 6 }}
                    onClick={() => invoke('enqueue_review', { vocabularyId: e.id })}
                  >
                    加入复习
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '3px 10px', fontSize: 13 }}
                    onClick={() => {
                      if (confirm(`从生词本移除「${e.baseForm}」？`)) unfavorite(e.id)
                    }}
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
