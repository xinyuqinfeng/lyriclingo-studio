import type { SourceLanguage } from '@lyriclingo/contracts'

export interface LanguageDetection {
  language: SourceLanguage
  confident: boolean
}

export function detectLanguage(text: string): LanguageDetection {
  const sample = text.slice(0, 500)

  const japaneseKana = (sample.match(/[\u3040-\u30ff]/g) ?? []).length
  const koreanSyllables = (sample.match(/[\uac00-\ud7af]/g) ?? []).length
  const latin = (sample.match(/[A-Za-z]/g) ?? []).length

  const total = Math.max(sample.length, 1)

  if (japaneseKana / total > 0.05) {
    return { language: 'ja', confident: true }
  }
  if (koreanSyllables / total > 0.05) {
    return { language: 'ko', confident: true }
  }
  if (latin / total > 0.2) {
    return { language: 'en', confident: true }
  }
  return { language: 'auto', confident: false }
}
