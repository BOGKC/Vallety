import Papa from 'papaparse'
import {
  readTransactions, writeTransactions, suggestCategory,
  type Txn, type TxnType,
} from './transactions'

// ── Types ─────────────────────────────────────────────────────────────────

export interface ParsedRow {
  date: string // ISO
  merchant: string
  amount: number // signed (negative = expense)
  type: TxnType
  category: string
}

export interface ColumnMapping {
  date: string
  merchant: string
  amount: string
}

export interface ParseResult {
  bank: string // 'OP' | 'Nordea' | … | 'Unknown'
  headers: string[]
  rawRows: Record<string, string>[]
  mapping: ColumnMapping | null
  parsed: ParsedRow[]
  needsMapping: boolean
  delimiter: string
}

// ── Bank definitions ──────────────────────────────────────────────────────
// `map` values are substrings matched (case-insensitively) against the real
// header names, which often carry extra text (e.g. "Määrä EUROA").

interface BankDef {
  name: string
  /** Returns true when the header row (and delimiter) match this bank. */
  detect: (headers: string[], delimiter: string) => boolean
  map: ColumnMapping
}

const has = (headers: string[], needle: string) =>
  headers.some((h) => h.toLowerCase().includes(needle.toLowerCase()))

const BANKS: BankDef[] = [
  {
    name: 'Nordea',
    detect: (h) => has(h, 'Kirjauspäivä') && has(h, 'Tapahtuma'),
    map: { date: 'Kirjauspäivä', merchant: 'Saaja', amount: 'Summa' },
  },
  {
    name: 'OP',
    detect: (h) => has(h, 'Kirjauspäivä'),
    map: { date: 'Kirjauspäivä', merchant: 'Selitys', amount: 'Määrä' },
  },
  {
    name: 'S-Pankki',
    detect: (h) => has(h, 'Päivämäärä'),
    map: { date: 'Päivämäärä', merchant: 'Otsikko', amount: 'Summa' },
  },
  {
    name: 'Handelsbanken',
    detect: (h) => has(h, 'Transaktionsdatum'),
    map: { date: 'Transaktionsdatum', merchant: 'Text', amount: 'Belopp' },
  },
  {
    name: 'Danske',
    detect: (h, delim) => delim === ';' && has(h, 'Dato'),
    map: { date: 'Dato', merchant: 'Tekst', amount: 'Beløb' },
  },
]

/** Resolve a mapping of substrings to the actual header names present. */
function resolveMapping(headers: string[], map: ColumnMapping): ColumnMapping | null {
  const find = (needle: string) =>
    headers.find((h) => h.toLowerCase().includes(needle.toLowerCase()))
  const date = find(map.date)
  const merchant = find(map.merchant)
  const amount = find(map.amount)
  if (!date || !merchant || !amount) return null
  return { date, merchant, amount }
}

// ── Value parsing ─────────────────────────────────────────────────────────

/** Parse European/Nordic number strings: "1 234,56", "1.234,56", "-12,30". */
export function parseAmount(raw: string): number {
  if (raw == null) return 0
  let s = String(raw).replace(/\s+/g, '').trim()
  if (!s) return 0
  const hasComma = s.includes(',')
  const hasDot = s.includes('.')
  if (hasComma && hasDot) {
    // assume '.' thousands, ',' decimal
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    s = s.replace(',', '.')
  }
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

/** Parse common date formats into an ISO string; falls back to "now". */
export function parseDate(raw: string): string {
  const s = String(raw ?? '').trim()
  let m: RegExpMatchArray | null
  // dd.mm.yyyy
  if ((m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/))) {
    const [, d, mo, y] = m
    return new Date(Number(fullYear(y)), Number(mo) - 1, Number(d)).toISOString()
  }
  // yyyy-mm-dd
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) {
    const [, y, mo, d] = m
    return new Date(Number(y), Number(mo) - 1, Number(d)).toISOString()
  }
  // dd/mm/yyyy  (day-first, European)
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/))) {
    const [, d, mo, y] = m
    return new Date(Number(fullYear(y)), Number(mo) - 1, Number(d)).toISOString()
  }
  const fallback = new Date(s)
  return Number.isNaN(fallback.getTime()) ? new Date().toISOString() : fallback.toISOString()
}

