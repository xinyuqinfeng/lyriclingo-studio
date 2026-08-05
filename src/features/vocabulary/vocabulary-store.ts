import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'

export interface VocabularyEntry {
  id: string
  language: string
  baseForm: string
  baseReading?: string | null
  meaning: string
  pos: string
  favorite: boolean
  mastered: boolean
  tags: string[]
  note?: string | null
  createdAt: string
}

export interface VocabularySource {
  songId: string
  songTitle: string
  lineText: string
  surface: string
}

export interface VocabularyDetail {
  entry: VocabularyEntry
  sources: VocabularySource[]
}

export interface VocabularyFilters {
  language?: string
  pos?: string
  mastered?: boolean
  search?: string
}

interface VocabularyState {
  entries: VocabularyEntry[]
  loading: boolean
  error: string | null
  filters: VocabularyFilters
  load: (filters?: VocabularyFilters) => Promise<void>
  setFilters: (filters: VocabularyFilters) => void
  setMastered: (id: string, mastered: boolean) => Promise<void>
  unfavorite: (id: string) => Promise<void>
}

export const useVocabularyStore = create<VocabularyState>((set, get) => ({
  entries: [],
  loading: false,
  error: null,
  filters: {},

  load: async (filters) => {
    const effective = filters ?? get().filters
    set({ loading: true, error: null })
    try {
      const entries = await invoke<VocabularyEntry[]>('list_vocabulary', { input: effective })
      set({ entries, loading: false, filters: effective })
    } catch (e) {
      set({ loading: false, error: String(e) })
    }
  },

  setFilters: (filters) => {
    set({ filters })
    get().load(filters)
  },

  setMastered: async (id, mastered) => {
    await invoke('set_vocabulary_mastered', { id, mastered })
    set({ entries: get().entries.map((e) => (e.id === id ? { ...e, mastered } : e)) })
  },

  unfavorite: async (id) => {
    await invoke('unfavorite_vocabulary', { id })
    set({ entries: get().entries.filter((e) => e.id !== id) })
  },
}))
