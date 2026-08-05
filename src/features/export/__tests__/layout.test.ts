import { describe, it, expect } from 'vitest'
import { computeLayout } from '../layout'
import type { LessonSlideTokenInput } from '../lesson-slide'

function makeToken(i: number, pos = 'noun'): LessonSlideTokenInput {
  return {
    surface: `词${i}`,
    pos,
    baseForm: `原型${i}`,
    meaning: `意思${i}`,
    confirmed: true,
    favorite: false,
  }
}

describe('computeLayout', () => {
  it('lays out a small number of tokens without overflow', () => {
    const result = computeLayout([makeToken(0), makeToken(1), makeToken(2)], {
      hasReading: true,
      showTitle: true,
      showConjugation: true,
      showReading: true,
    })
    expect(result.tokenRects.length).toBe(3)
    expect(result.overflowTokens.length).toBe(0)
    expect(result.warnings.length).toBe(0)
  })

  it('places lyric in the center area', () => {
    const result = computeLayout([makeToken(0)], {
      hasReading: false,
      showTitle: false,
      showConjugation: false,
      showReading: false,
    })
    expect(result.lyricRect.x).toBeGreaterThan(0)
    expect(result.lyricRect.width).toBeGreaterThan(0)
  })

  it('overflow tokens go to overflow list with a warning', () => {
    const many = Array.from({ length: 14 }, (_, i) => makeToken(i))
    const result = computeLayout(many, {
      hasReading: false,
      showTitle: true,
      showConjugation: false,
      showReading: false,
    })
    expect(result.overflowTokens.length).toBe(2) // 14 - 12 slots
    expect(result.warnings.length).toBe(1)
    expect(result.warnings[0]).toContain('过多')
  })

  it('reading rect is zero-height when no reading', () => {
    const result = computeLayout([makeToken(0)], {
      hasReading: false,
      showTitle: true,
      showConjugation: true,
      showReading: true,
    })
    expect(result.readingRect.height).toBe(0)
  })

  it('token cards alternate left and right columns', () => {
    const tokens = [makeToken(0), makeToken(1)]
    const result = computeLayout(tokens, {
      hasReading: false,
      showTitle: false,
      showConjugation: true,
      showReading: true,
    })
    expect(result.tokenRects[0].rect.x).toBeLessThan(result.tokenRects[1].rect.x)
  })
})
