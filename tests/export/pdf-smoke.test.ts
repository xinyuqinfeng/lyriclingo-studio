import { describe, it, expect } from 'vitest'
import { buildPrintHtml } from '../../src/features/export/pdf-exporter'
import type { LessonSlideLineInput } from '../../src/features/export/lesson-slide'
import { DEFAULT_EXPORT_SETTINGS } from '../../src/features/export/export-settings'

const line: LessonSlideLineInput = {
  seq: 0,
  text: '星が降る夜に',
  readingText: 'ほしがふるよるに',
  translation: '在星星坠落的夜晚',
  tokens: [
    { surface: '星', pos: 'noun', baseForm: '星', meaning: '星星', confirmed: true, favorite: false },
    { surface: '降る', pos: 'verb', baseForm: '降る', meaning: '降落', conjugation: '連体形', confirmed: true, favorite: false },
  ],
}

describe('PDF print HTML', () => {
  it('produces one page block per line', () => {
    const html = buildPrintHtml({
      songTitle: '夜空',
      artist: '',
      lines: [line, line],
      settings: DEFAULT_EXPORT_SETTINGS,
    })
    const pages = html.match(/class="page"/g)
    expect(pages).toHaveLength(2)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('@page')
  })

  it('escapes special characters in lyrics', () => {
    const tricky: LessonSlideLineInput = { ...line, text: '<script>alert("x")</script>' }
    const html = buildPrintHtml({
      songTitle: 't',
      artist: '',
      lines: [tricky],
      settings: DEFAULT_EXPORT_SETTINGS,
    })
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>alert')
  })

  it('hides reading when disabled in settings', () => {
    const html = buildPrintHtml({
      songTitle: 't',
      artist: '',
      lines: [line],
      settings: { ...DEFAULT_EXPORT_SETTINGS, showReading: false },
    })
    expect(html).not.toContain('ほしがふるよるに')
  })

  it('does not contain api keys (smoke)', () => {
    const html = buildPrintHtml({
      songTitle: 't',
      artist: '',
      lines: [line],
      settings: DEFAULT_EXPORT_SETTINGS,
    })
    expect(html).not.toMatch(/sk-[A-Za-z0-9]+/)
  })
})
