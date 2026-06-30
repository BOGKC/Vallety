import { differenceInCalendarMonths } from 'date-fns'
import {
  Home, Car, Plane, GraduationCap, Heart, Gift, Briefcase, MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'

// ── Storage ─────────────────────────────────────────────────────────────────

export const GOALS_KEY = 'vallety_goals'

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
  targetDate: string | '' // ISO or empty
  category: string
  createdAt: string
}

function normalize(raw: unknown): Goal | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const target = Number(r.target)
  if (!Number.isFinite(target)) return null
  return {
    id: String(r.id ?? `goal_${Date.now()}`),
    name: String(r.name ?? 'Goal'),
    target: Math.abs(target),
    saved: Math.max(0, Number(r.saved) || 0),
    targetDate: r.targetDate ? String(r.targetDate) : '',
    category: String(r.category ?? 'Other'),
    createdAt: String(r.createdAt ?? new Date().toISOString()),
  }
}

export function readGoals(): Goal[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(GOALS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalize).filter((g): g is Goal => g !== null)
  } catch {
    return []
  }
}

export function writeGoals(goals: Goal[]): void {
  try {
    window.localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
  } catch {
    /* ignore */
  }
}

export function addGoal(input: Omit<Goal, 'id' | 'createdAt'>): Goal[] {
  const goal: Goal = {
    ...input,
    target: Math.abs(input.target),
    saved: Math.max(0, input.saved),
    id: `goal_${Date.now()}_${Math.floor(performance.now())}`,
    createdAt: new Date().toISOString(),
  }
  const next = [...readGoals(), goal]
  writeGoals(next)
  return next
}

export function updateGoal(id: string, patch: Partial<Goal>): Goal[] {
  const next = readGoals().map((g) => (g.id === id ? { ...g, ...patch } : g))
  writeGoals(next)
  return next
}

export function deleteGoal(id: string): Goal[] {
  const next = readGoals().filter((g) => g.id !== id)
  writeGoals(next)
  return next
}

// ── Categories ──────────────────────────────────────────────────────────────

export const GOAL_CATEGORIES: { name: string; icon: LucideIcon }[] = [
  { name: 'House', icon: Home },
  { name: 'Car', icon: Car },
  { name: 'Travel', icon: Plane },
  { name: 'Education', icon: GraduationCap },
  { name: 'Health', icon: Heart },
  { name: 'Gift', icon: Gift },
  { name: 'Work', icon: Briefcase },
  { name: 'Other', icon: MoreHorizontal },
]

export function goalIcon(category: string): LucideIcon {
  return GOAL_CATEGORIES.find((c) => c.name === category)?.icon ?? MoreHorizontal
}

// ── Computation ───────────────────────────────────────────────────────────────

export interface GoalView extends Goal {
  pct: number // 0..100 (clamped)
  remaining: number
  monthlyNeeded: number
  onTrack: boolean
}

export function computeGoal(goal: Goal, now: Date): GoalView {
  const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0
  const remaining = Math.max(0, goal.target - goal.saved)

  let monthlyNeeded = 0
  if (remaining > 0 && goal.targetDate) {
    const monthsLeft = Math.max(1, differenceInCalendarMonths(new Date(goal.targetDate), now))
    monthlyNeeded = remaining / monthsLeft
  }

  let onTrack = true
  if (remaining > 0 && goal.targetDate) {
    const created = new Date(goal.createdAt).getTime()
    const target = new Date(goal.targetDate).getTime()
    const span = target - created
    if (span > 0) {
      const expectedPct = Math.min(1, Math.max(0, (now.getTime() - created) / span))
      onTrack = goal.target > 0 && goal.saved / goal.target >= expectedPct
    }
  }

  return { ...goal, pct, remaining, monthlyNeeded, onTrack }
}

export interface GoalsSummary {
  count: number
  totalTarget: number
  onTrackCount: number
  views: GoalView[]
}

export function computeGoals(goals: Goal[], now: Date): GoalsSummary {
  const views = goals.map((g) => computeGoal(g, now))
  return {
    count: goals.length,
    totalTarget: goals.reduce((a, g) => a + g.target, 0),
    onTrackCount: views.filter((v) => v.onTrack).length,
    views,
  }
}
