import { POS_COLORS, POS_LABELS } from './lesson-slide'
import type { LessonSlideLineInput } from './lesson-slide'
import type { ExportSettings } from './export-settings'

/**
 * Builds a print-optimized HTML document (A4 portrait) with one slide per page.
 *
 * Layout: a central lyric card (rounded vertical card with soft shadow) holds the
 * lyric line, furigana reading, and Chinese translation. Around it, word cards
 * orbit on the four sides, connected to the lyric with faint dashed lines.
 */
export function buildPrintHtml(opts: {
  songTitle: string
  artist: string
  lines: LessonSlideLineInput[]
  settings: ExportSettings
}): string {
  const pages = opts.lines.map((line, i) =>
    renderPageHtml(line, i + 1, opts.lines.length, opts.songTitle, opts.artist, opts.settings),
  )
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(opts.songTitle)} - 歌词学习</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: "Microsoft YaHei", "Hiragino Sans", "Yu Gothic", system-ui, sans-serif; margin: 0; }

  .page {
    width: 100%;
    min-height: 267mm;
    box-sizing: border-box;
    padding: 10mm;
    page-break-after: always;
    position: relative;
    background: #f7f5f0; /* warm cream */
    display: flex;
    flex-direction: column;
  }
  .page:last-child { page-break-after: auto; }

  .title {
    text-align: center; font-size: 14pt; font-weight: 700;
    color: #5a5449; margin-bottom: 6mm; letter-spacing: 1px;
  }
  .title .artist { font-weight: 400; color: #9a9386; font-size: 11pt; margin-left: 4mm; }

  /* Central lyric card */
  .stage { flex: 1; position: relative; min-height: 170mm; }

  .central {
    position: absolute; left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    width: 78mm; min-height: 110mm;
    background: #ffffff;
    border-radius: 6mm;
    box-shadow: 0 2mm 6mm rgba(0,0,0,0.12);
    border: 1px solid #e6e2d8;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 8mm 6mm; text-align: center;
    z-index: 2;
  }
  .central .lyric { font-size: 16pt; font-weight: 700; color: #3c3831; line-height: 1.7; }
  .central .reading { font-size: 8pt; color: #a0988b; margin-top: 2mm; }
  .central .translation {
    margin-top: 5mm; padding-top: 3mm; border-top: 1px dashed #ddd8cc;
    font-size: 10.5pt; color: #6b6559; width: 100%;
  }

  /* Orbiting word cards */
  .orbit { position: absolute; z-index: 3; }
  .card {
    width: 40mm; border-radius: 2.5mm; padding: 2.5mm 2.5mm;
    background: #fff; border: 1px solid #e0dbd0;
    box-shadow: 0 1mm 3mm rgba(0,0,0,0.08);
    font-size: 8pt; color: #4a463d;
  }
  .card .surface { font-weight: 700; font-size: 10pt; color: #3c3831; }
  .card .pos { font-size: 7pt; color: #a0988b; font-weight: 400; margin-left: 1mm; }
  .card .meta { color: #9a9386; font-size: 7.5pt; margin-top: 0.5mm; }
  .card .base { margin-top: 1mm; font-weight: 700; }
  .card .meaning { margin-top: 0.5mm; color: #6b6559; }

  /* Connector lines (dashed) */
  .connector { position: absolute; border-top: 1px dashed #c9c2b4; z-index: 1; }

  .page-num { position: absolute; bottom: 4mm; right: 6mm; font-size: 8pt; color: #b5aea0; }
  @media print { .print-hint { display: none; } }
</style>
</head>
<body>
${pages.join('\n')}
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };</script>
</body>
</html>`
}

function renderPageHtml(
  line: LessonSlideLineInput,
  pageNumber: number,
  totalPages: number,
  songTitle: string,
  artist: string,
  settings: ExportSettings,
): string {
  const tokens = line.tokens
  const cardCount = Math.min(tokens.length, 8) // keep layout clean

  // Distribute cards around the central card: top row, bottom row, left col, right col.
  const positions: { top: string; left: string }[] = []
  const sides = ['left-top', 'right-top', 'left-bottom', 'right-bottom', 'top-mid', 'bottom-mid', 'left-mid', 'right-mid']
  sides.slice(0, cardCount).forEach((side) => {
    positions.push(sidePos(side))
  })

  const cards = tokens
    .slice(0, cardCount)
    .map(
      (token, i) => `
      <div class="orbit" style="top:${positions[i].top};left:${positions[i].left}">
        <div class="card" style="background:${POS_COLORS[token.pos] ?? '#ffffff'}; border-color:${token.confirmed ? '#e0dbd0' : '#e8a100'}">
          <div class="surface">${escapeHtml(token.surface)}${settings.showPartOfSpeech && POS_LABELS[token.pos] ? `<span class="pos">${POS_LABELS[token.pos]}</span>` : ''}</div>
          ${settings.showReading && token.reading ? `<div class="meta">${escapeHtml(token.reading)}</div>` : ''}
          <div class="base">${escapeHtml(token.baseForm)}${settings.showConjugation && token.conjugation ? ` <span style="color:#c66;font-size:7pt">(${escapeHtml(token.conjugation)})</span>` : ''}</div>
          <div class="meaning">${escapeHtml(token.meaning)}</div>
        </div>
      </div>`,
    )
    .join('')

  // Dashed connectors from each card toward the center.
  const connectors = positions
    .slice(0, cardCount)
    .map((p) => connectorLine(p))
    .join('')

  return `
  <div class="page">
    ${settings.showTitle ? `<div class="title">${escapeHtml(songTitle)}<span class="artist">${escapeHtml(artist)}</span></div>` : ''}
    <div class="stage">
      ${connectors}
      <div class="central">
        <div class="lyric">${escapeHtml(line.text)}</div>
        ${line.readingText && settings.showReading ? `<div class="reading">${escapeHtml(line.readingText)}</div>` : ''}
        <div class="translation">${escapeHtml(line.translation)}</div>
      </div>
      ${cards}
    </div>
    ${settings.showPageNumber ? `<div class="page-num">${pageNumber} / ${totalPages}</div>` : ''}
  </div>`
}

/** Returns a top/left pair (in mm) for a card orbiting the central card. */
function sidePos(side: string): { top: string; left: string } {
  const map: Record<string, { top: string; left: string }> = {
    'left-top': { top: '12mm', left: '8mm' },
    'right-top': { top: '12mm', right: '8mm' } as any,
    'left-bottom': { top: '120mm', left: '8mm' },
    'right-bottom': { top: '120mm', right: '8mm' } as any,
    'top-mid': { top: '4mm', left: '38mm' },
    'bottom-mid': { top: '140mm', left: '38mm' },
    'left-mid': { top: '72mm', left: '8mm' },
    'right-mid': { top: '72mm', right: '8mm' } as any,
  }
  return map[side] ?? { top: '12mm', left: '8mm' }
}

/** Emits a faint dashed line from a card position toward the center. */
function connectorLine(p: { top: string; left?: string; right?: string }): string {
  // Simple radial connector: a horizontal dashed segment near the card.
  const y = p.top
  const isLeft = 'left' in p
  const length = '52mm'
  const startX = isLeft ? '50mm' : '80mm'
  const topY = y
  return `<div class="connector" style="top:${topY};left:${isLeft ? startX : 'auto'};right:${isLeft ? 'auto' : startX};width:${length};transform:translateY(12mm)"></div>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
