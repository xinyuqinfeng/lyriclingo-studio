import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'

export interface WorkspaceToken {
  surface: string
  start: number
  end: number
  pos: string
  baseForm: string
  baseReading?: string | null
  reading?: string | null
  meaning: string
  contextualMeaning?: string | null
  conjugation?: string | null
  confirmed: boolean
}

export interface WorkspaceLine {
  line: {
    id: string
    songId: string
    seq: number
    text: string
    isSectionBreak: boolean
  }
  translation?: string | null
  readingText?: string | null
  grammarNotes?: string[] | null
  uncertainty?: string[] | null
  model?: string | null
  generatedAt?: string | null
  tokens: WorkspaceToken[]
}

export interface WorkspaceData {
  songId: string
  songTitle: string
  artist: string
  language: string
  lines: WorkspaceLine[]
}

interface WorkspaceState {
  data: WorkspaceData | null
  selectedIndex: number
  loading: boolean
  error: string | null
  load: (songId: string) => Promise<void>
  select: (index: number) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  data: null,
  selectedIndex: 0,
  loading: false,
  error: null,

  load: async (songId: string) => {
    set({ loading: true, error: null })
    try {
      const data = await invoke<WorkspaceData>('get_song_analysis', { songId })
      set({ data, selectedIndex: 0, loading: false })
    } catch (e) {
      set({ loading: false, error: String(e) })
    }
  },

  select: (index: number) => set({ selectedIndex: index }),
}))
