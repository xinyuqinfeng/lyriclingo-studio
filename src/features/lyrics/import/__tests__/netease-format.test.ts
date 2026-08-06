import { describe, it, expect } from 'vitest'
import { parseLyrics, type ParsedLine } from '../parse-lyrics'
import { prepareSongLyrics, extractLyricPairs } from '../prepare-lyrics'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const netease = JSON.parse(
  readFileSync(join(process.cwd(), 'tests', 'fixtures', 'netease-format-song.json'), 'utf-8'),
) as { lyrics: string }

describe('网易云歌词格式处理', () => {
  it('识别出元信息行（作词/作曲）', () => {
    const lines = parseLyrics(netease.lyrics)
    const meta = lines.filter((l) => !l.isSectionBreak && /^(作词|作曲|编曲|作詞)[\s:：]/.test(l.text))
    expect(meta.length).toBe(2)
  })

  it('prepareSongLyrics 过滤元信息行', () => {
    const result = prepareSongLyrics(netease.lyrics, 'ja')
    const metas = result.lines.filter((l) => /^(作词|作曲)[\s:：]/.test(l.text))
    expect(metas.length).toBe(0)
  })

  it('prepareSongLyrics 过滤中文翻译行，只保留日语歌词行', () => {
    const result = prepareSongLyrics(netease.lyrics, 'ja')
    // 原始 40 行（含元信息 + 中日交错）→ 只保留日语歌词行（约 18 句）
    expect(result.lines.length).toBeGreaterThan(10)
    expect(result.lines.length).toBeLessThan(25)
    // 所有保留行都应含假名（日语特征）
    for (const l of result.lines) {
      if (l.isSectionBreak) continue
      expect(l.text).toMatch(/[\u3040-\u30ff]/)
    }
  })

  it('prepareSongLyrics 标记被过滤的行数', () => {
    const result = prepareSongLyrics(netease.lyrics, 'ja')
    expect(result.skippedMetadata).toBe(2)
    expect(result.skippedTranslations).toBeGreaterThan(0)
  })

  it('英文歌词不误删拉丁行', () => {
    const lyrics = 'artist : X\nUnder the falling stars I heard your voice\nI want to see you again'
    const result = prepareSongLyrics(lyrics, 'en')
    expect(result.lines.filter((l) => !l.isSectionBreak).length).toBe(2)
    expect(result.skippedTranslations).toBe(0)
  })

  it('韩文歌词保留韩文行、过滤中文翻译', () => {
    const lyrics = '별이 떨어지는 밤에 네 목소리가 들렸어\n在星星落下的夜晚我听到了你的声音'
    const result = prepareSongLyrics(lyrics, 'ko')
    expect(result.lines.filter((l) => !l.isSectionBreak).length).toBe(1)
    expect(result.lines[0].text).toMatch(/[\uac00-\ud7af]/)
  })

  it('extractLyricPairs 将日文行与后续中文翻译行配对', () => {
    const lyrics =
      '作词 : X\n眩しく光る太陽が目に染みる決意の朝に\n在眩目的阳光下，满怀决心的早晨\nどこまでも いつまでも 消えはしないよ\n无论何时何地，永远不会消失'
    const pairs = extractLyricPairs(lyrics, 'ja')
    expect(pairs.length).toBe(2)
    expect(pairs[0].source).toContain('眩しく')
    expect(pairs[0].referenceTranslation).toContain('眩目')
    expect(pairs[1].referenceTranslation).toContain('无论何时')
  })

  it('extractLyricPairs 纯源语言时无参考翻译', () => {
    const pairs = extractLyricPairs('眩しく光る太陽が目に染みる\n走り出そう', 'ja')
    expect(pairs.length).toBe(2)
    expect(pairs[0].referenceTranslation).toBeUndefined()
  })
})

export type { ParsedLine }
