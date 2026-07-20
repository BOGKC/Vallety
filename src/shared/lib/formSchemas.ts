import { z } from 'zod'
import { parseAmount } from './formatters'

/**
 * Zod schemas for the app's forms. Amounts are kept as strings (the inputs are
 * free-text with inputMode="decimal") and refined to valid positive numbers so
 * the same value can flow straight into the existing number-based data layer.
 */

// Sane upper bound so a pasted/huge value can't overflow layouts or produce
// absurd stored numbers. A trillion covers any realistic personal-finance
// figure while staying well within safe-integer / display limits.
const MAX_AMOUNT = 1_000_000_000_000

const positiveAmount = (msg = 'Enter an amount greater than 0') =>
  z
    .string()
    .trim()
    .min(1, 'Required')
    .max(20, 'Amount is too long')
    .refine((v) => {
      const n = parseAmount(v)
      return Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT
    }, msg)

const nonNegativeAmount = (msg = 'Enter a valid amount') =>
  z
    .string()
    .trim()
    .min(1, 'Required')
    .max(20, 'Amount is too long')
    .refine((v) => {
      const n = parseAmount(v)
      return Number.isFinite(n) && n >= 0 && n <= MAX_AMOUNT
    }, msg)

// Free-text names/descriptions: bound the length so an overlong paste can't
// bloat storage or break the UI. (React already escapes the content on render.)
const nameText = (msg: string) => z.string().trim().min(1, msg).max(120, 'Too long (max 120 characters)')

export const transactionSchema = z.object({
  merchant: nameText('Enter a merchant or description'),
  amount: positiveAmount(),
})
export type TransactionFormValues = z.infer<typeof transactionSchema>

export const budgetSchema = z.object({
  amount: positiveAmount('Enter a budget amount'),
})
export type BudgetFormValues = z.infer<typeof budgetSchema>

export const goalSchema = z.object({
  name: nameText('Enter a goal name'),
  target: positiveAmount('Enter a target amount'),
})
export type GoalFormValues = z.infer<typeof goalSchema>

export const billSchema = z.object({
  name: nameText('Enter a bill name'),
  amount: positiveAmount(),
})
export type BillFormValues = z.infer<typeof billSchema>

export const debtSchema = z.object({
  name: nameText('Enter a name'),
  balance: positiveAmount('Enter the current balance'),
})
export type DebtFormValues = z.infer<typeof debtSchema>

export const accountSchema = z.object({
  name: nameText('Enter an account name'),
  balance: nonNegativeAmount('Enter a valid balance'),
})
export type AccountFormValues = z.infer<typeof accountSchema>
