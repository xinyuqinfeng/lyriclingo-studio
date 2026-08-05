import { describe, it, expect } from 'vitest'
import {
  parseLineAnalysisArray,
  LineAnalysisSchema,
} from '../analysis-schema'
import { isPartOfSpeech, isSourceLanguage } from '../language'

describe('LineAnalysisSchema contract', () => {
  const validAnalysis = {
    lineIndex: 0,
    translation: '在繁星落下的夜里，我独自一人',
    readingText: '星（ほし）が降（ふ）る夜（よる）に',
    tokens: [
      {
        surface: '星が',
        start: 0,
        end: 3,
        pos: 'noun',
        baseForm: '星',
        baseReading: 'ほし',
        reading: 'ほし',
        meaning: '星星',
        contextualMeaning: '星星',
        confirmed: true,
      },
      {
        surface: '降る',
        start: 3,
        end: 6,
        pos: 'verb',
        baseForm: '降る',
        baseReading: 'ふる',
        reading: 'ふる',
        meaning: '下（雨/雪）',
        contextualMeaning: '落下（流星）',
        conjugation: '連体形',
        confirmed: true,
      },
    ],
    grammarNotes: ['「〜に」表示时间点'],
    uncertainty: [],
  }

  it('parses a valid line analysis', () => {
    const result = parseLineAnalysisArray([validAnalysis])
    expect(result).toHaveLength(1)
    expect(result[0].tokens[1].pos).toBe('verb')
  })

  it('rejects analysis missing baseForm', () => {
    const bad = JSON.parse(JSON.stringify(validAnalysis))
    delete bad.tokens[0].baseForm
    expect(() => parseLineAnalysisArray([bad])).toThrow()
  })

  it('rejects invalid part of speech', () => {
    const bad = JSON.parse(JSON.stringify(validAnalysis))
    bad.tokens[0].pos = 'adverbially-weird'
    expect(() => parseLineAnalysisArray([bad])).toThrow()
  })

  it('rejects empty translation', () => {
    const bad = JSON.parse(JSON.stringify(validAnalysis))
    bad.translation = ''
    expect(() => parseLineAnalysisArray([bad])).toThrow()
  })

  it('rejects negative line index', () => {
    const bad = JSON.parse(JSON.stringify(validAnalysis))
    bad.lineIndex = -1
    expect(() => parseLineAnalysisArray([bad])).toThrow()
  })

  it('rejects invalid reading values', () => {
    const bad = JSON.parse(JSON.stringify(validAnalysis))
    bad.tokens[0].reading = 123
    expect(() => parseLineAnalysisArray([bad])).toThrow()
  })

  it('defaults confirmed to true when absent', () => {
    const ok = JSON.parse(JSON.stringify(validAnalysis))
    delete ok.tokens[0].confirmed
    const [parsed] = parseLineAnalysisArray([ok])
    expect(parsed.tokens[0].confirmed).toBe(true)
  })

  it('accepts optional contextualMeaning and conjugation', () => {
    const ok = JSON.parse(JSON.stringify(validAnalysis))
    ok.tokens[0].contextualMeaning = '流星'
    expect(() => LineAnalysisSchema.parse(ok)).not.toThrow()
  })
})

describe('language helpers', () => {
  it('recognizes source languages', () => {
    expect(isSourceLanguage('ja')).toBe(true)
    expect(isSourceLanguage('auto')).toBe(true)
    expect(isSourceLanguage('fr')).toBe(false)
  })

  it('recognizes parts of speech', () => {
    expect(isPartOfSpeech('noun')).toBe(true)
    expect(isPartOfSpeech('particle')).toBe(true)
    expect(isPartOfSpeech('verbify')).toBe(false)
  })
})
