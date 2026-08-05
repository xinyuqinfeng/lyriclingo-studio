export type Rating = 'again' | 'hard' | 'good' | 'easy'

export interface CardState {
  interval: number
  ease: number
  step: number
}

export interface ReviewOutcome {
  interval: number
  ease: number
  step: number
  dueDate: Date
}

/**
 * SM-2 style spaced repetition scheduling.
 *
 * The standard algorithm uses a 0-5 quality grade. We adapt it to four
 * ratings: again / hard / good / easy.
 */
export function schedule(prev: CardState, rating: Rating): ReviewOutcome {
  let interval = prev.interval
  let ease = prev.ease
  let step = prev.step

  switch (rating) {
    case 'again':
      // Reset to the first step; interval 1 minute -> modeled as 1 day minimum.
      step = 0
      interval = 1
      ease = Math.max(1.3, ease - 0.2)
      break
    case 'hard':
      interval = Math.max(1, Math.round(interval * 1.2))
      ease = Math.max(1.3, ease - 0.15)
      step = 1
      break
    case 'good':
      interval = nextInterval(prev, step + 1)
      step = Math.min(2, step + 1)
      break
    case 'easy':
      interval = Math.max(1, Math.round(prev.interval * ease))
      ease = ease + 0.15
      step = 2
      break
  }

  const now = new Date()
  const dueDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000)
  return { interval, ease, step, dueDate }
}

function nextInterval(prev: CardState, newStep: number): number {
  if (newStep <= 0) return 1
  if (newStep === 1) return 6
  if (newStep === 2) return Math.max(1, Math.round(prev.interval * prev.ease))
  return Math.max(1, Math.round(prev.interval * prev.ease))
}

export function newCard(): CardState {
  return { interval: 0, ease: 2.5, step: 0 }
}
