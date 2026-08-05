export interface LessonSlideTokenInput {
  surface: string
  pos: string
  baseForm: string
  meaning: string
  reading?: string
  conjugation?: string
  confirmed: boolean
  favorite: boolean
}

export interface LessonSlideLineInput {
  seq: number
  text: string
  isSectionBreak: boolean
  readingText?: string
  translation: string
  grammarNotes?: string[]
  tokens: LessonSlideTokenInput[]
}

export interface LessonSlideInput {
  songTitle: string
  artist: string
  pageNumber: number
  totalPages: number
  line: LessonSlideLineInput
}

export const POS_COLORS: Record<string, string> = {
  noun: '#e8f0fe',
  verb: '#fde8e8',
  adjective: '#e6f4ea',
  adverb: '#fef7e0',
  particle: '#f3e8fd',
  pronoun: '#e0f7fa',
  article: '#fce4ec',
  conjunction: '#f1f8e9',
  interjection: '#fff3e0',
  other: '#eceff1',
}

export const POS_LABELS: Record<string, string> = {
  noun: '名词',
  verb: '动词',
  adjective: '形容词',
  adverb: '副词',
  particle: '助词',
  pronoun: '代词',
  article: '冠词',
  conjunction: '连词',
  interjection: '感叹词',
  other: '其他',
}
