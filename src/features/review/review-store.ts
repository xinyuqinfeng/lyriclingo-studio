import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { schedule, newCard, type Rating } from './sm2'

export interface DueCard {
  cardId: string
  vocabularyId: string
  cardType: string
  baseForm: string
  meaning: string
  baseReading?: string | null
  language: string
}

export interface ReviewStats {
  todayDue: number
  mastered: number
}

interface ReviewState {
  cards: DueCard[]
  currentIndex: number
  revealed: boolean
  stats: ReviewStats
  loading: boolean
  error: string | null
  load: () => Promise<void>
  reveal: () => void
  rate: (rating: Rating) => Promise<void>
  reset: () => void
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  cards: [],
  currentIndex: 0,
  revealed: false,
  stats: { todayDue: 0, mastered: 0 },
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const cards = await invoke<DueCard[]>('get_due_cards', { limit: 20 })
      const stats = await invoke<ReviewStats>('review_stats')
      set({ cards, stats, currentIndex: 0, revealed: false, loading: false })
    } catch (e) {
      set({ loading: false, error: String(e) })
    }
  },

  reveal: () => set({ revealed: true }),

  rate: async (rating: Rating) => {
    const { cards, currentIndex } = get()
    const card = cards[currentIndex]
    const outcome = schedule(newCard(), rating)
    try {
      await invoke('rate_card', {
        input: {
          cardId: card.cardId,
          vocabularyId: card.vocabularyId,
          cardType: card.cardType,
          rating,
          interval: outcome.interval,
          ease: outcome.ease,
          step: outcome.step,
          dueAt: outcome.dueDate.toISOString(),
        },
      })
      if (currentIndex + 1 >= cards.length) {
        set({ cards: [], currentIndex: 0, revealed: false })
        get().load()
      } else {
        set({ currentIndex: currentIndex + 1, revealed: false })
      }
    } catch (e) {
      set({ error: String(e) })
    }
  },

  reset: () => set({ revealed: false, currentIndex: 0 }),
}))
