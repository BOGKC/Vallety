import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        className="relative z-10 w-full max-w-md rounded-lg border border-default bg-bg-elevated shadow-2xl"
        style={{ borderRadius: 'var(--radius-lg)' }}
      >
        <div className="flex items-center justify-between border-b border-subtle px-5 py-3.5">
          <h2 className="text-[16px] font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-card hover:text-text-primary"
            style={{ transition: 'var(--transition-fast)' }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 text-[14px] text-text-secondary">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-subtle px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
