import { describe, it, expect } from 'vitest'
import { schedule, newCard, type Rating } from '../sm2'

function daysUntil(d: Date): number {
  return Math.round((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
}

describe('SM-2 scheduling', () => {
  it('again resets interval and lowers ease', () => {
    const card = { interval: 30, ease: 2.5, step: 2 }
    const out = schedule(card, 'again')
    expect(out.interval).toBe(1)
    expect(out.ease).toBeCloseTo(2.3)
    expect(out.step).toBe(0)
    expect(daysUntil(out.dueDate)).toBe(1)
  })

  it('hard produces a modest interval increase', () => {
    const card = { interval: 6, ease: 2.5, step: 1 }
    const out = schedule(card, 'hard')
    expect(out.interval).toBe(7) // ceil(6 * 1.2)
    expect(out.ease).toBeCloseTo(2.35)
  })

  it('good on a fresh card gives the 6-day second interval', () => {
    const out = schedule(newCard(), 'good')
    expect(out.interval).toBe(6)
    expect(out.step).toBe(1)
  })

  it('good after a learned card multiplies by ease', () => {
    const card = { interval: 6, ease: 2.5, step: 1 }
    const out = schedule(card, 'good')
    expect(out.interval).toBe(Math.round(6 * 2.5))
    expect(out.ease).toBeCloseTo(2.5)
  })

  it('easy increases ease', () => {
    const out = schedule(newCard(), 'easy')
    expect(out.ease).toBeCloseTo(2.65)
    expect(out.step).toBe(2)
  })

  it('ease never drops below 1.3', () => {
    let card = { interval: 1, ease: 1.3, step: 0 }
    for (let i = 0; i < 5; i++) {
      card = schedule(card, 'again')
      expect(card.ease).toBeGreaterThanOrEqual(1.3)
    }
  })

  it('never produces a past due date', () => {
    for (const rating of ['again', 'hard', 'good', 'easy'] as Rating[]) {
      const before = Date.now()
      const out = schedule(newCard(), rating)
      expect(out.dueDate.getTime()).toBeGreaterThan(before)
    }
  })

  it('never produces negative interval', () => {
    let card = newCard()
    for (let i = 0; i < 20; i++) {
      card = schedule(card, 'again')
      expect(card.interval).toBeGreaterThanOrEqual(1)
    }
  })
})
