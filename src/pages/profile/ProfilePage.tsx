import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { format, isToday } from 'date-fns'
import {
  ArrowUpRight, Bug, Camera, ChevronLeft, Globe, Info, Lightbulb,
  Wallet, Briefcase, TrendingUp, Check, Lock, Trash2, type LucideIcon,
} from 'lucide-react'
import toast from '../../components/Toast'
import { ValletyMark } from '../../components/ValletyLogo'
import { Modal } from '../../shared/components/Modal'
import { useAppStore } from '../../shared/store/appStore'
import { useAuthStore } from '../../shared/store/authStore'
import { CurrencyPicker } from '../../shared/components/CurrencyPicker'
import { getCurrency } from '../../lib/currencies'
import { notifyHomeCurrencyChanged } from '../../shared/hooks/useHomeCurrency'
import {
  applyOptimisticProfile, saveProfileToSupabase, mergeDbIntoLocal,
  uploadAvatar, removeAvatar, type ProfileSavePatch,
} from '../../shared/lib/profileSync'
import { MODE_COLORS } from '../../shared/lib/modeColors'
import { APP_VERSION_LABEL } from '../../shared/lib/version'
import { usePlan } from '../../shared/hooks/usePlan'
import { useUpgrade } from '../../components/premium/UpgradeModalProvider'
import { PremiumBadge } from '../../components/premium/PremiumBadge'
import { planLabel, type FeatureKey, type Tier } from '../../shared/lib/plans'
import type { AppMode } from '../../shared/types'
import { supabase } from '../../supabase/client'
import { readTransactions, TRANSACTIONS_KEY } from '../../shared/lib/transactions'
import { BUDGETS_KEY } from '../../shared/lib/budgets'
import { GOALS_KEY } from '../../shared/lib/goals'
import {
  saveProfilePatch, readPlan, storageUsedKb, collectAllData,
  clearAllValletyKeys, LAST_UPDATED_KEY,
  NEXT_BILLING_KEY, type ValletyProfile, type Plan, type LoyaltyCard,
} from '../../shared/lib/profile'
import {
  Section, Row, Toggle, Pills, SelectBox, TextField, TextArea,
  GhostBtn, AccentBtn, SolidDangerBtn, Collapse, ConfirmInline,
} from './primitives'

// ── Shared constants ──────────────────────────────────────────────────────────

type UpdateFn = (patch: ProfileSavePatch, tickKey?: string) => void
type Ticks = Record<string, number>

const currencySymbol = (code: string) => getCurrency(code)?.symbol ?? code

