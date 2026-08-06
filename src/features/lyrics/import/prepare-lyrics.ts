import type { SourceLanguage } from '@lyriclingo/contracts'
import { parseLyrics, type ParsedLine } from './parse-lyrics'

export interface PreparedLyrics {
  lines: ParsedLine[]
  skippedMetadata: number
  skippedTranslations: number
}

const METADATA_RE = /^(作词|作曲|编曲|制作|出品|原唱|翻唱|作詞|作曲|詞|曲|詞曲|artist|album|lyrics|composer|producer)\s*[：:．.]?\s*/i

// Character-range matchers
const KANA_RE = /[\u3040-\u30ff]/
const HANGUL_RE = /[\uac00-\ud7af]/
const LATIN_RE = /[A-Za-z]/
// CJK unified ideographs (shared by zh/ja/ko)
const CJK_RE = /[\u4e00-\u9fff]/

function isMetadata(text: string): boolean {
  return METADATA_RE.test(text.trim())
}

/**
 * Decides whether a line is source-language content for the given language,
 * or an interleaved translation line (e.g. the Chinese line below each
 * Japanese line in NetEase-style bilingual lyrics).
 */
function isSourceLine(text: string, language: SourceLanguage): boolean {
  const trimmed = text.trim()
  if (trimmed === '') return false
  if (isMetadata(trimmed)) return false

  switch (language) {
    case 'ja': {
      // Japanese: keep lines that contain kana, or are Latin (romaji).
      // Drop lines that are CJK-only (likely the Chinese translation).
      if (KANA_RE.test(trimmed)) return true
      if (LATIN_RE.test(trimmed) && !CJK_RE.test(trimmed)) return true
      // A kanji-only line is ambiguous; keep it only if it's short and likely a title.
      return false
    }
    case 'ko': {
      if (HANGUL_RE.test(trimmed)) return true
      return false
    }
    case 'en': {
      // Keep Latin lines; drop CJK (translations).
      if (LATIN_RE.test(trimmed) && !CJK_RE.test(trimmed)) return true
      return false
    }
    case 'auto':
    default:
      return true
  }
}

/**
 * Parses raw pasted lyrics (possibly bilingual / with metadata headers) and
 * returns only the lines that belong to the source language, dropping:
 *   - metadata headers like "作词 : X"
 *   - interleaved translation lines (e.g. Chinese lines under Japanese)
 */
export function prepareSongLyrics(raw: string, language: SourceLanguage): PreparedLyrics {
  const parsed = parseLyrics(raw)
  const lines: ParsedLine[] = []
  let skippedMetadata = 0
  let skippedTranslations = 0

  for (const line of parsed) {
    if (line.isSectionBreak) {
      lines.push(line)
      continue
    }
    if (isMetadata(line.text)) {
      skippedMetadata += 1
      continue
    }
    if (!isSourceLine(line.text, language)) {
      skippedTranslations += 1
      continue
    }
    lines.push(line)
  }

  return { lines, skippedMetadata, skippedTranslations }
}
