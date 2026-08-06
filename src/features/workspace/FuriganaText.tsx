import type { WorkspaceToken } from '../workspace/workspace-store'

/**
 * Renders a lyric line with whole-token furigana: each token's reading (kana)
 * is placed above the entire token using a single <ruby>/<rt>. This is the
 * standard annotation style and avoids the unreliable per-character splitting
 * that some models produce (e.g. placing the whole reading on the first kanji).
 *
 * Tokens whose surface is already all-kana (no kanji) get no annotation.
 * When `highlightIndex` matches a token's position, that token is highlighted
 * (used by hovering a word card in the workspace).
 */
export function FuriganaText({
  text,
  tokens,
  fontSize = 28,
  highlightIndex,
}: {
  text: string
  tokens: WorkspaceToken[]
  fontSize?: number
  highlightIndex?: number | null
}) {
  const items = buildSegments(text, tokens)

  return (
    <span style={{ fontSize, lineHeight: 2 }}>
      {items.map((part, i) => {
        if (part.type === 'plain') {
          return (
            <span
              key={i}
              style={
                part.tokenIndex === highlightIndex
                  ? { background: 'var(--accent-soft)', borderRadius: 6, padding: '0 2px', transition: 'background 0.15s' }
                  : undefined
              }
            >
              {part.text}
            </span>
          )
        }
        const active = part.tokenIndex === highlightIndex
        return (
          <ruby
            key={i}
            style={{
              rubyAlign: 'center',
              background: active ? 'var(--accent-soft)' : 'transparent',
              borderRadius: 6,
              padding: '0 3px',
              transition: 'background 0.15s',
            }}
          >
            {part.surface}
            <rt>{part.reading}</rt>
          </ruby>
        )
      })}
    </span>
  )
}

interface Segment {
  type: 'plain' | 'token'
  text?: string
  surface?: string
  reading?: string
  tokenIndex?: number
}

function hasKanji(s: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(s)
}

function buildSegments(text: string, tokens: WorkspaceToken[]): Segment[] {
  const segments: Segment[] = []
  let cursor = 0
  for (let ti = 0; ti < tokens.length; ti++) {
    const t = tokens[ti]
    let idx = t.start !== undefined && t.start >= cursor && t.start < text.length ? t.start : -1
    if (idx < 0 || text.slice(idx, idx + t.surface.length) !== t.surface) {
      idx = text.indexOf(t.surface, cursor)
    }
    if (idx < 0) continue
    if (idx > cursor) {
      segments.push({ type: 'plain', text: text.slice(cursor, idx) })
    }

    const reading = t.reading ?? ''
    const annotated = hasKanji(t.surface) && reading !== '' && reading !== t.surface
    if (annotated) {
      segments.push({ type: 'token', surface: t.surface, reading, tokenIndex: ti })
    } else {
      segments.push({ type: 'plain', text: t.surface, tokenIndex: ti })
    }
    cursor = idx + t.surface.length
  }
  if (cursor < text.length) {
    segments.push({ type: 'plain', text: text.slice(cursor) })
  }
  return segments
}
