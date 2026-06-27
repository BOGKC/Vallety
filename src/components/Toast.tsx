/* eslint-disable react-refresh/only-export-components -- toast store, hook and viewport intentionally co-located */
import { useEffect, useState, useSyncExternalStore } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X, type LucideIcon } from 'lucide-react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastOptions {
  /** Optional undo action — renders an "Undo" button. */
  undo?: () => void
  /** Override the auto-dismiss delay (ms). */
  duration?: number
}

interface ToastItemData {
  id: number
  variant: ToastVariant
  message: string
  undo?: () => void
  duration: number
}

const MAX_VISIBLE = 4
const DEFAULT_DURATION = 3000

// ── Module-level store ────────────────────────────────────────────────────────

let toasts: ToastItemData[] = []
const listeners = new Set<() => void>()
let nextId = 1

function emit() {
  toasts = [...toasts]
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return toasts
}

function push(variant: ToastVariant, message: string, opts?: ToastOptions): number {
  const id = nextId++
  toasts = [...toasts, {
    id,
    variant,
    message,
    undo: opts?.undo,
    duration: opts?.duration ?? DEFAULT_DURATION,
  }]
  // Keep at most MAX_VISIBLE — drop the oldest.
  if (toasts.length > MAX_VISIBLE) toasts = toasts.slice(toasts.length - MAX_VISIBLE)
  emit()
  return id
}

function remove(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

/** Imperative API (drop-in for the old react-hot-toast default import). */
export const toast = {
  success: (message: string, opts?: ToastOptions) => push('success', message, opts),
  error: (message: string, opts?: ToastOptions) => push('error', message, opts),
  info: (message: string, opts?: ToastOptions) => push('info', message, opts),
  warning: (message: string, opts?: ToastOptions) => push('warning', message, opts),
}

export default toast

/** Hook form. Returns the same stable imperative methods. */
export function useToast() {
  return toast
}

// ── Rendering ─────────────────────────────────────────────────────────────────

const VARIANT_ICON: Record<ToastVariant, LucideIcon> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

const VARIANT_COLOR: Record<ToastVariant, string> = {
  success: 'var(--color-success)',
  error: 'var(--color-danger)',
  info: 'var(--color-info)',
  warning: 'var(--color-warning)',
}

function ToastCard({ data, onRemove }: { data: ToastItemData; onRemove: (id: number) => void }) {
  const [shown, setShown] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const Icon = VARIANT_ICON[data.variant]

  const close = () => {
    setLeaving(true)
    window.setTimeout(() => onRemove(data.id), 200)
  }

  useEffect(() => {
    // Enter on next frame so the transition runs.
    const enter = window.requestAnimationFrame(() => setShown(true))
    const timer = window.setTimeout(() => {
      setLeaving(true)
      window.setTimeout(() => onRemove(data.id), 200)
    }, data.duration)
    return () => {
      window.cancelAnimationFrame(enter)
      window.clearTimeout(timer)
    }
    // onRemove is the stable module-level `remove`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id, data.duration])

  const visible = shown && !leaving

  return (
    <div
      role="status"
      className="flex w-[320px] max-w-[calc(100vw-40px)] items-start gap-2.5 rounded-md border border-default bg-bg-card px-3.5 py-3 shadow-xl"
      style={{
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
        transition: leaving
          ? 'transform 200ms ease-in, opacity 200ms ease-in'
          : 'transform 250ms ease-out, opacity 250ms ease-out',
      }}
    >
      <Icon className="mt-0.5 h-[18px] w-[18px] flex-shrink-0" style={{ color: VARIANT_COLOR[data.variant] }} />
      <p className="flex-1 text-[14px] leading-snug text-text-primary">{data.message}</p>
      {data.undo && (
        <button
          onClick={() => { data.undo?.(); close() }}
          className="flex-shrink-0 text-[13px] font-medium"
          style={{ color: 'var(--color-accent)' }}
        >
          Undo
        </button>
      )}
      <button
        onClick={close}
        className="flex-shrink-0 text-text-muted hover:text-text-primary"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function ToastViewport() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return (
    <div
      className="pointer-events-none fixed z-[9999] flex flex-col gap-2"
      style={{ top: 72, right: 20 }}
    >
      {items.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard data={t} onRemove={remove} />
        </div>
      ))}
    </div>
  )
}
