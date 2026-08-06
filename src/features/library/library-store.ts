import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'

export interface SongListEntry {
  id: string
  title: string
  artist: string
  language: string
  analysisStatus?: string | null
  analysisError?: string | null
  createdAt: string
}

interface LibraryState {
  songs: SongListEntry[]
  loading: boolean
  error: string | null
  loadSongs: () => Promise<void>
  deleteSong: (id: string) => Promise<void>
  updateStatus: (id: string, status: string, error?: string | null) => void
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  songs: [],
  loading: false,
  error: null,

  loadSongs: async () => {
    set({ loading: true, error: null })
    try {
      const songs = await invoke<SongListEntry[]>('list_songs')
      set({ songs, loading: false })
    } catch (e) {
      set({ loading: false, error: String(e) })
    }
  },

  deleteSong: async (id: string) => {
    try {
      await invoke('delete_song', { id })
      set({ songs: get().songs.filter((s) => s.id !== id) })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  updateStatus: (id, status, error) => {
    set({
      songs: get().songs.map((s) =>
        s.id === id ? { ...s, analysisStatus: status, analysisError: error ?? null } : s,
      ),
    })
  },
}))