const BANKS = [
  'OP (Osuuspankki)', 'Nordea', 'S-Pankki', 'Danske Bank', 'Handelsbanken',
  'Aktia', 'POP Pankki', 'Säästöpankki', 'Ålandsbanken', 'Other',
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const PLAN_FEATURES: Record<Plan, string[]> = {
  Free: ['Transactions, budgets, bills & goals', 'CSV import from Finnish banks', 'Net worth tracking'],
  Personal: ['Everything in Free', 'Unlimited budgets & goals', 'Full transaction history', 'Household sharing'],
  Freelancer: ['Everything in Personal', 'Business profile & invoicing', 'VAT & YEL tracking'],
  Business: ['Everything in Freelancer', 'Multi-entity bookkeeping', 'Accountant export', 'Priority support'],
  Investor: ['Everything in Personal', 'Portfolio & watchlist tools', 'Scenario modelling'],
  'All Access': ['Every Vallety feature', 'All modes unlocked', 'Priority support'],
}

// ── Small utilities ───────────────────────────────────────────────────────────

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function csvEscape(v: unknown): string {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function formatIban(v: string): string {
  return v.replace(/\s+/g, '').toUpperCase().slice(0, 34).replace(/(.{4})/g, '$1 ').trim()
}

function browserInfo(): string {
  const ua = navigator.userAgent
  const browser = ua.includes('Edg') ? 'Edge'
    : ua.includes('Firefox') ? 'Firefox'
    : ua.includes('Chrome') ? 'Chrome'
    : ua.includes('Safari') ? 'Safari' : 'Browser'
  const os = ua.includes('Windows') ? 'Windows'
    : ua.includes('Android') ? 'Android'
    : /iPhone|iPad/.test(ua) ? 'iOS'
    : ua.includes('Mac') ? 'macOS'
    : ua.includes('Linux') ? 'Linux' : 'this device'
  return `${browser} on ${os}`
}

// ═══ SECTION 1 — Profile header ════════════════════════════════════════════════

// Reject anything over ~4 MB before we attempt an upload (and to keep the
// signed-out base64 fallback out of localStorage's ~5 MB ceiling).
const MAX_AVATAR_BYTES = 4 * 1024 * 1024

function ProfileHeader({ p, onAvatarSaved }: { p: ValletyProfile; onAvatarSaved: (url: string | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const { plan } = usePlan()

  const photo = p.avatar_url
  const initials = (p.full_name || 'V')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'V'

  const onPhoto = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file.'); return }
    if (file.size > MAX_AVATAR_BYTES) { toast.error('That image is too large — please choose one under 4 MB.'); return }
    setBusy(true)
    const res = await uploadAvatar(file)
    setBusy(false)
    if (res.ok && res.url) {
      onAvatarSaved(res.url)
      toast.success('Photo updated')
    } else {
      toast.error(res.error ? `Couldn't upload photo: ${res.error}` : "Couldn't upload photo. Please try again.")
    }
  }

  const onRemovePhoto = async () => {
    setBusy(true)
    const res = await removeAvatar()
    setBusy(false)
    if (res.ok) {
      onAvatarSaved(null)
      toast.success('Photo removed')
    } else {
      toast.error(res.error ? `Couldn't remove photo: ${res.error}` : "Couldn't remove photo. Please try again.")
    }
  }

  const memberSince = p.created_at ? format(new Date(p.created_at), 'MMMM yyyy') : ''

  return (
    <div
      className="flex items-center gap-5 p-6"
      style={{ backgroundColor: 'var(--bg-card)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="relative flex-shrink-0">
        {photo ? (
          <img src={photo} alt="Profile photo" className="h-[72px] w-[72px] rounded-full object-cover" />
        ) : (
          <div
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full text-[24px] font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #3B5BDB, #0F9D7A)' }}
          >
            {initials}
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          </div>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          aria-label={photo ? 'Change profile photo' : 'Add profile photo'}
          className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-default bg-bg-elevated text-text-secondary hover:text-text-primary disabled:opacity-50"
          style={{ minHeight: 24 }}
        >
          <Camera className="h-3 w-3" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPhoto(f); e.target.value = '' }}
        />
      </div>

      <div className="min-w-0">
        <p className="truncate text-[20px] font-semibold text-text-primary">{p.full_name || 'Your name'}</p>
        <p className="truncate text-[14px] text-text-muted">{p.email || 'Add your email below'}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {planLabel(plan)}
          </span>
          {memberSince && <span className="text-[12px] text-text-muted">Member since {memberSince}</span>}
          {photo && (
            <button
              type="button"
              onClick={() => void onRemovePhoto()}
              disabled={busy}
              className="inline-flex items-center gap-1 text-[12px] text-text-muted hover:text-text-primary disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" /> Remove photo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══ SECTION 2 — Personal information ══════════════════════════════════════════

function PersonalSection({ p, up, ticks }: { p: ValletyProfile; up: UpdateFn; ticks: Ticks }) {
  const joined = p.created_at ? format(new Date(p.created_at), 'd MMMM yyyy') : '—'
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailPending, setEmailPending] = useState<string | null>(null)

  // Email is an auth credential, not a profile column: changing it goes through
  // Supabase's confirmation flow (updateUser), which emails a verification link.
  // We never overwrite profiles.email directly here.
  const changeEmail = async (v: string) => {
    const next = v.trim().toLowerCase()
    if (!next || next === (p.email || '').toLowerCase()) return
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next)) { toast.error('Enter a valid email address.'); return }
    setEmailBusy(true)
    const { error } = await supabase.auth.updateUser({ email: next })
    setEmailBusy(false)
    if (error) { toast.error(error.message); return }
    setEmailPending(next)
    toast.success('Check your new email to confirm the change.')
  }

  return (
    <Section label="Personal information">
      <Row label="Full name" stamp={ticks.full_name}>
        <TextField initial={p.full_name} placeholder="Your full name"
          validate={(v) => (v.trim().length >= 2 ? null : 'Enter your name (at least 2 characters)')}
          onCommit={(v) => up({ full_name: v.trim() }, 'full_name')} />
      </Row>
      <Row
        label="Email address"
        sub={
          emailPending
            ? `Pending confirmation — check ${emailPending} to complete the change.`
            : 'Changing this sends a confirmation link to the new address.'
        }
      >
        <TextField initial={p.email} type="email" placeholder="your@email.com"
          disabled={emailBusy}
          validate={(v) => (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()) ? null : 'Enter a valid email address')}
          onCommit={(v) => void changeEmail(v)} />
      </Row>
      <Row label="Phone number" stamp={ticks.phone}>
        <TextField initial={p.phone} type="tel" placeholder="+358 40 123 4567 (optional)"
          onCommit={(v) => up({ phone: v }, 'phone')} />
      </Row>
      <Row label="Date joined">
        <span className="text-[13px] text-text-muted">{joined}</span>
      </Row>
    </Section>
  )
}

// ═══ SECTION 3 — App preferences ═══════════════════════════════════════════════

function PrefsSection({ p, up, ticks }: { p: ValletyProfile; up: UpdateFn; ticks: Ticks }) {
  return (
    <Section label="App preferences">
      <Row
        label="Home currency"
        stamp={ticks.home_currency}
        prefix={
          <span className="flex h-6 w-8 items-center justify-center rounded bg-bg-elevated text-[12px] font-semibold text-text-secondary">
            {currencySymbol(p.home_currency)}
          </span>
        }
      >
        <CurrencyPicker ariaLabel="Home currency" value={p.home_currency} className="sm:w-72"
          onChange={(v) => { up({ home_currency: v }, 'home_currency'); notifyHomeCurrencyChanged() }} />
      </Row>
      <Row label="Language" stamp={ticks.language} prefix={<Globe className="h-4 w-4 text-text-muted" />}>
        <SelectBox
          ariaLabel="Language"
          value={p.language}
          options={[
            { value: 'en', label: 'English' },
            { value: 'fi', label: 'Suomi (Finnish)' },
            { value: 'sv', label: 'Svenska (Swedish)' },
          ]}
          onChange={(v) => up({ language: v as ValletyProfile['language'] }, 'language')}
        />
      </Row>
      <Row label="Date format" stamp={ticks.date_format}>
        <Pills
          value={p.date_format}
          options={[{ value: 'DD.MM.YYYY', label: 'DD.MM.YYYY' }, { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' }]}
          onChange={(v) => up({ date_format: v }, 'date_format')}
        />
      </Row>
      <Row label="Number format" stamp={ticks.number_format}>
        <Pills
          value={p.number_format}
          options={[{ value: 'eu', label: '1.234,56' }, { value: 'us', label: '1,234.56' }]}
          onChange={(v) => up({ number_format: v }, 'number_format')}
        />
      </Row>
      <Row label="Theme" stamp={ticks.theme}>
        <Pills
          value={p.theme}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light', disabled: true, tooltip: 'Coming soon' },
            { value: 'system', label: 'System' },
          ]}
          onChange={(v) => up({ theme: v }, 'theme')}
        />
      </Row>
      <Row label="First day of week" stamp={ticks.week_start}>
        <Pills
          value={p.week_start}
          options={[{ value: 'monday', label: 'Monday' }, { value: 'sunday', label: 'Sunday' }]}
          onChange={(v) => up({ week_start: v }, 'week_start')}
        />
      </Row>
    </Section>
  )
}

// ═══ SECTION — Workspace mode ══════════════════════════════════════════════════
// Mode selection lives here (moved out of the sidebar) so it doesn't take up
// nav chrome. Picking a mode switches the active workspace, re-tints the accent
// and jumps to that mode's home.

const MODE_OPTIONS: {
  value: AppMode; label: string; icon: LucideIcon; desc: string; home: string
  feature?: FeatureKey; tier?: Tier
}[] = [
  { value: 'personal', label: 'Personal', icon: Wallet, home: '/', desc: 'Everyday budgeting, bills, goals and net worth.' },
  { value: 'business', label: 'Solo founder', icon: Briefcase, home: '/business', desc: 'Invoices, expenses, VAT & YEL for your business.', feature: 'business_mode', tier: 'freelancer' },
  { value: 'investment', label: 'Investor', icon: TrendingUp, home: '/investment', desc: 'Portfolio, watchlist and holdings tracking.', feature: 'investment_mode', tier: 'investor' },
]

function ModeSection({ navigate }: { navigate: (to: string) => void }) {
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)
  const { hasFeature } = usePlan()
  const { open: openUpgrade } = useUpgrade()

  const choose = (m: (typeof MODE_OPTIONS)[number]) => {
    // Premium modes (business / investor) open the upgrade modal when locked.
    if (m.feature && !hasFeature(m.feature)) {
      openUpgrade(m.tier)
      return
    }
    if (m.value !== mode) {
      setMode(m.value)
      // Persist the preference so it follows the user across sessions/devices.
      applyOptimisticProfile({ active_mode: m.value })
      void saveProfileToSupabase({ active_mode: m.value })
      toast.success(`Switched to ${m.label} mode`)
    }
    navigate(m.home)
  }

  return (
    <Section id="mode" label="Workspace mode">
      <div className="flex flex-col gap-2 p-3">
        {MODE_OPTIONS.map((m) => {
          const Icon = m.icon
          const active = mode === m.value
          const color = MODE_COLORS[m.value].accent
          const locked = m.feature ? !hasFeature(m.feature) : false
          return (
            <button
              key={m.value}
              onClick={() => choose(m)}
              aria-pressed={active}
              className="touch-target flex items-center gap-3 rounded-lg border p-3 text-left"
              style={{
                borderColor: active ? color : 'var(--border-default)',
                backgroundColor: active ? `${color}1A` : 'var(--bg-elevated)',
                transition: 'var(--transition-fast)',
              }}
            >
              <span
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${color}26` }}
              >
                <Icon className="h-5 w-5" style={{ color }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-[14px] font-medium text-text-primary">{m.label}</span>
                  {locked && m.tier && <PremiumBadge tier={m.tier} />}
                </span>
                <span className="block text-[12px] text-text-muted">{m.desc}</span>
              </span>
              {locked
                ? <Lock className="h-4 w-4 flex-shrink-0 text-text-muted" />
                : active && <Check className="h-5 w-5 flex-shrink-0" style={{ color }} />}
            </button>
          )
        })}
      </div>
    </Section>
  )
}

// ═══ SECTION 4 — Financial profile ═════════════════════════════════════════════

function FinancialSection({ p, up, ticks }: { p: ValletyProfile; up: UpdateFn; ticks: Ticks }) {
  const yearMode: 'january' | 'custom' = p.financial_year_start === 1 ? 'january' : 'custom'
  return (
    <Section label="Financial profile">
      <Row label="Monthly income" sub="Used to calculate your safe-to-spend amount accurately" stamp={ticks.monthly_income}>
        <TextField initial={p.monthly_income} prefix="€" placeholder="0.00" width={140}
          onCommit={(v) => up({ monthly_income: v }, 'monthly_income')} />
      </Row>
      <Row label="Primary bank" stamp={ticks.primary_bank}>
        <SelectBox
          ariaLabel="Primary bank"
          value={p.primary_bank}
          options={[{ value: '', label: 'Select your bank' }, ...BANKS.map((b) => ({ value: b, label: b }))]}
          onChange={(v) => up({ primary_bank: v }, 'primary_bank')}
        />
      </Row>
      <Row
        label="Municipality"
        sub="Used for Finnish income tax calculations (affects municipal tax rate)"
        prefix={<span aria-hidden>🇫🇮</span>}
        stamp={ticks.municipality}
      >
        <TextField initial={p.municipality} placeholder="Helsinki"
          onCommit={(v) => up({ municipality: v }, 'municipality')} />
      </Row>
      <Row label="Financial year start" stamp={ticks.financial_year_start}>
        <Pills
          value={yearMode}
          options={[{ value: 'january', label: 'January' }, { value: 'custom', label: 'Custom' }]}
          onChange={(v) => up({ financial_year_start: v === 'january' ? 1 : 2 }, 'financial_year_start')}
        />
        {yearMode === 'custom' && (
          <SelectBox
            ariaLabel="Financial year start month"
            value={String(p.financial_year_start)}
            options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
            onChange={(v) => up({ financial_year_start: Number(v) }, 'financial_year_start')}
          />
        )}
      </Row>
    </Section>
  )
}

// ═══ SECTION 5 — Business profile ══════════════════════════════════════════════

function BusinessSection({ p, up, ticks }: { p: ValletyProfile; up: UpdateFn; ticks: Ticks }) {
  const yError =
    p.y_tunnus && !/^\d{7}-\d$/.test(p.y_tunnus)
      ? 'Y-tunnus format should be 1234567-8'
      : null

  return (
    <Section
      id="business"
      label="Business profile"
      badge={
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
          style={{ backgroundColor: '#0F9D7A' }}
        >
          Business mode
        </span>
      }
    >
      <Row label="Enable business profile" sub="Invoicing, VAT and YEL tools for Finnish entrepreneurs" stamp={ticks.business_enabled}>
        <Toggle ariaLabel="Enable business profile" checked={p.business_enabled}
          onChange={(v) => up({ business_enabled: v }, 'business_enabled')} />
      </Row>

      <Collapse open={p.business_enabled} maxH={1400}>
        <div className="divide-y divide-[rgba(255,255,255,0.05)] border-t border-[rgba(255,255,255,0.05)]">
          <Row label="Business name" stamp={ticks.business_name}>
            <TextField initial={p.business_name} placeholder="Your business name"
              onCommit={(v) => up({ business_name: v }, 'business_name')} />
          </Row>
          <Row label="Y-tunnus (Business ID)" sub="Finnish business registration number" stamp={ticks.y_tunnus}>
            <TextField initial={p.y_tunnus} placeholder="1234567-8" width={140} error={yError}
              onCommit={(v) => up({ y_tunnus: v }, 'y_tunnus')} />
          </Row>
          <Row label="Business type" stamp={ticks.business_type}>
            <SelectBox
              ariaLabel="Business type"
              value={p.business_type}
              options={[
                { value: '', label: 'None' },
                { value: 'toiminimi', label: 'Toiminimi (sole trader)' },
                { value: 'oy', label: 'Osakeyhtiö (OY)' },
                { value: 'freelancer', label: 'Freelancer' },
                { value: 'kevytyrittaja', label: 'Kevytyrittäjä' },
              ]}
              onChange={(v) => up({ business_type: v as ValletyProfile['business_type'] }, 'business_type')}
            />
          </Row>
          <Row label="VAT registered (ALV)" sub="Toggle on if you are registered for value-added tax in Finland" stamp={ticks.vat_registered}>
            <Toggle ariaLabel="VAT registered" checked={p.vat_registered}
              onChange={(v) => up({ vat_registered: v }, 'vat_registered')} />
          </Row>
          {p.vat_registered && (
            <Row label="VAT filing frequency" stamp={ticks.vat_frequency}>
              <Pills
                value={p.vat_frequency}
                options={[
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'annual', label: 'Annual' },
                ]}
                onChange={(v) => up({ vat_frequency: v }, 'vat_frequency')}
              />
            </Row>
          )}
          <Row
            label={
              <>
                YEL income
                <Info
                  className="h-3.5 w-3.5 text-text-muted"
                  aria-label="About YEL income"
                >
                  <title>
                    YEL income is a self-declared amount used to calculate your pension contribution. It does not need to match your actual revenue.
                  </title>
                </Info>
              </>
            }
            sub="Your self-declared YEL pension income (separate from actual earnings)"
            stamp={ticks.yel_income}
          >
            <TextField initial={p.yel_income} prefix="€" placeholder="0.00" width={140}
              onCommit={(v) => up({ yel_income: v }, 'yel_income')} />
          </Row>
          <Row label="Age bracket" sub="Determines your YEL contribution rate" stamp={ticks.age_bracket}>
            <Pills
              value={p.age_bracket}
              options={[
                { value: 'under53', label: 'Under 53' },
                { value: '53-62', label: '53–62' },
                { value: 'over62', label: 'Over 62' },
              ]}
              onChange={(v) => up({ age_bracket: v }, 'age_bracket')}
            />
          </Row>
          <Row label="Default invoice currency" stamp={ticks.invoice_currency}>
            <CurrencyPicker ariaLabel="Invoice currency" value={p.invoice_currency} className="sm:w-72"
              onChange={(v) => up({ invoice_currency: v }, 'invoice_currency')} />
          </Row>
          <Row label="Default payment terms" stamp={ticks.payment_terms}>
            <Pills
              value={p.payment_terms}
              options={[
                { value: '14', label: '14 days' },
                { value: '30', label: '30 days' },
                { value: 'custom', label: 'Custom' },
              ]}
              onChange={(v) => up({ payment_terms: v }, 'payment_terms')}
            />
            {p.payment_terms === 'custom' && (
              <TextField initial={p.payment_terms_custom} type="number" placeholder="days" width={90}
                onCommit={(v) => up({ payment_terms_custom: v }, 'payment_terms')} />
            )}
          </Row>
          <Row label="IBAN" sub="Shown on your invoices" stamp={ticks.iban}>
            <TextField initial={p.iban} placeholder="FI12 3456 7890 1234 56" width={260} transform={formatIban}
              onCommit={(v) => up({ iban: v }, 'iban')} />
          </Row>
          <Row label="BIC/SWIFT" sub="Your bank's BIC code" stamp={ticks.bic}>
            <TextField initial={p.bic} placeholder="OKOYFIHH" width={140}
              onCommit={(v) => up({ bic: v.toUpperCase() }, 'bic')} />
          </Row>
          <Row label="Business address" sub="Shown on your invoices" stamp={ticks.business_address} stack>
            <TextArea initial={p.business_address} placeholder={'Street address\nCity\nPostal code'}
              onCommit={(v) => up({ business_address: v }, 'business_address')} />
          </Row>
        </div>
      </Collapse>
    </Section>
  )
}

// ═══ SECTION 6 — Notifications ═════════════════════════════════════════════════

function NotificationsSection({ p, up, ticks }: { p: ValletyProfile; up: UpdateFn; ticks: Ticks }) {
  const n = p.notifications
  const setN = (patch: Partial<ValletyProfile['notifications']>) =>
    up({ notifications: { ...n, ...patch } }, 'notifications')

  return (
    <Section label="Notifications">
      <Row label="Bill reminders" sub="Remind me before bills are due" stamp={ticks.notifications}>
        <Toggle ariaLabel="Bill reminders" checked={n.bill_reminders}
          onChange={(v) => setN({ bill_reminders: v })} />
      </Row>
      <Collapse open={n.bill_reminders} maxH={90}>
        <div className="px-5 pb-3.5 pt-1">
          <Pills
            value={n.bill_reminder_timing}
            options={[
              { value: '3d', label: '3 days before' },
              { value: '1d', label: '1 day before' },
              { value: 'both', label: 'Both' },
            ]}
            onChange={(v) => setN({ bill_reminder_timing: v })}
          />
        </div>
      </Collapse>

      <Row label="Budget warnings" sub="Alert when I'm close to a budget limit">
        <Toggle ariaLabel="Budget warnings" checked={n.budget_warnings}
          onChange={(v) => setN({ budget_warnings: v })} />
      </Row>
      <Collapse open={n.budget_warnings} maxH={90}>
        <div className="px-5 pb-3.5 pt-1">
          <Pills
            value={n.budget_threshold}
            options={[
              { value: 70, label: 'At 70%' },
              { value: 80, label: 'At 80%' },
              { value: 90, label: 'At 90%' },
            ]}
            onChange={(v) => setN({ budget_threshold: v as 70 | 80 | 90 })}
          />
        </div>
      </Collapse>

      <Row label="Goal milestones" sub="Celebrate when I hit a savings milestone — notified at 25%, 50%, 75%, and 100%">
        <Toggle ariaLabel="Goal milestones" checked={n.goal_milestones}
          onChange={(v) => setN({ goal_milestones: v })} />
      </Row>

      {p.business_enabled && (
        <Row label="Overdue invoice alerts" sub="Notify me when a client invoice is overdue">
          <Toggle ariaLabel="Overdue invoice alerts" checked={n.overdue_invoices}
            onChange={(v) => setN({ overdue_invoices: v })} />
        </Row>
      )}

      <Row label="Subscription price changes" sub="Alert when a recurring charge increases">
        <Toggle ariaLabel="Subscription price changes" checked={n.subscription_price_changes}
          onChange={(v) => setN({ subscription_price_changes: v })} />
      </Row>
      <Row label="Monthly summary" sub="Receive a monthly financial recap — sent on the 1st of each month">
        <Toggle ariaLabel="Monthly summary" checked={n.monthly_summary}
          onChange={(v) => setN({ monthly_summary: v })} />
      </Row>
      <Row label="Unusual spending" sub="Alert when a transaction is unusually large for its category">
        <Toggle ariaLabel="Unusual spending" checked={n.unusual_spending}
          onChange={(v) => setN({ unusual_spending: v })} />
      </Row>
    </Section>
  )
}

// ═══ SECTION 7 — Privacy & security ════════════════════════════════════════════

function SecuritySection({ navigate }: { navigate: (to: string) => void }) {
  const [pwOpen, setPwOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [twoFa, setTwoFa] = useState(false)
  const [sessionsOpen, setSessionsOpen] = useState(false)
  const device = useMemo(() => browserInfo(), [])

  const savePassword = async () => {
    if (next.length < 8) { toast.error('New password must be at least 8 characters.'); return }
    if (next !== confirm) { toast.error("New passwords don't match."); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: next })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Password updated')
    setCurrent(''); setNext(''); setConfirm(''); setPwOpen(false)
  }

  const pwInput =
    'h-9 w-full rounded-md border border-default bg-bg-input px-3 text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent sm:w-[240px]'

  return (
    <Section label="Privacy & security">
      <Row label="Change password" sub="Update your account password">
        <GhostBtn onClick={() => setPwOpen((v) => !v)}>Change</GhostBtn>
      </Row>
      <Collapse open={pwOpen} maxH={260}>
        <div className="flex flex-col gap-2 px-5 pb-4 pt-1">
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)}
            placeholder="Current password" autoComplete="current-password" className={pwInput} />
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)}
            placeholder="New password (min. 8 characters)" autoComplete="new-password" className={pwInput} />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password" autoComplete="new-password" className={pwInput} />
          <div>
            <AccentBtn onClick={savePassword} disabled={saving}>{saving ? 'Saving…' : 'Save password'}</AccentBtn>
          </div>
        </div>
      </Collapse>

      <Row label="Two-factor authentication" sub="Add an extra layer of security to your account">
        <Toggle ariaLabel="Two-factor authentication" checked={twoFa} onChange={setTwoFa} />
      </Row>
      <Collapse open={twoFa} maxH={90}>
        <div className="px-5 pb-3.5">
          <p className="rounded-md bg-bg-elevated px-3 py-2 text-[12px] text-text-secondary">
            2FA setup coming soon — your account is using password authentication only.
          </p>
        </div>
      </Collapse>

      <Row label="Active sessions" sub="Where you're signed in">
        <GhostBtn onClick={() => setSessionsOpen((v) => !v)}>{sessionsOpen ? 'Hide' : 'View'}</GhostBtn>
      </Row>
      <Collapse open={sessionsOpen} maxH={160}>
        <div className="flex flex-col gap-2 px-5 pb-4">
          <div className="flex items-center justify-between rounded-md bg-bg-elevated px-3 py-2.5">
            <span className="text-[13px] text-text-primary">This device — {device}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: 'var(--color-success-muted)', color: 'var(--color-success)' }}
            >
              Active now
            </span>
          </div>
          <div>
            <GhostBtn danger disabled title="No other active sessions">Sign out all other devices</GhostBtn>
          </div>
        </div>
      </Collapse>

      <Row label="Household data sharing" sub="Control what your household partner can see">
        <GhostBtn onClick={() => navigate('/household')}>Manage</GhostBtn>
      </Row>
    </Section>
  )
}

// ═══ SECTION 8 — Connected accounts ════════════════════════════════════════════

function LoyaltyRow({
  letter, color, label, desc, card, onSave, onRemove,
}: {
  letter: string
  color: string
  label: string
  desc: string
  card?: LoyaltyCard
  onSave: (card: LoyaltyCard) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const [num, setNum] = useState('')
  return (
    <>
      <Row
        label={label}
        sub={desc}
        prefix={
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {letter}
          </span>
        }
      >
        {card ? (
          <>
            <span className="text-[13px] text-text-secondary">
              •••• {card.number.slice(-4)}
              {typeof card.points === 'number' ? ` · ~${card.points} pts` : ''}
            </span>
            <GhostBtn onClick={onRemove}>Remove</GhostBtn>
          </>
        ) : (
          <GhostBtn onClick={() => setOpen((v) => !v)}>Add card</GhostBtn>
        )}
      </Row>
      <Collapse open={open && !card} maxH={90}>
        <div className="flex flex-wrap items-center gap-2 px-5 pb-4">
          <input
            value={num}
            onChange={(e) => setNum(e.target.value.replace(/[^\d ]/g, ''))}
            placeholder="Card number"
            className="h-9 w-full rounded-md border border-default bg-bg-input px-3 text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent sm:w-[220px]"
          />
          <AccentBtn
            disabled={num.replace(/\s/g, '').length < 4}
            onClick={() => { onSave({ number: num.replace(/\s/g, ''), points: 0 }); setNum(''); setOpen(false) }}
          >
            Save
          </AccentBtn>
        </div>
      </Collapse>
    </>
  )
}

function ConnectionsSection({ p, up }: { p: ValletyProfile; up: UpdateFn }) {
  const [bankSheet, setBankSheet] = useState(false)

  const setLoyalty = (key: keyof ValletyProfile['loyalty'], card?: LoyaltyCard) =>
    up({ loyalty: { ...p.loyalty, [key]: card } }, 'loyalty')

  return (
    <Section label="Connected accounts & integrations">
      <Row label="Finnish bank" sub={p.primary_bank ? p.primary_bank : 'No bank connected'}>
        {p.primary_bank ? (
          <>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: 'var(--color-success-muted)', color: 'var(--color-success)' }}
            >
              Connected
            </span>
            <GhostBtn onClick={() => up({ primary_bank: '' })}>Disconnect</GhostBtn>
          </>
        ) : (
          <GhostBtn accent onClick={() => setBankSheet((v) => !v)}>Connect</GhostBtn>
        )}
      </Row>
      <Collapse open={bankSheet && !p.primary_bank} maxH={140}>
        <div className="px-5 pb-4">
          <div className="rounded-md bg-bg-elevated px-3 py-2.5">
            <p className="text-[13px] text-text-secondary">
              Bank sync via open banking (PSD2) is coming soon. For now, import your transactions
              using a CSV export from your bank's online service.
            </p>
            <div className="mt-2">
              <GhostBtn onClick={() => setBankSheet(false)}>Got it</GhostBtn>
            </div>
          </div>
        </div>
      </Collapse>

      <LoyaltyRow letter="K" color="#F26F21" label="K-Plussa"
        desc="Automatically tag K-Group transactions and track points"
        card={p.loyalty.kplussa}
        onSave={(c) => setLoyalty('kplussa', c)}
        onRemove={() => setLoyalty('kplussa', undefined)} />
      <LoyaltyRow letter="S" color="#0F9D58" label="S-Etukortti"
        desc="Tag S-Group transactions and track cashback"
        card={p.loyalty.setukortti}
        onSave={(c) => setLoyalty('setukortti', c)}
        onRemove={() => setLoyalty('setukortti', undefined)} />
      <LoyaltyRow letter="L" color="#0050AA" label="Lidl Plus"
        desc="Tag Lidl transactions and rewards"
        card={p.loyalty.lidl}
        onSave={(c) => setLoyalty('lidl', c)}
        onRemove={() => setLoyalty('lidl', undefined)} />
      <LoyaltyRow letter="F" color="#2A2A72" label="Finnair Plus"
        desc="Track Finnair miles earned on business travel"
        card={p.loyalty.finnair}
        onSave={(c) => setLoyalty('finnair', c)}
        onRemove={() => setLoyalty('finnair', undefined)} />
    </Section>
  )
}

// ═══ SECTION 9 — Data & export ═════════════════════════════════════════════════

interface ImportPreview {
  data: Record<string, unknown>
  txns: number
  budgets: number
  goals: number
}

function DataSection({ p }: { p: ValletyProfile }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const today = () => format(new Date(), 'yyyy-MM-dd')

  const exportTransactions = () => {
    const txns = readTransactions()
    if (txns.length === 0) { toast.info('No transactions to export yet.'); return }
    const header = 'Date,Merchant,Amount,Currency,Category,Type,Notes'
    const rows = txns.map((t) =>
      [t.date, t.merchant, t.amount, 'EUR', t.category, t.type, t.notes ?? ''].map(csvEscape).join(',')
    )
    download(`vallety-transactions-${today()}.csv`, [header, ...rows].join('\n'), 'text/csv')
    toast.success(`Exported ${txns.length} transactions`)
  }

  const exportBusiness = () => {
    // Business records (invoices/expenses/mileage) ship in a later milestone —
    // export whichever keys exist today, one CSV per collection.
    const keys = ['vallety_invoices', 'vallety_expenses', 'vallety_mileage']
    let exported = 0
    for (const key of keys) {
      try {
        const raw = window.localStorage.getItem(key)
        if (!raw) continue
        const arr = JSON.parse(raw)
        if (!Array.isArray(arr) || arr.length === 0) continue
        const cols = Array.from(new Set(arr.flatMap((r: object) => Object.keys(r))))
        const rows = arr.map((r: Record<string, unknown>) => cols.map((c) => csvEscape(r[c])).join(','))
        download(`vallety-${key.replace('vallety_', '')}-${today()}.csv`, [cols.join(','), ...rows].join('\n'), 'text/csv')
        exported++
      } catch { /* skip malformed */ }
    }
    if (exported === 0) toast.info('No business records yet — invoices, expenses and mileage will export here once created.')
    else toast.success(`Exported ${exported} business file${exported === 1 ? '' : 's'}`)
  }

  const exportAll = () => {
    download(`vallety-data-export-${today()}.json`, JSON.stringify(collectAllData(), null, 2), 'application/json')
    toast.success('Full data export downloaded')
  }

  const onImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('bad shape')
        const count = (k: string) => (Array.isArray(data[k]) ? (data[k] as unknown[]).length : 0)
        setPreview({
          data,
          txns: count(TRANSACTIONS_KEY),
          budgets: count(BUDGETS_KEY),
          goals: count(GOALS_KEY),
        })
      } catch {
        toast.error("That file doesn't look like a Vallety export.")
      }
    }
    reader.readAsText(file)
  }

  const runImport = () => {
    if (!preview) return
    const mergeArray = (key: string) => {
      try {
        const incoming = preview.data[key]
        if (!Array.isArray(incoming)) return
        const raw = window.localStorage.getItem(key)
        const existing: { id?: string }[] = raw ? JSON.parse(raw) : []
        const seen = new Set(existing.map((r) => r?.id).filter(Boolean))
        const merged = [...existing, ...(incoming as { id?: string }[]).filter((r) => !r?.id || !seen.has(r.id))]
        window.localStorage.setItem(key, JSON.stringify(merged))
      } catch { /* skip */ }
    }
    const arrayKeys = [TRANSACTIONS_KEY, BUDGETS_KEY, GOALS_KEY, 'vallety_bills', 'vallety_accounts', 'vallety_subscriptions']
    arrayKeys.forEach(mergeArray)
    // Any other vallety_* keys: only fill gaps, never overwrite.
    for (const [key, value] of Object.entries(preview.data)) {
      if (!key.startsWith('vallety_') || arrayKeys.includes(key)) continue
      try {
        if (window.localStorage.getItem(key) == null) {
          window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
        }
      } catch { /* skip */ }
    }
    setPreview(null)
    toast.success('Backup imported — reloading…')
    window.setTimeout(() => window.location.reload(), 900)
  }

  return (
    <Section label="Your data">
      <Row label="Export transactions" sub="Download all your transactions as a CSV file">
        <GhostBtn onClick={exportTransactions}>Export CSV</GhostBtn>
      </Row>
      {p.business_enabled && (
        <Row label="Export business data" sub="Download invoices, expenses, and mileage as CSV">
          <GhostBtn onClick={exportBusiness}>Export CSV</GhostBtn>
        </Row>
      )}
      <Row label="Export all data (GDPR)" sub="Download everything Vallety knows about you as a JSON file">
        <GhostBtn onClick={exportAll}>Export JSON</GhostBtn>
      </Row>
      <Row label="Import from backup" sub="Restore data from a previous Vallety JSON export">
        <GhostBtn onClick={() => fileRef.current?.click()}>Import</GhostBtn>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportFile(f); e.target.value = '' }}
        />
      </Row>
      <Collapse open={!!preview} maxH={140}>
        <div className="px-5 pb-4">
          <p className="mb-2 text-[13px] text-text-secondary">
            This will merge {preview?.txns ?? 0} transactions, {preview?.budgets ?? 0} budgets, and{' '}
            {preview?.goals ?? 0} goals with your existing data. Duplicates will be skipped. Continue?
          </p>
          <div className="flex gap-2">
            <AccentBtn onClick={runImport}>Import</AccentBtn>
            <GhostBtn onClick={() => setPreview(null)}>Cancel</GhostBtn>
          </div>
        </div>
      </Collapse>
    </Section>
  )
}

// ═══ SECTION 10 — Plan & billing ═══════════════════════════════════════════════

function BillingSection() {
  const plan = useMemo(() => readPlan(), [])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [upgradeNote, setUpgradeNote] = useState(false)
  const nextBilling = useMemo(() => {
    try { return window.localStorage.getItem(NEXT_BILLING_KEY) } catch { return null }
  }, [])
  const isFree = plan === 'Free'

  return (
    <Section id="billing" label="Plan & billing">
      {/* Current plan card */}
      <div className="p-5" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span
              className="rounded-full px-3 py-1 text-[14px] font-semibold text-white"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {plan}
            </span>
            <ul className="mt-3 space-y-1">
              {PLAN_FEATURES[plan].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[13px] text-text-secondary">
                  <span className="h-1 w-1 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          {isFree
            ? <AccentBtn onClick={() => setUpgradeNote((v) => !v)}>Upgrade</AccentBtn>
            : <GhostBtn onClick={() => setUpgradeNote((v) => !v)}>Manage plan</GhostBtn>}
        </div>
        <Collapse open={upgradeNote} maxH={70}>
          <p className="mt-3 rounded-md bg-bg-card px-3 py-2 text-[12px] text-text-secondary">
            Paid plans are coming soon — during the MVP everything is free. 🎉
          </p>
        </Collapse>
      </div>

      <Row label="Next billing date" sub="Your subscription renews automatically">
        <span className="text-[13px] text-text-muted">
          {isFree || !nextBilling ? '—' : format(new Date(nextBilling), 'd MMMM yyyy')}
        </span>
      </Row>

      <Row label="Payment method">
        <span className="text-[13px] text-text-muted">No payment method</span>
      </Row>

      <Row label="Billing history">
        <GhostBtn onClick={() => setHistoryOpen((v) => !v)}>{historyOpen ? 'Hide' : 'View'}</GhostBtn>
      </Row>
      <Collapse open={historyOpen} maxH={80}>
        <p className="px-5 pb-4 text-[13px] text-text-muted">No invoices yet</p>
      </Collapse>

      {!isFree && (
        <>
          <Row label="Cancel subscription" sub="You'll keep access until the end of your billing period">
            <GhostBtn danger onClick={() => setCancelOpen((v) => !v)}>Cancel plan</GhostBtn>
          </Row>
          <Collapse open={cancelOpen} maxH={120}>
            <div className="px-5 pb-4">
              <p className="mb-2 text-[13px] text-text-secondary">
                Are you sure? You'll lose access to your {plan} features at the end of your current period.
              </p>
              <div className="flex gap-2">
                <AccentBtn onClick={() => setCancelOpen(false)}>Keep my plan</AccentBtn>
                <GhostBtn danger onClick={() => { setCancelOpen(false); toast.info('Cancellation will be available once billing launches.') }}>
                  Yes, cancel
                </GhostBtn>
              </div>
            </div>
          </Collapse>
        </>
      )}
    </Section>
  )
}

// ═══ SECTION 11 — Danger zone ══════════════════════════════════════════════════

function DangerSection({
  p, onAccountDeleted, navigate,
}: { p: ValletyProfile; onAccountDeleted: () => void; navigate: (to: string) => void }) {
  const [confirm, setConfirm] = useState<'' | 'txns' | 'business' | 'reset' | 'account'>('')

  const deleteTransactions = () => {
    try { window.localStorage.removeItem(TRANSACTIONS_KEY) } catch { /* ignore */ }
    setConfirm('')
    toast.success('All transactions deleted')
  }

  const deleteBusiness = () => {
    ;['vallety_invoices', 'vallety_expenses', 'vallety_clients', 'vallety_mileage'].forEach((k) => {
      try { window.localStorage.removeItem(k) } catch { /* ignore */ }
    })
    saveProfilePatch({ business_enabled: false, business_name: '', y_tunnus: '', business_address: '' })
    setConfirm('')
    toast.success('All business data deleted')
  }

  const resetApp = () => {
    clearAllValletyKeys()
    setConfirm('')
    toast.success('App reset to defaults')
    navigate('/')
  }

  const deleteAccount = () => {
    try { window.localStorage.clear() } catch { /* ignore */ }
    onAccountDeleted()
  }

  return (
    <Section id="danger" label="Danger zone" danger>
      <Row danger label="Delete all transactions"
        sub="Permanently removes all your transaction history. This cannot be undone.">
        <GhostBtn danger onClick={() => setConfirm(confirm === 'txns' ? '' : 'txns')}>Delete transactions</GhostBtn>
      </Row>
      <ConfirmInline open={confirm === 'txns'} word="DELETE" prompt="Type DELETE to confirm"
        actionLabel="Confirm delete" onConfirm={deleteTransactions} onCancel={() => setConfirm('')} />

      <Row danger label="Delete all business data"
        sub="Permanently removes all invoices, expenses, clients, and mileage records.">
        <GhostBtn danger onClick={() => setConfirm(confirm === 'business' ? '' : 'business')}>Delete business data</GhostBtn>
      </Row>
      <ConfirmInline open={confirm === 'business'} word="DELETE" prompt="Type DELETE to confirm"
        actionLabel="Confirm delete" onConfirm={deleteBusiness} onCancel={() => setConfirm('')} />

      <Row danger label="Reset entire app"
        sub="Removes all your data and returns the app to its initial state. Everything will be lost.">
        <GhostBtn danger onClick={() => setConfirm(confirm === 'reset' ? '' : 'reset')}>Reset Vallety</GhostBtn>
      </Row>
      <ConfirmInline open={confirm === 'reset'} word="RESET" prompt="Type RESET to confirm"
        actionLabel="Confirm reset" onConfirm={resetApp} onCancel={() => setConfirm('')} />

      <Row danger label="Delete my account"
        sub="Permanently deletes your account and all associated data. Under GDPR, this will be completed within 30 days.">
        <SolidDangerBtn onClick={() => setConfirm(confirm === 'account' ? '' : 'account')}>Delete account</SolidDangerBtn>
      </Row>
      <ConfirmInline
        open={confirm === 'account'}
        word={p.email || 'DELETE'}
        caseSensitive={false}
        prompt={p.email ? 'Type your email address to confirm' : 'No email on file — type DELETE to confirm'}
        actionLabel="I understand, delete my account"
        solid
        onConfirm={deleteAccount}
        onCancel={() => setConfirm('')}
      />
    </Section>
  )
}

// ═══ SECTION 12 — About ════════════════════════════════════════════════════════

function AboutSection() {
  const [legal, setLegal] = useState<'privacy' | 'terms' | null>(null)
  const [bugOpen, setBugOpen] = useState(false)
  const [featOpen, setFeatOpen] = useState(false)
  const [bugText, setBugText] = useState('')
  const [featText, setFeatText] = useState('')

  const lastUpdated = useMemo(() => {
    try {
      const raw = window.localStorage.getItem(LAST_UPDATED_KEY)
      if (!raw) return 'Just now'
      const d = new Date(raw)
      if (Number.isNaN(d.getTime())) return 'Just now'
      return isToday(d) ? `Today at ${format(d, 'HH:mm')}` : `${format(d, 'd MMM')} at ${format(d, 'HH:mm')}`
    } catch {
      return 'Just now'
    }
  }, [])
  const storageKb = useMemo(() => storageUsedKb(), [])

  const areaClass =
    'w-full resize-none rounded-md border border-default bg-bg-input px-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent'

  return (
    <Section label="About">
      <Row label="Version"><span className="text-[13px] text-text-muted">{APP_VERSION_LABEL}</span></Row>
      <Row label="Last updated"><span className="text-[13px] text-text-muted">{lastUpdated}</span></Row>
      <Row label="Local storage used"><span className="text-[13px] text-text-muted">{storageKb.toFixed(1)} KB</span></Row>

      <Row label="Privacy policy">
        <button type="button" aria-label="Open privacy policy" onClick={() => setLegal('privacy')}
          className="text-text-muted hover:text-text-primary">
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </Row>
      <Row label="Terms of service">
        <button type="button" aria-label="Open terms of service" onClick={() => setLegal('terms')}
          className="text-text-muted hover:text-text-primary">
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </Row>
      <Row label="Help center">
        <a href="#" aria-label="Open help center" className="text-text-muted hover:text-text-primary">
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </Row>

      <Row label="Report a bug" prefix={<Bug className="h-4 w-4 text-text-muted" />}>
        <GhostBtn onClick={() => setBugOpen((v) => !v)}>Report</GhostBtn>
      </Row>
      <Collapse open={bugOpen} maxH={160}>
        <div className="flex flex-col gap-2 px-5 pb-4">
          <textarea rows={3} value={bugText} onChange={(e) => setBugText(e.target.value)}
            placeholder="Describe the bug..." className={areaClass} />
          <div>
            <AccentBtn disabled={!bugText.trim()}
              onClick={() => { setBugText(''); setBugOpen(false); toast.success("Thanks! We'll look into it.") }}>
              Send report
            </AccentBtn>
          </div>
        </div>
      </Collapse>

      <Row label="Request a feature" prefix={<Lightbulb className="h-4 w-4 text-text-muted" />}>
        <GhostBtn onClick={() => setFeatOpen((v) => !v)}>Suggest</GhostBtn>
      </Row>
      <Collapse open={featOpen} maxH={160}>
        <div className="flex flex-col gap-2 px-5 pb-4">
          <textarea rows={3} value={featText} onChange={(e) => setFeatText(e.target.value)}
            placeholder="Describe the feature you'd like..." className={areaClass} />
          <div>
            <AccentBtn disabled={!featText.trim()}
              onClick={() => { setFeatText(''); setFeatOpen(false); toast.success('Thanks for the suggestion!') }}>
              Send suggestion
            </AccentBtn>
          </div>
        </div>
      </Collapse>

      <Modal
        open={legal !== null}
        onClose={() => setLegal(null)}
        title={legal === 'terms' ? 'Terms of service' : 'Privacy policy'}
      >
        {legal === 'terms'
          ? 'Vallety Terms of Service — full terms coming soon. Vallety is provided as-is during the MVP period.'
          : 'Vallety Privacy Policy — Full policy coming soon. Your data is stored locally in your browser and never sent to external servers without your explicit action.'}
      </Modal>
    </Section>
  )
}

// ═══ Page ══════════════════════════════════════════════════════════════════════

export function ProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const dbProfile = useAuthStore((s) => s.profile)
  // Seed from the Supabase row (authoritative) merged over the local cache, so
  // every field shows the persisted value on load — across sessions and devices.
  const [profile, setProfile] = useState<ValletyProfile>(() => mergeDbIntoLocal(dbProfile))
  const [ticks, setTicks] = useState<Ticks>({})
  const [accountDeleted, setAccountDeleted] = useState(false)

  // Re-hydrate when the auth-store profile arrives/changes (e.g. late fetch,
  // or a save reconciled the row). Done as a render-time state adjustment keyed
  // on the profile reference (not an effect) so it can't cascade re-renders;
  // local-only fields are preserved by the merge.
  const [syncedFrom, setSyncedFrom] = useState(dbProfile)
  if (dbProfile !== syncedFrom) {
    setSyncedFrom(dbProfile)
    setProfile(mergeDbIntoLocal(dbProfile))
  }

  // Spread-merge every save. The change is applied locally + optimistically to
  // the shared auth store (so the sidebar/header update instantly), persisted to
  // localStorage, then to Supabase. The "Saved" tick only flashes once the save
  // actually succeeds; a failure surfaces a toast so a change is never lost silently.
  const update: UpdateFn = (patch, tickKey) => {
    setProfile((prev) => ({ ...prev, ...patch }))
    applyOptimisticProfile(patch)
    saveProfilePatch(patch)
    void saveProfileToSupabase(patch).then((res) => {
      if (res.ok) {
        if (tickKey) setTicks((t) => ({ ...t, [tickKey]: Date.now() }))
      } else {
        toast.error(res.error ? `Couldn't save: ${res.error}` : "Couldn't save your change. Please try again.")
      }
    })
  }

  // Smooth-scroll to a section when linked with a hash (/profile#danger).
  useEffect(() => {
    if (!location.hash) return
    const el = document.getElementById(location.hash.slice(1))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash])

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  if (accountDeleted) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 text-center">
        <ValletyMark size={40} />
        <h1 className="text-[18px] font-semibold text-text-primary">Account deletion requested</h1>
        <p className="text-[14px] text-text-secondary">
          All your data will be removed within 30 days. Thank you for using Vallety.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="sr-only">Profile &amp; settings</h1>

      {/* Breadcrumb / back */}
      <button
        type="button"
        onClick={goBack}
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-text-secondary hover:text-text-primary"
        style={{ transition: 'var(--transition-fast)' }}
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex flex-col" style={{ gap: 14 }}>
        <ProfileHeader
          p={profile}
          onAvatarSaved={(url) => {
            // uploadAvatar/removeAvatar already persisted to Supabase + the auth
            // store; mirror it into local state + cache and flash the tick.
            setProfile((prev) => ({ ...prev, avatar_url: url }))
            applyOptimisticProfile({ avatar_url: url })
            saveProfilePatch({ avatar_url: url })
            setTicks((t) => ({ ...t, avatar: Date.now() }))
          }}
        />
        <ModeSection navigate={navigate} />
        <PersonalSection p={profile} up={update} ticks={ticks} />
        <PrefsSection p={profile} up={update} ticks={ticks} />
        <FinancialSection p={profile} up={update} ticks={ticks} />
        <BusinessSection p={profile} up={update} ticks={ticks} />
        <NotificationsSection p={profile} up={update} ticks={ticks} />
        <SecuritySection navigate={navigate} />
        <ConnectionsSection p={profile} up={update} />
        <DataSection p={profile} />
        <BillingSection />
        <DangerSection p={profile} navigate={navigate} onAccountDeleted={() => setAccountDeleted(true)} />
        <AboutSection />
      </div>
    </div>
  )
}
