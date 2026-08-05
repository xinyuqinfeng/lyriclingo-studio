import type { LessonSlideTokenInput } from './lesson-slide'

export interface LayoutRect {
  x: number
  y: number
  width: number
  height: number
}

export interface LayoutResult {
  lyricRect: LayoutRect
  readingRect: LayoutRect
  translationRect: LayoutRect
  titleRect: LayoutRect
  tokenRects: { token: LessonSlideTokenInput; rect: LayoutRect }[]
  overflowTokens: LessonSlideTokenInput[]
  warnings: string[]
}

const MAX_TOKENS_PER_SIDE = 6

/**
 * Computes a fixed layout for one lesson slide.
 *
 * Canvas is 1280x720 (16:9) in abstract units. The lyric sits in the center;
 * the translation below it; token cards arranged in side columns.
 * If there are too many tokens, the extra ones go to overflowTokens and a
 * warning is emitted.
 */
export function computeLayout(
  tokens: LessonSlideTokenInput[],
  opts: { hasReading: boolean; showTitle: boolean; showConjugation: boolean; showReading: boolean },
): LayoutResult {
  const canvasW = 1280

  const warnings: string[] = []

  const titleRect: LayoutRect = opts.showTitle
    ? { x: 40, y: 24, width: 1200, height: 36 }
    : { x: 0, y: 0, width: 0, height: 0 }

  const lyricRect: LayoutRect = { x: 300, y: 240, width: 680, height: 80 }
  const readingRect: LayoutRect = opts.hasReading
    ? { x: 300, y: 320, width: 680, height: 40 }
    : { x: 300, y: 320, width: 680, height: 0 }
  const translationRect: LayoutRect = { x: 300, y: 380, width: 680, height: 60 }

  const cardWidth = 250
  const cardHeight = 130
  const gap = 16
  const startX = 40
  const startY = 120

  const tokenRects: { token: LessonSlideTokenInput; rect: LayoutRect }[] = []
  const overflowTokens: LessonSlideTokenInput[] = []

  for (let i = 0; i < tokens.length; i++) {
    const side = i % 2 // 0 = left, 1 = right
    const col = Math.floor(i / 2)
    if (col >= MAX_TOKENS_PER_SIDE) {
      overflowTokens.push(tokens[i])
      continue
    }
    const x = side === 0 ? startX : canvasW - startX - cardWidth
    const y = startY + col * (cardHeight + gap)
    tokenRects.push({ token: tokens[i], rect: { x, y, width: cardWidth, height: cardHeight } })
  }

  if (overflowTokens.length > 0) {
    warnings.push(
      `本句单词卡过多，已折叠 ${overflowTokens.length} 个词到附录页或底部词表。`,
    )
  }

  return {
    lyricRect,
    readingRect,
    translationRect,
    titleRect,
    tokenRects,
    overflowTokens,
    warnings,
  }
}
