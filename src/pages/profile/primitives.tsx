import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '../../shared/lib/cn'

// ── Section ───────────────────────────────────────────────────────────────────

export function Section({
  id, label, badge, danger, children,
}: {
  id?: string
  label: string
  badge?: React.ReactNode
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mb-2 flex items-center gap-2 border-b border-subtle pb-1.5">
        <h2
          className="text-[12px] font-medium uppercase text-text-muted"
          style={{ letterSpacing: '0.08em' }}
        >
          {label}
        </h2>
        {badge}
      </div>
      <div
        className="divide-y divide-[rgba(255,255,255,0.05)] overflow-hidden"
        style={{
          backgroundColor: danger ? 'rgba(239,68,68,0.02)' : 'var(--bg-card)',
          borderRadius: 14,
          border: danger ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {children}
      </div>
    </section>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

export function Row({
  label, sub, prefix, stamp, stack, danger, children,
}: {
  label: React.ReactNode
  sub?: React.ReactNode
  /** Small leading element (icon / symbol badge). */
  prefix?: React.ReactNode
  /** Bump this (e.g. Date.now()) to flash the "Saved" tick. */
  stamp?: number
  /** Force label + control to stack vertically (wide controls / mobile). */
  stack?: boolean
  danger?: boolean
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex min-h-[48px] gap-3 px-5 py-3.5',
        stack ? 'flex-col' : 'flex-col sm:flex-row sm:items-center sm:justify-between'
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {prefix && <span className="mt-0.5 flex-shrink-0">{prefix}</span>}
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[14px] font-medium text-text-primary">
            {label}
            {stamp ? <Check key={stamp} className="saved-tick h-3.5 w-3.5" aria-label="Saved" /> : null}
          </p>
          {sub && (
            <p className={cn('mt-0.5 text-[12px]', danger ? 'text-[rgba(239,68,68,0.75)]' : 'text-text-muted')}>
              {sub}
            </p>
          )}
        </div>
      </div>
      {children && (
        <div className={cn('flex flex-shrink-0 flex-wrap items-center gap-2', !stack && 'sm:justify-end')}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────

export function Toggle({
  checked, onChange, ariaLabel,
}: { checked: boolean; onChange: (v: boolean) => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className="relative w-10 flex-shrink-0 rounded-full"
      style={{
        height: 22,
        minHeight: 22, // beat the global 44px mobile touch-target rule
        backgroundColor: checked ? 'var(--color-accent)' : 'rgba(255,255,255,0.12)',
        transition: 'background-color var(--dur-base) var(--ease-in-out-smooth)',
      }}
    >
      <span
        className="absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow"
        style={{ left: checked ? 20 : 2, transition: 'left var(--dur-base) var(--ease-spring)' }}
      />
    </button>
  )
}

// ── Pill group ────────────────────────────────────────────────────────────────

export interface PillOption<T extends string | number> {
  value: T
  label: string
  disabled?: boolean
  tooltip?: string
}

export function Pills<T extends string | number>({
  options, value, onChange, grid,
}: {
  options: PillOption<T>[]
  value: T
  onChange: (v: T) => void
  /** Render as a 2-column grid (for the business-type 2×2). */
  grid?: boolean
}) {
  return (
    <div className={cn(grid ? 'grid w-full grid-cols-2 gap-2 sm:w-auto' : 'flex flex-wrap gap-2')}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            disabled={o.disabled}
            title={o.tooltip}
            onClick={() => !o.disabled && onChange(o.value)}
            className="rounded-full px-3 py-1.5 text-[13px] font-medium"
            style={{
              minHeight: 32,
              backgroundColor: active ? 'var(--color-accent)' : 'rgba(255,255,255,0.05)',
              color: active ? '#fff' : '#94A3B8',
              opacity: o.disabled ? 0.5 : 1,
              cursor: o.disabled ? 'not-allowed' : 'pointer',
              transition: 'var(--transition-fast)',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────

export function SelectBox({
  value, onChange, options, ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  ariaLabel: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="h-9 max-w-[220px] rounded-md border border-default bg-bg-input px-2 text-[13px] text-text-primary focus:border-accent"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// ── Debounced text field ──────────────────────────────────────────────────────

export function TextField({
  initial, onCommit, placeholder, type = 'text', prefix, transform, error, width = 220, disabled, validate,
}: {
  initial: string
  onCommit: (v: string) => void
  placeholder?: string
  type?: string
  /** Static prefix shown inside the field (e.g. €). */
  prefix?: string
  /** Applied to the raw value on every keystroke (e.g. IBAN spacing). */
  transform?: (v: string) => string
  error?: string | null
  width?: number
  disabled?: boolean
  /** Field-level validation. Returns an error message (shown inline) or null.
   *  A non-null result blocks the commit so an invalid value is never saved. */
  validate?: (v: string) => string | null
}) {
  const [value, setValue] = useState(initial)
  const [liveError, setLiveError] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  // The profile loads asynchronously from Supabase, so `initial` can change
  // after mount. Re-sync during render (React's "adjust state when a prop
  // changes" pattern) whenever the incoming value actually changes — a commit
  // sets it to what we already have, so this never clobbers active typing.
  const [lastInitial, setLastInitial] = useState(initial)
  if (initial !== lastInitial) {
    setLastInitial(initial)
    setValue(initial)
  }

  // Debounce: the write is scheduled from the event handler, not an effect.
  // Validation gates the commit — an invalid value shows an inline error and
  // is never persisted.
  const commit = (v: string) => {
    const err = validate ? validate(v) : null
    setLiveError(err)
    if (!err) onCommit(v)
  }

  const handleChange = (raw: string) => {
    const v = transform ? transform(raw) : raw
    setValue(v)
    if (validate) setLiveError(validate(v)) // clear/show the error as they type
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => commit(v), 500)
  }

  const flush = () => {
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
      commit(value)
    }
  }

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const shownError = error ?? liveError

  return (
    <div className="w-full sm:w-auto">
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-muted">
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={flush}
          aria-invalid={shownError ? true : undefined}
          className={cn(
            'h-9 w-full rounded-md border bg-bg-input text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent disabled:opacity-50 sm:w-auto',
            prefix ? 'pl-7 pr-3' : 'px-3',
            shownError ? 'border-[var(--color-danger)]' : 'border-default'
          )}
          style={{ maxWidth: '100%', width }}
        />
      </div>
      {shownError && <p className="mt-1 text-[12px] text-[var(--color-danger)]">{shownError}</p>}
    </div>
  )
}

// ── Textarea (debounced) ──────────────────────────────────────────────────────

export function TextArea({
  initial, onCommit, placeholder, rows = 3,
}: { initial: string; onCommit: (v: string) => void; placeholder?: string; rows?: number }) {
  const [value, setValue] = useState(initial)
  const timer = useRef<number | null>(null)
  const handleChange = (v: string) => {
    setValue(v)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onCommit(v), 500)
  }
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => handleChange(e.target.value)}
      className="w-full resize-none rounded-md border border-default bg-bg-input px-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent sm:w-[280px]"
    />
  )
}

// ── Buttons ───────────────────────────────────────────────────────────────────

export function GhostBtn({
  children, onClick, danger, accent, disabled, title,
}: {
  children: React.ReactNode
  onClick?: () => void
  danger?: boolean
  accent?: boolean
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        borderColor: danger ? 'rgba(239,68,68,0.4)' : accent ? 'var(--border-accent)' : 'var(--border-default)',
        color: danger ? 'var(--color-danger)' : accent ? 'var(--color-accent)' : 'var(--text-secondary)',
        transition: 'var(--transition-fast)',
      }}
    >
      {children}
    </button>
  )
}

export function AccentBtn({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn-accent inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
      style={{ backgroundColor: 'var(--color-accent)', transition: 'var(--transition-fast)' }}
    >
      {children}
    </button>
  )
}

export function SolidDangerBtn({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
      style={{ backgroundColor: 'var(--color-danger)', transition: 'var(--transition-fast)' }}
    >
      {children}
    </button>
  )
}

// ── Animated inline collapse ──────────────────────────────────────────────────

export function Collapse({
  open, maxH = 400, children,
}: { open: boolean; maxH?: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        maxHeight: open ? maxH : 0,
        opacity: open ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 280ms cubic-bezier(0.32,0.72,0,1), opacity 280ms cubic-bezier(0.32,0.72,0,1)',
      }}
      aria-hidden={!open}
    >
      {children}
    </div>
  )
}

// ── Inline "type WORD to confirm" panel ───────────────────────────────────────

export function ConfirmInline({
  open, word, prompt, actionLabel, onConfirm, onCancel, solid, caseSensitive = true,
}: {
  open: boolean
  /** The exact string the user must type. */
  word: string
  prompt: string
  actionLabel: string
  onConfirm: () => void
  onCancel: () => void
  solid?: boolean
  caseSensitive?: boolean
}) {
  const [typed, setTyped] = useState('')
  const matches = caseSensitive
    ? typed === word
    : typed.trim().toLowerCase() === word.trim().toLowerCase()
  return (
    <Collapse open={open} maxH={180}>
      <div className="border-t border-[rgba(255,255,255,0.05)] px-5 py-4">
        <p className="mb-2 text-[13px] text-text-secondary">{prompt}</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={word}
            className="h-9 w-full rounded-md border border-default bg-bg-input px-3 text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent sm:w-[220px]"
          />
          {solid ? (
            <SolidDangerBtn disabled={!matches} onClick={() => { onConfirm(); setTyped('') }}>
              {actionLabel}
            </SolidDangerBtn>
          ) : (
            <GhostBtn danger disabled={!matches} onClick={() => { onConfirm(); setTyped('') }}>
              {actionLabel}
            </GhostBtn>
          )}
          <GhostBtn onClick={() => { onCancel(); setTyped('') }}>Cancel</GhostBtn>
        </div>
      </div>
    </Collapse>
  )
}
