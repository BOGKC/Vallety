import { z } from 'zod'
import { parseAmount } from './formatters'

/**
 * Zod schemas for the app's forms. Amounts are kept as strings (the inputs are
 * free-text with inputMode="decimal") and refined to valid positive numbers so
 * the same value can flow straight into the existing number-based data layer.
 */

const positiveAmount = (msg = 'Enter an amount greater than 0') =>
  z
    .string()
    .trim()
    .min(1, 'Required')
    .refine((v) => {
      const n = parseAmount(v)
      return Number.isFinite(n) && n > 0
    }, msg)

const nonNegativeAmount = (msg = 'Enter a valid amount') =>
  z
    .string()
    .trim()
    .min(1, 'Required')
    .refine((v) => {
      const n = parseAmount(v)
      return Number.isFinite(n) && n >= 0
    }, msg)

export const transactionSchema = z.object({
  merchant: z.string().trim().min(1, 'Enter a merchant or description'),
  amount: positiveAmount(),
})
export type TransactionFormValues = z.infer<typeof transactionSchema>

export const budgetSchema = z.object({
  amount: positiveAmount('Enter a budget amount'),
})
export type BudgetFormValues = z.infer<typeof budgetSchema>

export const goalSchema = z.object({
  name: z.string().trim().min(1, 'Enter a goal name'),
  target: positiveAmount('Enter a target amount'),
})
export type GoalFormValues = z.infer<typeof goalSchema>

export const billSchema = z.object({
  name: z.string().trim().min(1, 'Enter a bill name'),
  amount: positiveAmount(),
})
export type BillFormValues = z.infer<typeof billSchema>

export const debtSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name'),
  balance: positiveAmount('Enter the current balance'),
})
export type DebtFormValues = z.infer<typeof debtSchema>

export const accountSchema = z.object({
  name: z.string().trim().min(1, 'Enter an account name'),
  balance: nonNegativeAmount('Enter a valid balance'),
})
export type AccountFormValues = z.infer<typeof accountSchema>
