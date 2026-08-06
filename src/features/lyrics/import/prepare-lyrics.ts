import type { SourceLanguage } from '@lyriclingo/contracts'
import { parseLyrics, type ParsedLine } from './parse-lyrics'

export interface PreparedLyrics {
  lines: ParsedLine[]
  skippedMetadata: number
  skippedTranslations: number
}

/** A source-language lyric line optionally paired with its translation line
 * (the NetEase-style bilingual pattern: source line, then Chinese line). */
export interface LyricPair {
  seq: number
  source: string
  /** The Chinese translation that followed this line, if present. */
  referenceTranslation?: string
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

/**
 * Extracts source-language lyric lines in order, pairing each with the
 * immediately following non-source line if it looks like its translation
 * (used as a reference for the LLM). Metadata and section breaks are skipped.
 */
export function extractLyricPairs(raw: string, language: SourceLanguage): LyricPair[] {
  const parsed = parseLyrics(raw)
  const pairs: LyricPair[] = []
  let i = 0
  while (i < parsed.length) {
    const line = parsed[i]
    if (line.isSectionBreak || isMetadata(line.text)) {
      i++
      continue
    }
    if (!isSourceLine(line.text, language)) {
      // A translation line without a preceding source line (e.g. header only) — skip.
      i++
      continue
    }
    // Look ahead for a following non-source (translation) line.
    let referenceTranslation: string | undefined
    let j = i + 1
    while (j < parsed.length && (parsed[j].isSectionBreak || isMetadata(parsed[j].text))) {
      j++
    }
    if (j < parsed.length && !parsed[j].isSectionBreak && !isSourceLine(parsed[j].text, language)) {
      referenceTranslation = parsed[j].text
    }
    pairs.push({ seq: line.seq, source: line.text, referenceTranslation })
    i++
  }
  return pairs
}
