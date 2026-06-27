import { useEffect, useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import toast from '../../components/Toast'
import { cn } from '../../shared/lib/cn'
import {
  addGoal, updateGoal, deleteGoal, GOAL_CATEGORIES, type Goal,
} from '../../shared/lib/goals'

const fieldClass =
  'w-full rounded-md border border-default bg-bg-input px-3 h-10 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent'

interface Props {
  open: boolean
  mode: 'add' | 'edit'
  goal?: Goal | null
  onClose: () => void
  onSaved: (goals: Goal[]) => void
}

export function GoalDrawer({ open, mode, goal, onClose, onSaved }: Props) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [saved, setSaved] = useState('')
  const [category, setCategory] = useState('House')
  const [wasOpen, setWasOpen] = useState(false)

  if (open && !wasOpen) {
    setWasOpen(true)
    if (mode === 'edit' && goal) {
      setName(goal.name)
      setTarget(String(goal.target))
      setTargetDate(goal.targetDate ? goal.targetDate.slice(0, 10) : '')
      setSaved(String(goal.saved))
      setCategory(goal.category)
    } else {
      setName(''); setTarget(''); setTargetDate(''); setSaved(''); setCategory('House')
    }
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const targetNum = Number(target)
  const canSave = name.trim() !== '' && Number.isFinite(targetNum) && targetNum > 0

  const handleSave = () => {
    if (!canSave) return
    const payload = {
      name: name.trim(),
      target: targetNum,
      saved: Math.max(0, Number(saved) || 0),
      targetDate: targetDate ? new Date(targetDate).toISOString() : '',
      category,
    }
    if (mode === 'edit' && goal) {
      onSaved(updateGoal(goal.id, payload))
      toast.success('Goal updated')
    } else {
      onSaved(addGoal(payload))
      toast.success('Goal created')
    }
    onClose()
  }

  const handleDelete = () => {
    if (mode === 'edit' && goal) {
      onSaved(deleteGoal(goal.id))
      toast.success('Goal deleted')
      onClose()
    }
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/70 transition-opacity duration-[220ms]',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'add' ? 'New goal' : 'Edit goal'}
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-bg-card shadow-2xl transition-transform duration-[220ms] ease-[cubic-bezier(0.32,0.72,0,1)] sm:w-[420px]',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-subtle px-5 py-3.5">
          <h2 className="text-[16px] font-semibold text-text-primary">
            {mode === 'add' ? 'New goal' : 'Edit goal'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-muted">Goal name</span>
              <input className={fieldClass} value={name} placeholder="e.g. Emergency fund"
                onChange={(e) => setName(e.target.value)} />
            </label>

            <div>
              <span className="text-[12px] text-text-muted">Target amount</span>
              <div className="mt-1 flex items-end gap-2 border-b-2 border-default py-1.5 focus-within:border-accent">
                <span className="text-[24px] font-medium leading-none text-text-muted">€</span>
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="w-full border-0 bg-transparent p-0 text-[32px] font-bold leading-none text-text-primary outline-none placeholder:text-text-muted"
                />
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-muted">Target date</span>
              <input className={fieldClass} type="date" value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-muted">Already saved (optional)</span>
              <input className={fieldClass} type="number" min="0" step="0.01" value={saved}
                placeholder="0.00" onChange={(e) => setSaved(e.target.value)} />
            </label>

            <div>
              <span className="text-[12px] text-text-muted">Category</span>
              <div className="mt-1.5 grid grid-cols-4 gap-2">
                {GOAL_CATEGORIES.map((c) => {
                  const Icon = c.icon
                  const selected = category === c.name
                  return (
                    <button
                      key={c.name}
                      onClick={() => setCategory(c.name)}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border"
                      style={{
                        borderWidth: selected ? 1.5 : 1,
                        borderColor: selected ? 'var(--color-accent)' : 'var(--border-default)',
                        backgroundColor: selected ? 'var(--color-accent-muted)' : 'transparent',
                        transition: 'var(--transition-fast)',
                      }}
                    >
                      <Icon className="h-5 w-5" style={{ color: selected ? 'var(--color-accent)' : 'var(--text-secondary)' }} />
                      <span className="text-[10px] text-text-secondary">{c.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-subtle p-4">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex h-11 w-full items-center justify-center rounded-md text-[14px] font-semibold text-white"
            style={{
              backgroundColor: 'var(--color-accent)',
              opacity: canSave ? 1 : 0.4,
              cursor: canSave ? 'pointer' : 'not-allowed',
              transition: 'var(--transition-fast)',
            }}
          >
            {mode === 'add' ? 'Create goal' : 'Save changes'}
          </button>
          {mode === 'edit' && (
            <button
              onClick={handleDelete}
              className="flex items-center justify-center gap-1.5 py-1.5 text-[14px] font-medium"
              style={{ color: 'var(--color-danger)' }}
            >
              <Trash2 className="h-4 w-4" /> Delete goal
            </button>
          )}
        </div>
      </div>
    </>
  )
}
