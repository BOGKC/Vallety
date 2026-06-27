import { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import toast from '../../components/Toast'
import { cn } from '../../shared/lib/cn'
import { formatEuro } from '../../shared/lib/formatters'
import { PRESET_CATEGORIES, type Txn } from '../../shared/lib/transactions'
import {
  parseCsvFile, buildParsed, analyzeDuplicates, importRows,
  type ParseResult, type ParsedRow, type ColumnMapping,
} from '../../shared/lib/csvParser'

type Step = 'upload' | 'preview' | 'success'

const CATEGORY_OPTIONS = Array.from(new Set([...PRESET_CATEGORIES]))

interface Props {
  open: boolean
  onClose: () => void
  onImported: (txns: Txn[]) => void
}

export function CsvImportModal({ open, onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<ParseResult | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [error, setError] = useState('')
  const [manualMap, setManualMap] = useState<Partial<ColumnMapping>>({})
  const [counts, setCounts] = useState({ added: 0, skipped: 0 })
  const [wasOpen, setWasOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset on open (render-time prop-change pattern, no effect).
  if (open && !wasOpen) {
    setWasOpen(true)
    setStep('upload'); setDragOver(false); setFileName(''); setResult(null)
    setRows([]); setError(''); setManualMap({}); setCounts({ added: 0, skipped: 0 })
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  // Escape closes (except on the success screen, which auto-closes).
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && step !== 'success') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, step, onClose])

  // Success screen auto-closes after 1.5s.
  useEffect(() => {
    if (step !== 'success') return
    const id = window.setTimeout(() => {
      toast.success('Transactions imported successfully')
      onClose()
    }, 1500)
    return () => window.clearTimeout(id)
  }, [step, onClose])

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please choose a .csv file')
      return
    }
    setError('')
    setFileName(file.name)
    parseCsvFile(file)
      .then((res) => {
        setResult(res)
        setRows(res.parsed)
        setStep('preview')
      })
      .catch(() => setError('Could not read that file. Please check it is a valid CSV.'))
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const clearFile = () => {
    setFileName(''); setResult(null); setRows([]); setStep('upload'); setManualMap({})
  }

  // Manual mapping (Unknown banks): rebuild rows once all three are chosen.
  const applyManualMap = (next: Partial<ColumnMapping>) => {
    setManualMap(next)
    if (result && next.date && next.merchant && next.amount) {
      setRows(buildParsed(result.rawRows, next as ColumnMapping))
    } else {
      setRows([])
    }
  }

  const dup = useMemo(() => analyzeDuplicates(rows), [rows])
  const needsMapping = result?.needsMapping ?? false
  const mappingReady = !needsMapping || (!!manualMap.date && !!manualMap.merchant && !!manualMap.amount)

  const setRowCategory = (index: number, category: string) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, category } : r)))

  const handleImport = () => {
    const outcome = importRows(rows)
    setCounts({ added: outcome.added, skipped: outcome.skipped })
    onImported(outcome.list)
    setStep('success')
  }

  if (!open) return null

  // Overlay only dismisses before any data is at risk (upload step).
  const onOverlayClick = () => { if (step === 'upload') onClose() }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Import transactions">
      <div
        className="absolute inset-0 bg-black/70"
        style={{ backdropFilter: 'blur(4px)' }}
        onClick={onOverlayClick}
        aria-hidden
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-[600px] flex-col overflow-hidden bg-bg-card shadow-2xl"
        style={{ borderRadius: 'var(--radius-xl)' }}
      >
        {step === 'success' ? (
          <SuccessView added={counts.added} skipped={counts.skipped} />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <h2 className="text-[18px] font-semibold text-text-primary">Import transactions</h2>
              <div className="flex items-center gap-2">
                {step === 'preview' && result && (
                  <span
                    className="rounded-full px-2.5 py-1 text-[12px] font-medium"
                    style={{
                      backgroundColor: 'var(--color-accent-muted)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    {result.bank === 'Unknown' ? 'Map columns' : `${result.bank} detected`}
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {step === 'upload' ? (
              <UploadView
                dragOver={dragOver}
                error={error}
                onBrowse={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                inputRef={inputRef}
                onFile={handleFile}
              />
            ) : (
              <PreviewView
                result={result!}
                rows={rows}
                dupFlags={dup.flags}
                duplicateCount={dup.duplicateCount}
                uniqueCount={dup.uniqueCount}
                fileName={fileName}
                needsMapping={needsMapping}
                mappingReady={mappingReady}
                manualMap={manualMap}
                onManualMap={applyManualMap}
                onClearFile={clearFile}
                onSetCategory={setRowCategory}
                onCancel={onClose}
                onImport={handleImport}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Upload step ─────────────────────────────────────────────────────────────

function UploadView({
  dragOver, error, onBrowse, onDragOver, onDragLeave, onDrop, inputRef, onFile,
}: {
  dragOver: boolean
  error: string
  onBrowse: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  onFile: (f: File) => void
}) {
  return (
    <div className="px-5 pb-5">
      <button
        type="button"
        onClick={onBrowse}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="flex w-full flex-col items-center gap-2 px-6 py-10 text-center"
        style={{
          border: dragOver ? '2px solid var(--color-accent)' : '2px dashed var(--border-default)',
          backgroundColor: dragOver ? 'var(--color-accent-muted)' : 'transparent',
          borderRadius: 'var(--radius-lg)',
          transition: 'var(--transition-base)',
        }}
      >
        <Upload className="h-8 w-8 text-text-muted" />
        <span className="text-[16px] font-medium text-text-primary">Drop your bank CSV here</span>
        <span className="text-[13px] text-text-secondary">or click to browse files</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />

      {error && <p className="mt-3 text-[13px]" style={{ color: 'var(--color-danger)' }}>{error}</p>}

      <p className="mt-4 text-[12px] text-text-muted">
        Works with: OP · Nordea · S-Pankki · Danske · Handelsbanken
      </p>
    </div>
  )
}

// ── Preview step ──────────────────────────────────────────────────────────

function PreviewView({
  result, rows, dupFlags, duplicateCount, uniqueCount, fileName, needsMapping,
  mappingReady, manualMap, onManualMap, onClearFile, onSetCategory, onCancel, onImport,
}: {
  result: ParseResult
  rows: ParsedRow[]
  dupFlags: boolean[]
  duplicateCount: number
  uniqueCount: number
  fileName: string
  needsMapping: boolean
  mappingReady: boolean
  manualMap: Partial<ColumnMapping>
  onManualMap: (m: Partial<ColumnMapping>) => void
  onClearFile: () => void
  onSetCategory: (i: number, c: string) => void
  onCancel: () => void
  onImport: () => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 px-5">
        {/* Filename pill */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-default bg-bg-elevated px-3 py-1.5 text-[12px] text-text-primary">
            <FileText className="h-3.5 w-3.5 text-text-muted" />
            {fileName}
            <button onClick={onClearFile} aria-label="Remove file" className="text-text-muted hover:text-text-primary">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>

        {needsMapping ? (
          <ColumnMapper headers={result.headers} value={manualMap} onChange={onManualMap} />
        ) : (
          <p className="text-[12px] text-text-secondary">Date · Merchant · Amount — auto-mapped</p>
        )}
      </div>

      {/* Table */}
      {mappingReady && rows.length > 0 ? (
        <div className="mt-3 overflow-auto px-5" style={{ maxHeight: 280 }}>
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 bg-bg-card">
              <tr className="text-left text-[11px] uppercase text-text-muted">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Merchant</th>
                <th className="py-2 pr-3 text-right font-medium">Amount</th>
                <th className="py-2 font-medium">Category</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((r, i) => (
                <tr key={i} className={cn('border-t border-subtle', dupFlags[i] && 'opacity-40')}>
                  <td className="py-2 pr-3 text-text-secondary whitespace-nowrap">
                    {new Date(r.date).toLocaleDateString('en-IE', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="py-2 pr-3 text-text-primary"><span className="line-clamp-1">{r.merchant}</span></td>
                  <td
                    className="py-2 pr-3 text-right font-medium whitespace-nowrap"
                    style={{ color: r.amount < 0 ? '#EF4444' : '#22C55E' }}
                  >
                    {r.amount < 0 ? '-' : '+'}{formatEuro(Math.abs(r.amount), 2)}
                  </td>
                  <td className="py-2">
                    <select
                      value={r.category}
                      onChange={(e) => onSetCategory(i, e.target.value)}
                      className="rounded-md border border-default bg-bg-input px-1.5 py-1 text-[12px] text-text-primary focus:border-accent"
                    >
                      {Array.from(new Set([r.category, ...CATEGORY_OPTIONS])).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        mappingReady && (
          <p className="px-5 py-6 text-center text-[13px] text-text-muted">
            No rows found in this file.
          </p>
        )
      )}

      {/* Summary */}
      {mappingReady && rows.length > 0 && (
        <p className="px-5 pt-3 text-[13px] text-text-secondary">
          {rows.length} transaction{rows.length === 1 ? '' : 's'} found
          {duplicateCount > 0 && ` · ${duplicateCount} duplicate${duplicateCount === 1 ? '' : 's'} detected (will be skipped)`}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-2 px-5 py-4">
        <button
          onClick={onCancel}
          className="inline-flex h-9 items-center rounded-md border border-default px-3 text-[13px] font-medium text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
        >
          Cancel
        </button>
        <button
          onClick={onImport}
          disabled={!mappingReady || uniqueCount === 0}
          className="inline-flex h-9 items-center rounded-md px-4 text-[13px] font-semibold text-white"
          style={{
            backgroundColor: 'var(--color-accent)',
            opacity: !mappingReady || uniqueCount === 0 ? 0.4 : 1,
            cursor: !mappingReady || uniqueCount === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          Import {uniqueCount} transaction{uniqueCount === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  )
}

function ColumnMapper({
  headers, value, onChange,
}: {
  headers: string[]
  value: Partial<ColumnMapping>
  onChange: (m: Partial<ColumnMapping>) => void
}) {
  const fields: { key: keyof ColumnMapping; label: string }[] = [
    { key: 'date', label: 'Date' },
    { key: 'merchant', label: 'Merchant' },
    { key: 'amount', label: 'Amount' },
  ]
  return (
    <div className="flex flex-wrap gap-3">
      <p className="w-full text-[12px] text-text-secondary">
        We couldn't recognise this bank — map the columns:
      </p>
      {fields.map((f) => (
        <label key={f.key} className="flex flex-col gap-1">
          <span className="text-[11px] uppercase text-text-muted">{f.label}</span>
          <select
            value={value[f.key] ?? ''}
            onChange={(e) => onChange({ ...value, [f.key]: e.target.value || undefined })}
            className="h-9 rounded-md border border-default bg-bg-input px-2 text-[13px] text-text-primary focus:border-accent"
          >
            <option value="">Select column…</option>
            {headers.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  )
}

// ── Success step ────────────────────────────────────────────────────────────

function SuccessView({ added, skipped }: { added: number; skipped: number }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <svg width="48" height="48" viewBox="0 0 52 52" aria-hidden>
        <circle
          className="csv-check__circle"
          cx="26" cy="26" r="24" fill="none"
          stroke="var(--color-accent)" strokeWidth="3"
        />
        <path
          className="csv-check__tick"
          d="M16 27 L23 34 L37 19" fill="none"
          stroke="var(--color-accent)" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
      <h2 className="text-[18px] font-semibold text-text-primary">Import complete</h2>
      <p className="text-[14px] text-text-secondary">
        {added} transaction{added === 1 ? '' : 's'} added · {skipped} duplicate{skipped === 1 ? '' : 's'} skipped
      </p>
    </div>
  )
}