function fullYear(y: string): string {
  return y.length === 2 ? `20${y}` : y
}

// ── Row building ──────────────────────────────────────────────────────────

export function buildParsed(
  rawRows: Record<string, string>[],
  mapping: ColumnMapping
): ParsedRow[] {
  const existing = readTransactions()
  const out: ParsedRow[] = []
  for (const row of rawRows) {
    const merchant = String(row[mapping.merchant] ?? '').trim()
    const rawAmount = row[mapping.amount]
    const rawDate = row[mapping.date]
    if (!merchant && !rawAmount) continue // skip blank lines
    const amount = parseAmount(rawAmount)
    if (amount === 0 && !merchant) continue
    out.push({
      date: parseDate(rawDate),
      merchant: merchant || 'Unknown',
      amount,
      type: amount < 0 ? 'expense' : 'income',
      category: suggestCategory(merchant, existing),
    })
  }
  return out
}

// ── Public parse entry point ──────────────────────────────────────────────

export function parseCsvFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const headers = (res.meta.fields ?? []).map((h) => h.trim())
        const delimiter = res.meta.delimiter ?? ','
        const rawRows = res.data as Record<string, string>[]

        const bank = BANKS.find((b) => b.detect(headers, delimiter))
        if (bank) {
          const mapping = resolveMapping(headers, bank.map)
          if (mapping) {
            resolve({
              bank: bank.name, headers, rawRows, mapping,
              parsed: buildParsed(rawRows, mapping), needsMapping: false, delimiter,
            })
            return
          }
        }
        // Unknown layout (or mapping unresolved) → manual mapping UI.
        resolve({
          bank: 'Unknown', headers, rawRows, mapping: null,
          parsed: [], needsMapping: true, delimiter,
        })
      },
      error: (err) => reject(err),
    })
  })
}

// ── Duplicate detection + import ──────────────────────────────────────────

function dupKey(date: string, merchant: string, amount: number): string {
  return `${date.slice(0, 10)}|${merchant.trim().toLowerCase()}|${Math.abs(amount)}`
}

export interface DuplicateAnalysis {
  flags: boolean[] // true = duplicate of an existing transaction
  duplicateCount: number
  uniqueCount: number
}

export function analyzeDuplicates(rows: ParsedRow[]): DuplicateAnalysis {
  const existing = readTransactions()
  const seen = new Set(existing.map((t) => dupKey(t.date, t.merchant, t.amount)))
  // Also treat in-file repeats as duplicates after their first occurrence.
  const inFile = new Set<string>()
  const flags = rows.map((r) => {
    const k = dupKey(r.date, r.merchant, r.amount)
    const isDup = seen.has(k) || inFile.has(k)
    inFile.add(k)
    return isDup
  })
  const duplicateCount = flags.filter(Boolean).length
  return { flags, duplicateCount, uniqueCount: rows.length - duplicateCount }
}

export interface ImportOutcome {
  list: Txn[]
  added: number
  skipped: number
}

/** Persist all non-duplicate rows; returns the new full list and counts. */
export function importRows(rows: ParsedRow[]): ImportOutcome {
  const { flags } = analyzeDuplicates(rows)
  const existing = readTransactions()
  const fresh: Txn[] = []
  rows.forEach((r, i) => {
    if (flags[i]) return
    fresh.push({
      id: `imp_${Date.now()}_${i}`,
      type: r.type,
      amount: Math.abs(r.amount),
      merchant: r.merchant,
      category: r.category,
      date: r.date,
      account: 'Imported',
    })
  })
  const list = [...fresh, ...existing]
  writeTransactions(list)
  return { list, added: fresh.length, skipped: rows.length - fresh.length }
}
