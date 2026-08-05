import { computeLayout } from './layout'
import { POS_COLORS, POS_LABELS } from './lesson-slide'
import type { LessonSlideLineInput } from './lesson-slide'
import type { ExportSettings } from './export-settings'

/**
 * Builds a print-optimized HTML document (A4 portrait) with one slide per page.
 * The user prints it to PDF via the system print dialog (e.g. Microsoft Print to PDF),
 * which uses the same layout as the on-screen preview.
 */
export function buildPrintHtml(opts: {
  songTitle: string
  artist: string
  lines: LessonSlideLineInput[]
  settings: ExportSettings
}): string {
  const pages = opts.lines.map((line, i) => renderPageHtml(line, i + 1, opts.lines.length, opts.songTitle, opts.artist, opts.settings))
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(opts.songTitle)} - 歌词学习</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  body { font-family: "Microsoft YaHei", "Hiragino Sans", "Yu Gothic", system-ui, sans-serif; margin: 0; }
  .page {
    width: 100%;
    min-height: 267mm;
    box-sizing: border-box;
    padding: 12mm;
    page-break-after: always;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  .page:last-child { page-break-after: auto; }
  .title { font-size: 16pt; font-weight: 700; margin-bottom: 4mm; }
  .lyric {
    font-size: 22pt; font-weight: 700; text-align: center;
    margin: 40mm 0 4mm;
  }
  .reading { font-size: 11pt; color: #666; text-align: center; margin-bottom: 6mm; }
  .translation {
    font-size: 14pt; text-align: center;
    border-top: 1px dashed #ccc; padding-top: 4mm; margin-top: 2mm;
  }
  .tokens { display: flex; flex-wrap: wrap; gap: 4mm; margin-top: 12mm; }
  .card {
    border: 1px solid #ccc; border-radius: 2mm; padding: 3mm; width: 44mm; font-size: 9pt;
  }
  .card .surface { font-weight: 700; font-size: 11pt; }
  .card .meta { color: #666; }
  .page-num { position: absolute; bottom: 4mm; right: 6mm; font-size: 8pt; color: #aaa; }
  @media print {
    .print-hint { display: none; }
  }
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
  const layout = computeLayout(line.tokens, {
    hasReading: !!line.readingText,
    showTitle: settings.showTitle,
    showConjugation: settings.showConjugation,
    showReading: settings.showReading,
  })
  const cards = layout.tokenRects
    .map(
      ({ token }) => `
      <div class="card" style="background:${POS_COLORS[token.pos] ?? '#eeeeee'}; border-color:${token.confirmed ? '#ccc' : '#e8a100'}">
        <div class="surface">${escapeHtml(token.surface)}${
          settings.showPartOfSpeech && POS_LABELS[token.pos]
            ? ` <span style="font-weight:400;color:#666;font-size:8pt">${POS_LABELS[token.pos]}</span>`
            : ''
        }</div>
        ${settings.showReading && token.reading ? `<div class="meta">${escapeHtml(token.reading)}</div>` : ''}
        <div><b>${escapeHtml(token.baseForm)}</b>${
          settings.showConjugation && token.conjugation
            ? `<span style="color:#a00;font-size:8pt"> (${escapeHtml(token.conjugation)})</span>`
            : ''
        }</div>
        <div>${escapeHtml(token.meaning)}</div>
      </div>`,
    )
    .join('')

  const overflowNote =
    layout.overflowTokens.length > 0
      ? `<div style="margin-top:3mm;font-size:8pt;color:#a60">另有 ${layout.overflowTokens.length} 个词未在本页展示（单词卡过多）。</div>`
      : ''

  return `
  <div class="page">
    ${settings.showTitle ? `<div class="title">${escapeHtml(songTitle)}${artist ? ` <span style="font-weight:400;color:#888;font-size:12pt">${escapeHtml(artist)}</span>` : ''}</div>` : ''}
    <div class="lyric">${escapeHtml(line.text)}</div>
    ${line.readingText && settings.showReading ? `<div class="reading">${escapeHtml(line.readingText)}</div>` : ''}
    <div class="translation">${escapeHtml(line.translation)}</div>
    ${cards ? `<div class="tokens">${cards}</div>` : ''}
    ${overflowNote}
    ${settings.showPageNumber ? `<div class="page-num">${pageNumber} / ${totalPages}</div>` : ''}
  </div>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
