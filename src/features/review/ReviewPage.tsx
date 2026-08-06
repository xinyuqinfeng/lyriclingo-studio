import { useEffect } from 'react'
import { useReviewStore } from './review-store'
import type { Rating } from './sm2'

export function ReviewPage() {
  const { cards, currentIndex, revealed, stats, loading, error, load, reveal, rate, reset } =
    useReviewStore()

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <p style={{ padding: 24 }}>加载中…</p>
  if (error) return <p style={{ padding: 24, color: '#c00' }}>{error}</p>

  const card = cards[currentIndex]

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1>每日复习</h1>
          <p className="page-sub">
            今日待复习：{stats.todayDue} · 已掌握：{stats.mastered}
          </p>
        </div>
      </div>

      {!card ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <p>今天没有待复习的单词！</p>
          <p style={{ fontSize: 13 }}>在歌词工作台收藏单词后，会自动加入复习队列。</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            第 {currentIndex + 1} / {cards.length} 张卡片
          </div>

          {card.cardType === 'zh-to-word' ? (
            <>
              <div style={{ fontSize: 24, marginBottom: 8 }}>看中文，回忆原词</div>
              <div style={{ fontSize: 28, marginBottom: 24 }}>{card.meaning}</div>
            </>
          ) : card.cardType === 'word-to-zh' ? (
            <>
              <div style={{ fontSize: 24, marginBottom: 8 }}>看原词，回忆中文</div>
              <div style={{ fontSize: 28, marginBottom: 24 }}>
                {card.baseForm}
                {card.baseReading && (
                  <span style={{ fontSize: 16, color: '#888', marginLeft: 8 }}>{card.baseReading}</span>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 24, marginBottom: 8 }}>回忆释义</div>
              <div style={{ fontSize: 28, marginBottom: 24 }}>{card.baseForm}</div>
            </>
          )}

          {!revealed ? (
            <button className="btn" onClick={reveal} style={{ padding: '12px 32px', fontSize: 16 }}>
              显示答案
            </button>
          ) : (
            <div style={{ fontSize: 24, marginBottom: 24, color: 'var(--success)' }}>
              {card.baseForm}
              {card.baseReading && (
                <span style={{ fontSize: 16, color: 'var(--text-muted)', marginLeft: 8 }}>{card.baseReading}</span>
              )}
            </div>
          )}

          {revealed && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              {(
                [
                  ['again', '忘记'],
                  ['hard', '困难'],
                  ['good', '记得'],
                  ['easy', '简单'],
                ] as [Rating, string][]
              ).map(([r, label]) => (
                <button key={r} className="btn" onClick={() => rate(r)} style={{ padding: '10px 20px' }}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {cards.length > 0 && (
        <button className="btn btn-ghost" onClick={reset} style={{ marginTop: 16 }}>
          重新开始本组
        </button>
      )}
    </div>
  )
}
