import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, existsSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { exportToPptx } from '../../src/features/export/pptx-exporter'
import type { LessonSlideLineInput } from '../../src/features/export/lesson-slide'

let dir: string

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'lyric-pptx-'))
})

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

const twoLines: LessonSlideLineInput[] = [
  {
    seq: 0,
    text: '星が降る夜にあなたの声が聞こえた',
    isSectionBreak: false,
    readingText: 'ほしがふるよるにあなたのこえがきこえた',
    translation: '在星星坠落的夜晚，我听见了你的声音。',
    tokens: [
      { surface: '星', pos: 'noun', baseForm: '星', meaning: '星星', confirmed: true, favorite: false },
      { surface: '降る', pos: 'verb', baseForm: '降る', meaning: '降落', conjugation: '連体形', confirmed: true, favorite: false },
    ],
  },
  {
    seq: 1,
    text: '目を閉じて心に刻んだ',
    isSectionBreak: false,
    translation: '闭上双眼，铭刻于心。',
    tokens: [
      { surface: '目', pos: 'noun', baseForm: '目', meaning: '眼睛', confirmed: true, favorite: false },
      { surface: '閉じて', pos: 'verb', baseForm: '閉じる', meaning: '关闭', conjugation: 'て形', confirmed: true, favorite: false },
    ],
  },
]

describe('PPTX export smoke test', () => {
  it('generates a non-empty pptx with one slide per line', async () => {
    const out = join(dir, 'test.pptx')
    const result = await exportToPptx({
      songTitle: '夜空',
      artist: '测试',
      lines: twoLines,
      showTitle: true,
      showReading: true,
      showConjugation: true,
      showPageNumber: true,
      filePath: out,
    })
    expect(result.slideCount).toBe(2)
    expect(existsSync(out)).toBe(true)
    expect(statSync(out).size).toBeGreaterThan(1000)
  })

  it('handles zero lines gracefully', async () => {
    const out = join(dir, 'empty.pptx')
    const result = await exportToPptx({
      songTitle: '空',
      artist: '',
      lines: [],
      showTitle: true,
      showReading: true,
      showConjugation: true,
      showPageNumber: true,
      filePath: out,
    })
    expect(result.slideCount).toBe(0)
    expect(existsSync(out)).toBe(true)
  })
})
