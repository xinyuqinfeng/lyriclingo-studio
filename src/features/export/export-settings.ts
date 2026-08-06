export interface ExportSettings {
  showTitle: boolean
  showReading: boolean
  showConjugation: boolean
  showPageNumber: boolean
  showPartOfSpeech: boolean
  /** Background image as a data URL (for preview / PDF / PPTX). */
  background?: string
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  showTitle: true,
  showReading: true,
  showConjugation: true,
  showPageNumber: true,
  showPartOfSpeech: true,
  background: undefined,
}

const BG_KEY = 'lyriclingo.exportBackground'

export function loadSavedSettings(): ExportSettings {
  try {
    const bg = localStorage.getItem(BG_KEY)
    return { ...DEFAULT_EXPORT_SETTINGS, background: bg ?? undefined }
  } catch {
    return DEFAULT_EXPORT_SETTINGS
  }
}

export function persistSettings(s: ExportSettings) {
  try {
    if (s.background) localStorage.setItem(BG_KEY, s.background)
    else localStorage.removeItem(BG_KEY)
  } catch {
    // ignore quota errors
  }
}

