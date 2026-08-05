import type { PartOfSpeech, SourceLanguage } from './language'
import type { Token } from './analysis-schema'

export interface Song {
  id: string
  title: string
  artist: string
  language: SourceLanguage
  lyrics: string
  createdAt: string
}

export interface LyricLine {
  id: string
  songId: string
  seq: number
  text: string
  isSectionBreak: boolean
}

export interface LineAnalysisRecord extends LineAnalysisData {
  id: string
  songId: string
  lineId: string
  model: string
  promptVersion: string
  generatedAt: string
  validated: boolean
  humanEdited: boolean
}

export interface LineAnalysisData {
  lineIndex: number
  translation: string
  readingText?: string
  tokens: Token[]
  grammarNotes?: string[]
  uncertainty?: string[]
}

export interface VocabularyEntry {
  id: string
  language: SourceLanguage
  baseForm: string
  baseReading?: string
  meaning: string
  partOfSpeech: PartOfSpeech
  favorite: boolean
  mastered: boolean
  tags: string[]
  note?: string
  createdAt: string
}

export interface ProviderProfile {
  id: string
  name: string
  baseUrl: string
  model: string
  supportsStructuredOutput: boolean
  supportsJsonMode: boolean
  modelsPath: string
  credentialId: string
}

export interface ProviderModel {
  id: string
  ownedBy?: string
  created?: number
}

export interface LessonSlideOptions {
  canvas: 'pptx-16x9' | 'pdf-a4'
  showPartOfSpeech: boolean
  showBaseForm: boolean
  showConjugation: boolean
  showReading: boolean
  showGrammarNotes: boolean
  showTitle: boolean
  showPageNumber: boolean
  showTranslation: boolean
}

export interface LessonSlideToken {
  token: Token
  favorite: boolean
}

export interface LessonSlide {
  songTitle: string
  artist: string
  pageNumber: number
  totalPages: number
  line: LyricLine
  readingText?: string
  translation: string
  grammarNotes?: string[]
  tokens: LessonSlideToken[]
}
