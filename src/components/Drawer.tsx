import { useEffect, useRef, useState } from 'react'
import { cn } from '../shared/lib/cn'

interface DrawerProps {
  open: boolean
  onClose: () => void
  ariaLabel: string
  children: React.ReactNode
}

/**
 * Responsive drawer shell.
 *  - Desktop (≥768px): slides in from the right (420px panel).
 *  - Mobile (<768px): bottom sheet (85vh, rounded top, drag handle,
 *    drag-down-to-close).
 * Overlay click closes. (Escape / body-scroll-lock are handled by the
 * drawer's own content so this stays a pure shell.)
 */
export function Drawer({ open, onClose, ariaLabel, children }: DrawerProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startY = useRef(0)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    setDragging(true)
  }
  const onTouchMove = (e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) setDragY(dy)
  }
  const onTouchEnd = () => {
    if (dragY > 80) onClose()
    setDragY(0)
    setDragging(false)
  }

  const transform = isMobile
    ? open ? `translateY(${dragY}px)` : 'translateY(100%)'
    : open ? 'translateX(0)' : 'translateX(100%)'

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-black/70 transition-opacity duration-[220ms]',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="fixed bottom-0 left-0 right-0 z-[60] flex h-[85vh] flex-col rounded-t-[20px] bg-bg-card shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[420px] md:rounded-none"
        style={{
          transform,
          transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Drag handle — mobile only */}
        <div
          className="flex justify-center pb-1 pt-2 md:hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="h-1 w-9 rounded-full" style={{ backgroundColor: 'var(--border-default)' }} />
        </div>
        {children}
      </div>
    </>
  )
}
