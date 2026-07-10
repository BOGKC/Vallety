import { describe, it, expect } from 'vitest'
import { computeGoal, computeGoals } from './goals'
import { makeGoal } from '../../test/factories'

const NOW = new Date('2026-06-15T12:00:00.000Z')

describe('computeGoal', () => {
  it('progress %, remaining are correct', () => {
    const v = computeGoal(makeGoal({ target: 10000, saved: 2500 }), NOW)
    expect(v.pct).toBeCloseTo(25, 6)
    expect(v.remaining).toBe(7500)
  })

  it('clamps pct at 100 when over-saved and remaining floors at 0', () => {
    const v = computeGoal(makeGoal({ target: 1000, saved: 1500 }), NOW)
    expect(v.pct).toBe(100)
    expect(v.remaining).toBe(0)
  })

  it('pct is 0 (not NaN) for a €0 target', () => {
    const v = computeGoal(makeGoal({ target: 0, saved: 100 }), NOW)
    expect(v.pct).toBe(0)
  })

  it('monthlyNeeded splits the remaining over the months until the target date', () => {
    const v = computeGoal(
      makeGoal({ target: 12000, saved: 0, targetDate: '2026-12-15T00:00:00.000Z' }),
      NOW,
    )
    // 6 calendar months June→December
    expect(v.monthlyNeeded).toBeCloseTo(2000, 0)
  })

  it('monthlyNeeded is 0 when there is no target date', () => {
    expect(computeGoal(makeGoal({ targetDate: '', saved: 0, target: 5000 }), NOW).monthlyNeeded).toBe(0)
  })
})

describe('computeGoals summary', () => {
  it('totals targets and counts', () => {
    const s = computeGoals([makeGoal({ target: 5000 }), makeGoal({ target: 3000 })], NOW)
    expect(s.count).toBe(2)
    expect(s.totalTarget).toBe(8000)
  })

  it('empty → zeroed summary', () => {
    const s = computeGoals([], NOW)
    expect(s).toMatchObject({ count: 0, totalTarget: 0, onTrackCount: 0 })
    expect(s.views).toEqual([])
  })
})
