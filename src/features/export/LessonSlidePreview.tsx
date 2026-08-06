import { computeLayout } from './layout'
import { POS_LABELS } from './lesson-slide'
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
  background?: string
  backgroundOpacity?: number
}

/**
 * A 16:9 lesson slide preview rendered from the same domain model used for
 * PPTX export. An optional background image fills the slide using cover
 * behavior (centered, aspect-ratio-safe) with adjustable opacity.
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
  background,
  backgroundOpacity = 100,
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
        background: '#f7f5f0',
        border: '1px solid var(--border-soft)',
        borderRadius: 12,
        overflow: 'hidden',
        fontFamily: 'system-ui, "Microsoft YaHei", "Hiragino Sans", sans-serif',
      }}
    >
      {/* Background image layer (cover, adjustable opacity) */}
      {background && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${background})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: backgroundOpacity / 100,
          }}
        />
      )}
      {/* Title */}
      {showTitle && (
        <div
          style={{
            position: 'absolute',
            left: 40,
            right: 40,
            top: 24,
            fontSize: 20,
            fontWeight: 700,
            textAlign: 'center',
            color: '#2c2a26',
            textShadow: background ? '0 1px 4px rgba(255,255,255,0.9)' : undefined,
          }}
        >
          {songTitle}
          {artist && <span style={{ fontWeight: 400, color: '#555', fontSize: 14, marginLeft: 8 }}>{artist}</span>}
        </div>
      )}

      {/* Central lyric card */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 420,
          maxHeight: 250,
          background: 'rgba(255,255,255,0.92)',
          borderRadius: 14,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          border: '1px solid #e8e4da',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 24px',
          textAlign: 'center',
          zIndex: 2,
          overflow: 'hidden',
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 700, color: '#2c2a26', lineHeight: 1.6 }}>{line.text}</div>
        {line.readingText && (
          <div style={{ fontSize: 12, color: '#8a8478', marginTop: 4 }}>{line.readingText}</div>
        )}
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px dashed #ddd6ca',
            fontSize: 15,
            color: '#5c574e',
            width: '100%',
          }}
        >
          {line.translation}
        </div>
      </div>

      {/* Orbiting word cards */}
      {layout.tokenRects.map(({ token, rect }, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            ...rect,
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 10,
            padding: 8,
            border: `1.5px solid ${token.confirmed ? '#d8d3c8' : '#e8a100'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            fontSize: 12,
            color: '#2c2a26',
            zIndex: 1,
            overflow: 'hidden',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13 }}>
            {token.surface}
            <span style={{ fontSize: 10, color: '#8a8478', marginLeft: 4 }}>
              {POS_LABELS[token.pos] ?? token.pos}
            </span>
          </div>
          {showReading && token.reading && <div style={{ color: '#8a8478', fontSize: 10 }}>{token.reading}</div>}
          <div style={{ marginTop: 2 }}>
            <strong>{token.baseForm}</strong>
            {showConjugation && token.conjugation && (
              <span style={{ color: '#a65', fontSize: 10, marginLeft: 4 }}>{token.conjugation}</span>
            )}
          </div>
          <div style={{ marginTop: 2, color: '#5c574e' }}>{token.meaning}</div>
        </div>
      ))}

      {showPageNumber && (
        <div style={{ position: 'absolute', bottom: 8, right: 16, fontSize: 12, color: '#8a8478' }}>
          {pageNumber} / {totalPages}
        </div>
      )}
    </div>
  )
}
