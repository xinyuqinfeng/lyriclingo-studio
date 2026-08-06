export const sourceLanguages = ['ja', 'en', 'ko', 'auto'] as const
export type SourceLanguage = (typeof sourceLanguages)[number]

export const partsOfSpeech = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'particle',
  'pronoun',
  'article',
  'conjunction',
  'interjection',
  'preposition',
  'determiner',
  'auxiliary',
  'other',
] as const
export type PartOfSpeech = (typeof partsOfSpeech)[number]

export function isSourceLanguage(value: string): value is SourceLanguage {
  return (sourceLanguages as readonly string[]).includes(value)
}

export function isPartOfSpeech(value: string): value is PartOfSpeech {
  return (partsOfSpeech as readonly string[]).includes(value)
}
