import type { WorkspaceToken } from '../workspace/workspace-store'

const KANJI_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/

function isKanji(ch: string): boolean {
  return KANJI_RE.test(ch)
}

/**
 * Renders a lyric line with KTV-style furigana: readings (kana) shown above
 * each kanji character via standard <ruby>/<rt>. Uses per-character `readings`
 * when present; otherwise places the whole token reading above the token.
 *
 * Each token is rendered as ONE <ruby> element containing per-character
 * base + <rt> pairs, which keeps alignment consistent and avoids nesting.
 */
export function FuriganaText({
  text,
  tokens,
  fontSize = 28,
}: {
  text: string
  tokens: WorkspaceToken[]
  fontSize?: number
}) {
  if (!tokens || tokens.length === 0) {
    return <span style={{ fontSize }}>{text}</span>
  }

  const items = renderLine(text, tokens)

  return (
    <span style={{ fontSize, lineHeight: 2 }}>
      {items.map((part, i) => {
        if (part.type === 'plain') return <span key={i}>{part.text}</span>
        return (
          <ruby key={i} style={{ rubyAlign: 'center' }}>
            {part.chars!.map((c, j) =>
              c.reading ? (
                // eslint-disable-next-line react/jsx-key
                <span key={j}>
                  <ruby>
                    {c.char}
                    <rt>{c.reading}</rt>
                  </ruby>
                </span>
              ) : (
                <span key={j}>{c.char}</span>
              ),
            )}
          </ruby>
        )
      })}
    </span>
  )
}

interface Part {
  type: 'plain' | 'token'
  text?: string
  chars?: { char: string; reading?: string }[]
}

function renderLine(text: string, tokens: WorkspaceToken[]): Part[] {
  const parts: Part[] = []
  let cursor = 0
  for (const t of tokens) {
    let idx = t.start !== undefined && t.start >= cursor && t.start < text.length ? t.start : -1
    if (idx < 0 || text.slice(idx, idx + t.surface.length) !== t.surface) {
      idx = text.indexOf(t.surface, cursor)
    }
    if (idx < 0) continue
    if (idx > cursor) {
      parts.push({ type: 'plain', text: text.slice(cursor, idx) })
    }

    const readings = t.readings ?? []
    const perChar = t.surface.split('').map((ch, i) => {
      const r = readings[i]
      // Only annotate kanji characters (not kana/punctuation).
      const showReading = isKanji(ch) && !!r
      return { char: ch, reading: showReading ? r : undefined }
    })

    const readingsValid = readings.length === perChar.length && readings.some((r) => r)
    if (!readingsValid) {
      if (t.reading && t.reading !== t.surface) {
        const firstKanji = perChar.findIndex((c) => isKanji(c.char))
        if (firstKanji >= 0) {
          perChar[firstKanji] = { ...perChar[firstKanji], reading: t.reading }
        }
      }
    }

    parts.push({ type: 'token', chars: perChar })
    cursor = idx + t.surface.length
  }
  if (cursor < text.length) {
    parts.push({ type: 'plain', text: text.slice(cursor) })
  }
  return parts
}
