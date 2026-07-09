import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Trash2 } from 'lucide-react'
import toast from '../../components/Toast'
import { cn } from '../../shared/lib/cn'
import { Drawer } from '../../components/Drawer'
import { FieldError, RequiredMark } from '../../shared/components/FormField'
import { useShake } from '../../shared/hooks/useShake'
import { parseAmount } from '../../shared/lib/formatters'
import { goalSchema, type GoalFormValues } from '../../shared/lib/formSchemas'
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
  const [targetDate, setTargetDate] = useState('')
  const [saved, setSaved] = useState('')
  const [category, setCategory] = useState('House')
  const [wasOpen, setWasOpen] = useState(false)

  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    mode: 'onBlur',
    defaultValues: { name: '', target: '' },
  })
  const { shaking, triggerShake, shakeProps } = useShake()
  const submittingRef = useRef(false)

  // Reset the custom (non-RHF) selectors during render via the prev-value flag.
  if (open && !wasOpen) {
    setWasOpen(true)
    if (mode === 'edit' && goal) {
      setTargetDate(goal.targetDate ? goal.targetDate.slice(0, 10) : '')
      setSaved(String(goal.saved))
      setCategory(goal.category)
    } else {
      setTargetDate(''); setSaved(''); setCategory('House')
    }
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  // Reset the RHF-managed fields whenever the drawer opens.
  useEffect(() => {
    if (!open) return
    reset(
      mode === 'edit' && goal
        ? { name: goal.name, target: String(goal.target) }
        : { name: '', target: '' }
    )
    submittingRef.current = false
  }, [open, mode, goal, reset])

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

  const onValid = (values: GoalFormValues) => {
    const payload = {
      name: values.name.trim(),
      target: parseAmount(values.target),
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

  // Guard against double-submit: the ref is read/written only here (an event
  // handler), never during render. onClose on success leaves it set; the open
  // effect resets it on the next open.
  const handleSave = () => {
    if (submittingRef.current) return
    submittingRef.current = true
    handleSubmit(onValid, () => {
      submittingRef.current = false
      triggerShake()
    })()
  }

  const handleDelete = () => {
    if (mode === 'edit' && goal) {
      onSaved(deleteGoal(goal.id))
      toast.success('Goal deleted')
      onClose()
    }
  }

  return (
    <Drawer open={open} onClose={onClose} ariaLabel={mode === 'add' ? 'New goal' : 'Edit goal'}>
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
              <span className="text-[12px] text-text-muted">Goal name<RequiredMark /></span>
              <input className={fieldClass} placeholder="e.g. Emergency fund" {...register('name')} />
              <FieldError message={errors.name?.message} />
            </label>

            <div>
              <span className="text-[12px] text-text-muted">Target amount<RequiredMark /></span>
              <div className="mt-1 flex items-end gap-2 border-b-2 border-default py-1.5 focus-within:border-accent">
                <span className="text-[24px] font-medium leading-none text-text-muted">€</span>
                <input
                  inputMode="decimal"
                  placeholder="0"
                  className="w-full border-0 bg-transparent p-0 text-[32px] font-bold leading-none text-text-primary outline-none placeholder:text-text-muted"
                  {...register('target')}
                />
              </div>
              <FieldError message={errors.target?.message} />
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-muted">Target date</span>
              <input className={fieldClass} type="date" value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-muted">Already saved (optional)</span>
              <input className={fieldClass} type="number" inputMode="decimal" min="0" step="0.01" value={saved}
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
                      type="button"
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
            type="button"
            onClick={handleSave}
            className={cn(
              'flex h-11 w-full items-center justify-center rounded-md text-[14px] font-semibold text-white',
              shaking && 'shake'
            )}
            style={{ backgroundColor: 'var(--color-accent)', transition: 'var(--transition-fast)' }}
            {...shakeProps}
          >
            {mode === 'add' ? 'Create goal' : 'Save changes'}
          </button>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center justify-center gap-1.5 py-1.5 text-[14px] font-medium"
              style={{ color: 'var(--color-danger)' }}
            >
              <Trash2 className="h-4 w-4" /> Delete goal
            </button>
          )}
        </div>
    </Drawer>
  )
}
