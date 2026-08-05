import PptxGenJS from 'pptxgenjs'
import { computeLayout } from './layout'
import { POS_COLORS, POS_LABELS } from './lesson-slide'
import type { LessonSlideLineInput } from './lesson-slide'

/**
 * Exports lesson slides to a PPTX using PptxGenJS.
 * The PPTX uses native text boxes / shapes (editable), not rendered images.
 */
export async function exportToPptx(opts: {
  songTitle: string
  artist: string
  lines: LessonSlideLineInput[]
  showTitle: boolean
  showReading: boolean
  showConjugation: boolean
  showPageNumber: boolean
  filePath?: string
}): Promise<{ fileName: string; slideCount: number }> {
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'LYRIC_16x9', width: 10, height: 5.625 })
  pptx.layout = 'LYRIC_16x9'
  pptx.author = 'LyricLingo Studio'

  // Map abstract layout units (1280x720) to inches (10 x 5.625).
  const sx = 10 / 1280
  const sy = 5.625 / 720

  for (let i = 0; i < opts.lines.length; i++) {
    const line = opts.lines[i]
    const page = pptx.addSlide()
    const layout = computeLayout(line.tokens, {
      hasReading: !!line.readingText,
      showTitle: opts.showTitle,
      showConjugation: opts.showConjugation,
      showReading: opts.showReading,
    })

    if (opts.showTitle) {
      const r = layout.titleRect
      page.addText(
        `${opts.songTitle}${opts.artist ? ` — ${opts.artist}` : ''}`,
        { x: r.x * sx, y: r.y * sy, w: r.width * sx, h: r.height * sy, fontSize: 16, bold: true },
      )
    }

    // Lyric (center)
    page.addText(line.text, {
      x: layout.lyricRect.x * sx,
      y: layout.lyricRect.y * sy,
      w: layout.lyricRect.width * sx,
      h: layout.lyricRect.height * sy,
      fontSize: 24,
      bold: true,
      align: 'center',
      valign: 'middle',
    })

    // Reading
    if (line.readingText && layout.readingRect.height > 0) {
      page.addText(line.readingText, {
        x: layout.readingRect.x * sx,
        y: layout.readingRect.y * sy,
        w: layout.readingRect.width * sx,
        h: layout.readingRect.height * sy,
        fontSize: 12,
        color: '888888',
        align: 'center',
        valign: 'middle',
      })
    }

    // Translation
    page.addText(line.translation, {
      x: layout.translationRect.x * sx,
      y: layout.translationRect.y * sy,
      w: layout.translationRect.width * sx,
      h: layout.translationRect.height * sy,
      fontSize: 16,
      color: '333333',
      align: 'center',
      valign: 'middle',
    })

    // Token cards
    for (const { token, rect } of layout.tokenRects) {
      const bg = (POS_COLORS[token.pos] ?? '#eeeeee').replace('#', '')
      page.addShape('roundRect', {
        x: rect.x * sx,
        y: rect.y * sy,
        w: rect.width * sx,
        h: rect.height * sy,
        fill: { color: bg },
        rectRadius: 0.05,
        line: { color: token.confirmed ? 'CCCCCC' : 'E8A100', width: 1 },
      })
      page.addText(
        `${token.surface}${POS_LABELS[token.pos] ? `  [${POS_LABELS[token.pos]}]` : ''}\n` +
          `${token.baseForm}${opts.showConjugation && token.conjugation ? ` (${token.conjugation})` : ''}\n` +
          `${token.meaning}`,
        {
          x: rect.x * sx + 0.08,
          y: rect.y * sy + 0.06,
          w: (rect.width - 16) * sx,
          h: (rect.height - 12) * sy,
          fontSize: 9,
          valign: 'top',
        },
      )
    }

    if (opts.showPageNumber) {
      page.addText(`${i + 1} / ${opts.lines.length}`, {
        x: 8.8,
        y: 5.25,
        w: 1,
        h: 0.3,
        fontSize: 8,
        color: 'AAAAAA',
        align: 'right',
      })
    }
  }

  const fileName = opts.filePath ?? `${opts.songTitle}-歌词学习.pptx`
  await pptx.writeFile({ fileName })
  return { fileName, slideCount: opts.lines.length }
}
