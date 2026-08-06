export interface ExportSettings {
  showTitle: boolean
  showReading: boolean
  showConjugation: boolean
  showPageNumber: boolean
  showPartOfSpeech: boolean
  /** Background image as a data URL (for preview / PPTX). */
  background?: string
  /** Background image opacity 0-100. */
  backgroundOpacity: number
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  showTitle: true,
  showReading: true,
  showConjugation: true,
  showPageNumber: true,
  showPartOfSpeech: true,
  background: undefined,
  backgroundOpacity: 100,
}

const BG_KEY = 'lyriclingo.exportBackground'
const OPACITY_KEY = 'lyriclingo.exportBgOpacity'

export function loadSavedSettings(): ExportSettings {
  try {
    const bg = localStorage.getItem(BG_KEY)
    const opacity = Number(localStorage.getItem(OPACITY_KEY))
    return {
      ...DEFAULT_EXPORT_SETTINGS,
      background: bg ?? undefined,
      backgroundOpacity: Number.isFinite(opacity) && opacity >= 0 && opacity <= 100 ? opacity : 100,
    }
  } catch {
    return DEFAULT_EXPORT_SETTINGS
  }
}

export function persistSettings(s: ExportSettings) {
  try {
    if (s.background) localStorage.setItem(BG_KEY, s.background)
    else localStorage.removeItem(BG_KEY)
    localStorage.setItem(OPACITY_KEY, String(s.backgroundOpacity))
  } catch {
    // ignore quota errors
  }
}
