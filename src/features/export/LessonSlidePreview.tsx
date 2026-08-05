import { computeLayout } from './layout'
import { POS_COLORS, POS_LABELS } from './lesson-slide'
import type { LessonSlideLineInput } from './lesson-slide'

interface Props {
  songTitle: string
  artist: string
  line: LessonSlideLineInput
  pageNumber: number
  totalPages: number
  showTitle: boolean
  showReading: boolean
  showConjugation: boolean
  showPageNumber: boolean
}

/**
 * A 16:9 lesson slide preview rendered from the same domain model used for
 * PPTX and PDF export.
 */
export function LessonSlidePreview({
  songTitle,
  artist,
  line,
  pageNumber,
  totalPages,
  showTitle,
  showReading,
  showConjugation,
  showPageNumber,
}: Props) {
  const layout = computeLayout(line.tokens, {
    hasReading: !!line.readingText,
    showTitle,
    showConjugation,
    showReading,
  })

  return (
    <div
      style={{
        width: 960,
        height: 540,
        position: 'relative',
        background: '#fff',
        border: '1px solid #ccc',
        borderRadius: 8,
        overflow: 'hidden',
        fontFamily: 'system-ui, "Microsoft YaHei", "Hiragino Sans", sans-serif',
      }}
    >
      {showTitle && (
        <div style={{ position: 'absolute', ...layout.titleRect, fontSize: 20, fontWeight: 600 }}>
          {songTitle}
          {artist && <span style={{ fontWeight: 400, color: '#888', fontSize: 14, marginLeft: 8 }}>{artist}</span>}
        </div>
      )}

      {/* Lyric */}
      <div
        style={{
          position: 'absolute',
          ...layout.lyricRect,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 30,
          fontWeight: 600,
          textAlign: 'center',
        }}
      >
        {line.text}
      </div>

      {/* Reading */}
      {line.readingText && (
        <div
          style={{
            position: 'absolute',
            ...layout.readingRect,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            color: '#888',
            textAlign: 'center',
          }}
        >
          {line.readingText}
        </div>
      )}

      {/* Translation */}
      <div
        style={{
          position: 'absolute',
          ...layout.translationRect,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          color: '#333',
          textAlign: 'center',
          borderTop: '1px dashed #ddd',
        }}
      >
        {line.translation}
      </div>

      {/* Token cards */}
      {layout.tokenRects.map(({ token, rect }, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            ...rect,
            background: POS_COLORS[token.pos] ?? '#eee',
            borderRadius: 8,
            padding: 10,
            border: `2px solid ${token.confirmed ? '#ccc' : '#e8a100'}`,
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            {token.surface}
            <span style={{ fontSize: 11, color: '#666', marginLeft: 6 }}>
              {POS_LABELS[token.pos] ?? token.pos}
            </span>
          </div>
          {showReading && token.reading && (
            <div style={{ color: '#888', fontSize: 12 }}>{token.reading}</div>
          )}
          <div style={{ marginTop: 2 }}>
            <strong>{token.baseForm}</strong>
            {showConjugation && token.conjugation && (
              <span style={{ color: '#a00', fontSize: 11, marginLeft: 6 }}>{token.conjugation}</span>
            )}
          </div>
          <div style={{ marginTop: 2, color: '#333' }}>{token.meaning}</div>
        </div>
      ))}

      {showPageNumber && (
        <div style={{ position: 'absolute', bottom: 8, right: 16, fontSize: 12, color: '#aaa' }}>
          {pageNumber} / {totalPages}
        </div>
      )}
    </div>
  )
}
