import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseLyrics } from '../../src/features/lyrics/import/parse-lyrics'
import { detectLanguage } from '../../src/features/lyrics/import/detect-language'
import { parseLineAnalysisArray } from '@lyriclingo/contracts'
import { computeLayout } from '../../src/features/export/layout'
import { buildPrintHtml } from '../../src/features/export/pdf-exporter'
import { DEFAULT_EXPORT_SETTINGS } from '../../src/features/export/export-settings'

function loadFixture(name: string) {
  return JSON.parse(readFileSync(join(__dirname, '..', 'fixtures', name), 'utf-8')) as {
    title: string
    artist: string
    language: string
    lyrics: string
  }
}

const fixtures = ['japanese-song.json', 'english-song.json', 'korean-song.json']

describe('end-to-end song learning pipeline (offline, mocked)', () => {
  for (const name of fixtures) {
    it(`imports, detects language, analyzes, lays out, and exports: ${name}`, () => {
      const fixture = loadFixture(name)

      // 1. Import & parse
      const lines = parseLyrics(fixture.lyrics)
      const contentLines = lines.filter((l) => !l.isSectionBreak)
      expect(contentLines.length).toBeGreaterThan(0)

      // 2. Language detection matches fixture
      const detection = detectLanguage(contentLines.map((l) => l.text).join('\n'))
      expect(detection.language).toBe(fixture.language)

      // 3. Mock an LLM analysis payload shaped like real output
      const mockAnalysis = {
        lineIndex: 0,
        translation: '测试翻译',
        readingText: fixture.language === 'ja' ? 'ほしがふるよるに' : undefined,
        tokens: [
          {
            surface: contentLines[0].text.split(' ')[0] ?? '語',
            start: 0,
            end: 2,
            pos: 'noun',
            baseForm: '語',
            baseReading: 'ことば',
            meaning: '词语',
            confirmed: true,
          },
        ],
        grammarNotes: [],
        uncertainty: [],
      }
      const parsed = parseLineAnalysisArray([mockAnalysis])
      expect(parsed).toHaveLength(1)
      expect(parsed[0].tokens[0].pos).toBe('noun')

      // 4. Layout (no overflow for 1 token)
      const layout = computeLayout(parsed[0].tokens.map((t) => ({ ...t, favorite: false })), {
        hasReading: !!mockAnalysis.readingText,
        showTitle: true,
        showConjugation: true,
        showReading: true,
      })
      expect(layout.tokenRects.length).toBe(1)
      expect(layout.overflowTokens.length).toBe(0)

      // 5. PDF print HTML builds without key leakage
      const html = buildPrintHtml({
        songTitle: fixture.title,
        artist: fixture.artist,
        lines: [
          {
            seq: 0,
            text: contentLines[0].text,
            isSectionBreak: false,
            readingText: mockAnalysis.readingText,
            translation: '测试翻译',
            tokens: parsed[0].tokens.map((t) => ({ ...t, favorite: false })),
          },
        ],
        settings: DEFAULT_EXPORT_SETTINGS,
      })
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).not.toMatch(/sk-[A-Za-z0-9]+/)
    })
  }
})
