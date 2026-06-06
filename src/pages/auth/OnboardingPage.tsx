import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Papa from 'papaparse'
import {
  User, Briefcase, Building2, BarChart3,
  ChevronRight, Check, Upload, FileText, X, Wallet,
} from 'lucide-react'
import { supabase } from '../../supabase/client'
import { useAuthStore } from '../../shared/store/authStore'
import { useAppStore } from '../../shared/store/appStore'
import { LoadingSpinner } from '../../shared/components/LoadingSpinner'
import type { AppMode, BusinessType, CurrencyCode } from '../../supabase/types'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProfileChoice {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  mode: AppMode
  businessType: BusinessType | null
}

interface CurrencyOption {
  code: CurrencyCode
  label: string
  symbol: string
}

// ── Data ───────────────────────────────────────────────────────────────────────

const PROFILE_CHOICES: ProfileChoice[] = [
  {
    id: 'personal',
    label: 'Personal',
    description: 'Track income, expenses, savings and net worth',
    icon: <User className="h-6 w-6" />,
    mode: 'personal',
    businessType: null,
  },
  {
    id: 'freelancer',
    label: 'Freelancer',
    description: 'Invoices, clients, and deductible expenses',
    icon: <Briefcase className="h-6 w-6" />,
    mode: 'business',
    businessType: 'sole_proprietor',
  },
  {
    id: 'toiminimi',
    label: 'Toiminimi',
    description: 'Finnish sole trader — ALV, kirjanpito, kulut',
    icon: <Building2 className="h-6 w-6" />,
    mode: 'business',
    businessType: 'sole_proprietor',
  },
  {
    id: 'oy',
    label: 'OY',
    description: 'Osakeyhtiö — full bookkeeping and payroll',
    icon: <BarChart3 className="h-6 w-6" />,
    mode: 'business',
    businessType: 'llc',
  },
]

const CURRENCIES: CurrencyOption[] = [
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'SEK', label: 'Swedish Krona', symbol: 'kr' } as unknown as CurrencyOption,
  { code: 'NOK', label: 'Norwegian Krone', symbol: 'kr' } as unknown as CurrencyOption,
  { code: 'DKK', label: 'Danish Krone', symbol: 'kr' } as unknown as CurrencyOption,
  { code: 'CHF', label: 'Swiss Franc', symbol: 'Fr' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
]

