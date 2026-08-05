import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'

export interface LineProgress {
  index: number
  status: 'pending' | 'in_progress' | 'succeeded' | 'failed' | 'cancelled'
  error?: string | null
}

interface AnalysisState {
  analyzing: boolean
  progress: LineProgress[]
  error: string | null
  analyzeSong: (params: { songId: string; baseUrl: string; model: string; providerId?: string }) => Promise<void>
  clear: () => void
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  analyzing: false,
  progress: [],
  error: null,

  analyzeSong: async ({ songId, baseUrl, model, providerId }) => {
    set({ analyzing: true, error: null, progress: [] })
    try {
      const result = await invoke<LineProgress[]>('analyze_song', {
        songId,
        baseUrl,
        model,
        providerId,
      })
      set({ progress: result, analyzing: false })
    } catch (e) {
      set({ analyzing: false, error: String(e) })
    }
  },

  clear: () => set({ analyzing: false, progress: [], error: null }),
}))
