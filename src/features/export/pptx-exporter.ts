import PptxGenJS from 'pptxgenjs'
import { POS_COLORS, POS_LABELS } from './lesson-slide'
import type { LessonSlideLineInput } from './lesson-slide'

/** Orbit position for a card around the central card (slide is 10 x 5.625 in). */
function orbitPos(i: number): { x: number; y: number } {
  const spots = [
    { x: 0.5, y: 0.6 },
    { x: 7.3, y: 0.6 },
    { x: 0.5, y: 3.9 },
    { x: 7.3, y: 3.9 },
    { x: 3.6, y: 0.25 },
    { x: 3.6, y: 4.4 },
    { x: 0.5, y: 2.2 },
    { x: 7.3, y: 2.2 },
  ]
  return spots[i % spots.length]
}

/**
 * Exports lesson slides to a PPTX using PptxGenJS.
 * Layout: a central lyric card with orbiting word cards (editable shapes/text).
 */
export async function exportToPptx(opts: {
  songTitle: string
  artist: string
  lines: LessonSlideLineInput[]
  showTitle: boolean
  showReading: boolean
  showConjugation: boolean
  showPageNumber: boolean
  background?: string
  backgroundOpacity?: number
  filePath?: string
}): Promise<{ fileName: string; slideCount: number; base64: string }> {
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'LYRIC_16x9', width: 10, height: 5.625 })
  pptx.layout = 'LYRIC_16x9'
  pptx.author = 'LyricLingo Studio'

  for (let i = 0; i < opts.lines.length; i++) {
    const line = opts.lines[i]
    const page = pptx.addSlide()

    // Warm cream background; if a user image is set, draw it full-slide (cover).
    page.background = { color: 'F7F5F0' }
    if (opts.background) {
      const transparency = opts.backgroundOpacity === undefined ? 0 : 100 - opts.backgroundOpacity
      page.addImage({
        data: opts.background, // full data URL (data:image/...;base64,...)
        transparency,
        x: 0,
        y: 0,
        w: 10,
        h: 5.625,
        sizing: { type: 'cover', w: 10, h: 5.625, x: 0, y: 0 },
      })
    }

    if (opts.showTitle) {
      page.addText(
        `${opts.songTitle}${opts.artist ? `  ${opts.artist}` : ''}`,
        { x: 2, y: 0.1, w: 6, h: 0.4, fontSize: 14, bold: true, color: '5A5449', align: 'center' },
      )
    }

    // Central card.
    const cx = 2.8
    const cy = 1.1
    const cw = 4.4
    const ch = 3.4
    page.addShape('roundRect', {
      x: cx, y: cy, w: cw, h: ch,
      fill: { color: 'FFFFFF' },
      rectRadius: 0.12,
      line: { color: 'E6E2D8', width: 1 },
      shadow: { type: 'outer', blur: 8, offset: 3, angle: 90, color: '000000', opacity: 0.15 },
    })
    // Lyric rendered horizontally; kanji tokens carry their reading as
    // 「表面(假名)」 inline (e.g. 眩しく(まぶしく) 光る(ひかる)).
    const hasTokens = line.tokens.length > 0
    let lyricText = line.text
    if (hasTokens) {
      const parts = line.tokens.map((token) => {
        const reading = opts.showReading ? token.reading : undefined
        if (reading && reading !== token.surface) {
          return `${token.surface}(${reading})`
        }
        return token.surface
      })
      lyricText = parts.join(' ')
    }
    page.addText(lyricText, {
      x: cx + 0.2, y: cy + 0.35, w: cw - 0.4, h: 1.5,
      fontSize: 18, bold: true, color: '3C3831', align: 'center', valign: 'middle',
      wrap: true,
    })
    // Reading line (optional, whole-line reading as a subtitle).
    if (line.readingText && opts.showReading) {
      page.addText(line.readingText, {
        x: cx + 0.2, y: cy + 1.85, w: cw - 0.4, h: 0.35,
        fontSize: 9, color: 'A0988B', align: 'center',
      })
    }
    // Translation.
    page.addText(line.translation, {
      x: cx + 0.3, y: cy + 2.3, w: cw - 0.6, h: 0.6,
      fontSize: 12, color: '6B6559', align: 'center', valign: 'middle',
    })

    // Orbiting word cards (max 8).
    const cardTokens = line.tokens.slice(0, 8)
    cardTokens.forEach((token, idx) => {
      const p = orbitPos(idx)
      const w = 2.2
      const h = 1.0
      const bg = (POS_COLORS[token.pos] ?? '#ffffff').replace('#', '')
      page.addShape('roundRect', {
        x: p.x, y: p.y, w, h,
        fill: { color: bg },
        rectRadius: 0.06,
        line: { color: token.confirmed ? 'E0DBD0' : 'E8A100', width: 1 },
        shadow: { type: 'outer', blur: 4, offset: 2, angle: 90, color: '000000', opacity: 0.12 },
      })
      page.addText(
        `${token.surface}${POS_LABELS[token.pos] ? `  ${POS_LABELS[token.pos]}` : ''}\n` +
          `${opts.showReading && token.reading ? `音 ${token.reading}\n` : ''}` +
          `${token.baseForm}${opts.showConjugation && token.conjugation ? ` (${token.conjugation})` : ''}\n` +
          `${token.meaning}`,
        {
          x: p.x + 0.08, y: p.y + 0.05, w: w - 0.16, h: h - 0.1,
          fontSize: 8, valign: 'top',
        },
      )
    })

    if (opts.showPageNumber) {
      page.addText(`${i + 1} / ${opts.lines.length}`, {
        x: 8.6, y: 5.15, w: 1.2, h: 0.3, fontSize: 8, color: 'B5AEA0', align: 'right',
      })
    }
  }

  const fileName = opts.filePath ?? `${opts.songTitle}-歌词学习.pptx`
  // Generate the file as base64 bytes; the caller persists it via the save dialog.
  const b64 = (await pptx.write({ outputType: 'base64' })) as string
  return { fileName, slideCount: opts.lines.length, base64: b64 }
}