// ── Step progress bar ──────────────────────────────────────────────────────────

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors ${
              i < current
                ? 'bg-brand border-brand text-white'
                : i === current
                ? 'border-brand text-brand bg-brand/10'
                : 'border-border text-text-secondary'
            }`}
          >
            {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-px w-8 transition-colors ${i < current ? 'bg-brand' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Step 1: Profile type ───────────────────────────────────────────────────────

function Step1({
  selected,
  onSelect,
}: {
  selected: string | null
  onSelect: (choice: ProfileChoice) => void
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-text-primary mb-1">What best describes you?</h2>
      <p className="text-text-secondary text-sm mb-6">This sets up your dashboard and tax features.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PROFILE_CHOICES.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => onSelect(choice)}
            className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
              selected === choice.id
                ? 'border-brand bg-brand/10 ring-1 ring-brand/40'
                : 'border-border bg-bg-secondary hover:border-text-secondary/30'
            }`}
          >
            <div
              className={`mt-0.5 h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                selected === choice.id ? 'bg-brand/20 text-brand' : 'bg-bg-card text-text-secondary'
              }`}
            >
              {choice.icon}
            </div>
            <div>
              <div className="font-medium text-text-primary text-sm">{choice.label}</div>
              <div className="text-text-secondary text-xs mt-0.5 leading-relaxed">{choice.description}</div>
            </div>
            {selected === choice.id && (
              <Check className="h-4 w-4 text-brand ml-auto mt-0.5 flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Step 2: Currency ───────────────────────────────────────────────────────────

function Step2({
  selected,
  onSelect,
}: {
  selected: CurrencyCode
  onSelect: (code: CurrencyCode) => void
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-text-primary mb-1">Choose your home currency</h2>
      <p className="text-text-secondary text-sm mb-6">Used for all totals and reports. You can add other currencies later.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {CURRENCIES.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => onSelect(c.code)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
              selected === c.code
                ? 'border-brand bg-brand/10 ring-1 ring-brand/40'
                : 'border-border bg-bg-secondary hover:border-text-secondary/30'
            }`}
          >
            <span className={`text-xl w-7 text-center font-semibold ${selected === c.code ? 'text-brand' : 'text-text-secondary'}`}>
              {c.symbol}
            </span>
            <div className="flex-1">
              <span className="text-text-primary text-sm font-medium">{c.code}</span>
              <span className="text-text-secondary text-xs ml-2">{c.label}</span>
            </div>
            {selected === c.code && <Check className="h-4 w-4 text-brand flex-shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Step 3: Import ─────────────────────────────────────────────────────────────

interface ParsedFile {
  name: string
  rows: number
  preview: string[][]
}

function Step3({
  parsed,
  onFile,
  onClear,
}: {
  parsed: ParsedFile | null
  onFile: (f: ParsedFile) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }
    setParsing(true)
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (results) => {
        setParsing(false)
        onFile({
          name: file.name,
          rows: Math.max(0, results.data.length - 1),
          preview: results.data.slice(0, 4) as string[][],
        })
      },
      error: () => {
        setParsing(false)
        toast.error('Could not parse file')
      },
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-text-primary mb-1">Import your first data</h2>
      <p className="text-text-secondary text-sm mb-6">
        Upload a CSV bank export, or start fresh and add data manually.
      </p>

      {!parsed ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragging ? 'border-brand bg-brand/5' : 'border-border hover:border-text-secondary/40'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          {parsing ? (
            <div className="flex flex-col items-center gap-3">
              <LoadingSpinner size="md" />
              <p className="text-text-secondary text-sm">Parsing file…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-bg-secondary border border-border flex items-center justify-center">
                <Upload className="h-5 w-5 text-text-secondary" />
              </div>
              <div>
                <p className="text-text-primary text-sm font-medium">Drop CSV here or click to browse</p>
                <p className="text-text-secondary text-xs mt-1">Supports bank exports from most Finnish banks</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-bg-secondary border-b border-border">
            <FileText className="h-4 w-4 text-brand flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-sm font-medium truncate">{parsed.name}</p>
              <p className="text-text-secondary text-xs">{parsed.rows} transaction rows detected</p>
            </div>
            <button onClick={onClear} className="text-text-secondary hover:text-text-primary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          {parsed.preview.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <tbody>
                  {parsed.preview.map((row, ri) => (
                    <tr key={ri} className={ri === 0 ? 'bg-bg-card' : ''}>
                      {row.slice(0, 5).map((cell, ci) => (
                        <td
                          key={ci}
                          className={`px-3 py-1.5 border-b border-border truncate max-w-[120px] ${
                            ri === 0 ? 'font-medium text-text-primary' : 'text-text-secondary'
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="px-4 py-2.5 text-text-secondary text-xs bg-bg-secondary">
            Column mapping happens after setup.
          </p>
        </div>
      )}

      <p className="text-text-secondary text-xs text-center mt-4">
        You can also skip this and add data manually later.
      </p>
    </div>
  )
}

// ── Onboarding page ────────────────────────────────────────────────────────────

export function OnboardingPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { setProfile } = useAuthStore()
  const { setMode } = useAppStore()

  const [step, setStep] = useState(0)
  const [selectedChoice, setSelectedChoice] = useState<ProfileChoice | null>(null)
  const [currency, setCurrency] = useState<CurrencyCode>('EUR')
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null)
  const [saving, setSaving] = useState(false)

  const canNext =
    (step === 0 && selectedChoice !== null) ||
    step === 1 ||
    step === 2

  const handleNext = async () => {
    if (step < 2) { setStep((s) => s + 1); return }

    // Final step — save profile then redirect
    if (!user || !selectedChoice) return
    setSaving(true)

    const { data, error } = await supabase
      .from('profiles')
      .update({
        active_mode: selectedChoice.mode,
        business_type: selectedChoice.businessType,
        currency,
      })
      .eq('id', user.id)
      .select()
      .single()

    setSaving(false)

    if (error) { toast.error('Could not save profile: ' + error.message); return }

    setProfile(data)
    setMode(selectedChoice.mode)

    if (parsedFile) {
      toast.success(`${parsedFile.rows} rows queued — map columns in Settings › Import.`)
    }

    navigate(selectedChoice.mode === 'personal' ? '/personal' : '/business', { replace: true })
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-lg bg-brand flex items-center justify-center">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-text-primary">Vallety</span>
        </div>

        <div className="bg-bg-card border border-border rounded-2xl p-8">
          <StepBar current={step} total={3} />

          {step === 0 && (
            <Step1 selected={selectedChoice?.id ?? null} onSelect={setSelectedChoice} />
          )}
          {step === 1 && (
            <Step2 selected={currency} onSelect={setCurrency} />
          )}
          {step === 2 && (
            <Step3
              parsed={parsedFile}
              onFile={setParsedFile}
              onClear={() => setParsedFile(null)}
            />
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            {step > 0 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="text-text-secondary hover:text-text-primary text-sm transition-colors"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={handleNext}
              disabled={!canNext || saving}
              className="flex items-center gap-2 bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {saving && <LoadingSpinner size="sm" />}
              {step < 2 ? (
                <>Continue <ChevronRight className="h-4 w-4" /></>
              ) : saving ? (
                'Saving…'
              ) : (
                <>
                  {parsedFile ? 'Finish & import' : 'Finish setup'}
                  <Check className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
