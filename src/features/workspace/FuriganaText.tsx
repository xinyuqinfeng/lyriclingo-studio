import type { WorkspaceToken } from '../workspace/workspace-store'

const KANJI_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/

function isKanji(ch: string): boolean {
  return KANJI_RE.test(ch)
}

/**
 * Renders a lyric line with KTV-style furigana: readings (kana) shown above
 * each kanji character. Uses the per-character `readings` array when present;
 * otherwise falls back to placing the whole token `reading` above the token.
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

  // Build a char map of token surfaces to their readings.
  // Token surfaces may not cover 100% of the text (punctuation etc.), so we
  // render the raw text and attach readings per token surface where found.
  const items = renderLine(text, tokens)

  return (
    <span style={{ fontSize, lineHeight: 1.6 }}>
      {items.map((part, i) => {
        if (part.type === 'plain') return <span key={i}>{part.text}</span>
        // token with furigana
        const chars = part.chars ?? []
        return (
          <ruby key={i}>
            {chars.map((c, j) =>
              c.reading ? (
                <span key={j}>
                  <ruby>
                    <rp>(</rp>
                    <rt style={{ fontSize: Math.max(10, fontSize * 0.42) }}>{c.reading}</rt>
                    <rp>)</rp>
                    {c.char}
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
    // Locate the token in the text: prefer explicit start offset when valid,
    // otherwise fall back to indexOf from the last cursor.
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
      const showReading = isKanji(ch) || !!r
      return { char: ch, reading: showReading && r ? r : undefined }
    })

    // If the per-char readings don't cover the surface length (or are empty),
    // fall back to placing the whole-token reading above the token.
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
