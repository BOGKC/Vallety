import { useState } from 'react'
import {
  PieChart, Users, Eye, Plus, UserPlus, ArrowRight, Lock, Copy, SplitSquareHorizontal,
} from 'lucide-react'
import toast from '../../components/Toast'
import {
  readHousehold, createHousehold, inviteUrl, memberInitials, type Household,
} from '../../shared/lib/household'

// ── Empty state ───────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: PieChart, title: 'Shared budgets',
    desc: 'Pool spending in shared categories and see combined progress.',
  },
  {
    icon: Users, title: 'Split expenses',
    desc: 'Log shared purchases and track who owes what without a separate app.',
  },
  {
    icon: Eye, title: 'Partner view',
    desc: 'Choose exactly what your partner can see — accounts, budgets, or transactions.',
  },
]

const STEPS = [
  { icon: Plus, text: 'You create a household' },
  { icon: UserPlus, text: 'Invite your partner' },
  { icon: Eye, text: 'Share what you choose' },
]

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div>
      <h1 className="text-[18px] font-semibold text-text-primary">Household</h1>
      <p className="mt-1 text-[14px] text-text-secondary">
        Manage shared finances with your partner or housemates
      </p>

      {/* Feature preview */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon
          return (
            <div
              key={f.title}
              className="flex flex-col items-center gap-2 rounded-lg border border-default bg-bg-card p-5 text-center"
            >
              <Icon className="h-6 w-6" style={{ color: 'var(--color-accent)' }} />
              <p className="text-[14px] font-semibold text-text-primary">{f.title}</p>
              <p className="text-[13px] text-text-secondary">{f.desc}</p>
            </div>
          )
        })}
      </div>

      {/* How it works */}
      <div className="mt-10 text-center">
        <p className="mb-2 text-[13px] text-text-muted">How it works</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={s.text} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-[12px] text-text-secondary">
                  <Icon className="h-3.5 w-3.5 text-text-muted" />
                  {s.text}
                </div>
                {i < STEPS.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-text-muted" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={onCreate}
          className="inline-flex h-12 min-w-[240px] items-center justify-center gap-2 rounded-md text-[15px] font-semibold text-white"
          style={{ backgroundColor: 'var(--color-accent)', transition: 'var(--transition-fast)' }}
        >
          <Users className="h-5 w-5" /> Create household
        </button>
      </div>
    </div>
  )
}

// ── Active state ──────────────────────────────────────────────────────────────

function LockedPlaceholder({
  icon: Icon, title,
}: { icon: typeof PieChart; title: string }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-default bg-bg-card p-5">
      <div className="pointer-events-none opacity-40">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
          <p className="text-[14px] font-semibold text-text-primary">{title}</p>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <div className="h-3 w-3/4 rounded bg-bg-elevated" />
          <div className="h-3 w-1/2 rounded bg-bg-elevated" />
          <div className="h-3 w-2/3 rounded bg-bg-elevated" />
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-elevated">
          <Lock className="h-4 w-4 text-text-muted" />
        </span>
        <p className="text-[12px] text-text-muted">Coming soon — invite a partner first</p>
      </div>
    </div>
  )
}

function ActiveState({ household }: { household: Household }) {
  const url = inviteUrl(household)

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Invite link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <div>
      <h1 className="text-[18px] font-semibold text-text-primary">Your household</h1>
      <p className="mt-1 text-[14px] text-text-secondary">
        Manage shared finances with your partner or housemates
      </p>

      {/* Members */}
      <section className="mt-6">
        <p className="mb-3 text-[13px] font-medium text-text-primary">Members</p>
        <div className="flex flex-wrap gap-5">
          {household.members.map((m) => (
            <div key={m} className="flex flex-col items-center gap-1.5">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full text-[15px] font-semibold text-white"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {memberInitials(m)}
              </span>
              <span className="text-[12px] text-text-secondary">{m}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Invite */}
      <section className="mt-6 rounded-lg border border-default bg-bg-card p-5">
        <p className="text-[14px] font-semibold text-text-primary">Invite partner</p>
        <p className="mt-1 text-[13px] text-text-secondary">
          Share this link to add someone to your household.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            readOnly
            value={url}
            className="h-10 flex-1 rounded-md border border-default bg-bg-input px-3 text-[13px] text-text-secondary"
          />
          <button
            onClick={copyInvite}
            className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Copy className="h-4 w-4" /> Copy
          </button>
        </div>
      </section>

      {/* Placeholders */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LockedPlaceholder icon={PieChart} title="Shared budgets" />
        <LockedPlaceholder icon={SplitSquareHorizontal} title="Split expenses" />
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export function HouseholdPage() {
  const [household, setHousehold] = useState<Household | null>(() => readHousehold())

  const handleCreate = () => {
    setHousehold(createHousehold())
    toast.success('Household created! Share the invite link to add a partner.')
  }

  return (
    <div className="mx-auto max-w-3xl">
      {household ? <ActiveState household={household} /> : <EmptyState onCreate={handleCreate} />}
    </div>
  )
}
