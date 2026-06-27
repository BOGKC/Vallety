export const HOUSEHOLD_KEY = 'vallety_household'

export interface Household {
  id: number
  createdAt: string
  members: string[]
}

export function readHousehold(): Household | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = window.localStorage.getItem(HOUSEHOLD_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const h = parsed as Partial<Household>
    if (h.id == null) return null
    return {
      id: Number(h.id),
      createdAt: String(h.createdAt ?? new Date().toISOString()),
      members: Array.isArray(h.members) && h.members.length > 0 ? h.members.map(String) : ['You'],
    }
  } catch {
    return null
  }
}

export function createHousehold(): Household {
  const household: Household = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    members: ['You'],
  }
  try {
    window.localStorage.setItem(HOUSEHOLD_KEY, JSON.stringify(household))
  } catch {
    /* ignore */
  }
  return household
}

export function inviteUrl(household: Household): string {
  return `${window.location.origin}/join/${household.id}`
}

export function memberInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
