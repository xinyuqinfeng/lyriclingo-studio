export interface ExportSettings {
  showTitle: boolean
  showReading: boolean
  showConjugation: boolean
  showPageNumber: boolean
  showPartOfSpeech: boolean
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  showTitle: true,
  showReading: true,
  showConjugation: true,
  showPageNumber: true,
  showPartOfSpeech: true,
}
