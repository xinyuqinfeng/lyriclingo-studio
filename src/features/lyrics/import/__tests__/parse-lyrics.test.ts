import { describe, it, expect } from 'vitest'
import { parseLyrics } from '../parse-lyrics'
import { detectLanguage } from '../detect-language'

describe('parseLyrics', () => {
  it('normalizes CRLF and LF to stable line numbers', () => {
    const result = parseLyrics('line1\r\nline2\nline3')
    expect(result).toHaveLength(3)
    expect(result.map((l) => l.seq)).toEqual([0, 1, 2])
    expect(result[0].text).toBe('line1')
    expect(result[2].text).toBe('line3')
  })

  it('keeps empty lines as section breaks', () => {
    const result = parseLyrics('one\n\ntwo')
    expect(result).toHaveLength(3)
    expect(result[1].isSectionBreak).toBe(true)
    expect(result[1].text).toBe('')
    expect(result[0].isSectionBreak).toBe(false)
  })

  it('trims leading and trailing whitespace', () => {
    const result = parseLyrics('  spaced  ')
    expect(result[0].text).toBe('spaced')
  })

  it('handles full-width spaces by keeping the line', () => {
    const result = parseLyrics('　')
    expect(result[0].isSectionBreak).toBe(false)
    expect(result[0].text).toBe('　')
  })

  it('rejects empty lyrics', () => {
    expect(() => parseLyrics('')).toThrow()
    expect(() => parseLyrics('   \n ')).toThrow()
  })

  it('preserves duplicated chorus lines as separate entries', () => {
    const result = parseLyrics('la la la\nla la la')
    expect(result).toHaveLength(2)
    expect(result[0].text).toBe(result[1].text)
  })
})

describe('detectLanguage', () => {
  it('detects Japanese from kana', () => {
    const d = detectLanguage('星が降る夜に')
    expect(d.language).toBe('ja')
    expect(d.confident).toBe(true)
  })

  it('detects Korean from hangul', () => {
    const d = detectLanguage('별이 빛나는 밤에')
    expect(d.language).toBe('ko')
    expect(d.confident).toBe(true)
  })

  it('detects English from latin text', () => {
    const d = detectLanguage('The stars are falling tonight')
    expect(d.language).toBe('en')
    expect(d.confident).toBe(true)
  })

  it('returns auto when ambiguous', () => {
    const d = detectLanguage('!!! ### ...')
    expect(d.language).toBe('auto')
    expect(d.confident).toBe(false)
  })
})
