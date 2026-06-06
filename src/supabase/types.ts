// Generated types matching supabase/migrations/001–005
// Replace with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ── Enums ────────────────────────────────────────────────────────────────────

export type AppMode = 'personal' | 'business' | 'investment'
export type BusinessType =
  | 'sole_proprietor' | 'llc' | 'partnership'
  | 's_corp' | 'c_corp' | 'nonprofit' | 'other'
export type CurrencyCode =
  | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD'
  | 'JPY' | 'CHF' | 'CNY' | 'INR' | 'MXN'

export type AccountType =
  | 'checking' | 'savings' | 'credit_card' | 'cash'
  | 'investment' | 'loan' | 'mortgage' | 'other'
export type TransactionType = 'income' | 'expense' | 'transfer'
export type Recurrence = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled'
export type DebtType =
  | 'credit_card' | 'student_loan' | 'auto_loan' | 'mortgage'
  | 'personal_loan' | 'medical' | 'other'

export type InvoiceStatus =
  | 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'cancelled'
export type PaymentMethod =
  | 'cash' | 'check' | 'bank_transfer' | 'credit_card'
  | 'paypal' | 'stripe' | 'venmo' | 'zelle' | 'other'
export type ExpenseCategory =
  | 'advertising' | 'auto_travel' | 'bank_fees' | 'commissions'
  | 'contractors' | 'depreciation' | 'dues_subscriptions'
  | 'equipment' | 'home_office' | 'insurance' | 'interest'
  | 'legal_professional' | 'meals_entertainment' | 'office_supplies'
  | 'rent_lease' | 'repairs_maintenance' | 'software' | 'taxes_licenses'
  | 'telephone' | 'travel' | 'utilities' | 'wages' | 'other'
export type TaxType =
  | 'federal_income' | 'state_income' | 'self_employment'
  | 'estimated_quarterly' | 'payroll' | 'sales' | 'property' | 'other'

export type AssetClass =
  | 'stock' | 'etf' | 'mutual_fund' | 'bond' | 'crypto'
  | 'real_estate' | 'commodity' | 'options' | 'cash_equivalent' | 'other'
export type InvestmentTxType =
  | 'buy' | 'sell' | 'dividend' | 'split' | 'transfer_in' | 'transfer_out'
  | 'reinvestment' | 'fee' | 'interest' | 'return_of_capital'

// ── Row types ────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  active_mode: AppMode
  currency: CurrencyCode
  business_name: string | null
  business_type: BusinessType | null
  tax_year_start: number
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  institution: string | null
  balance: number
  currency: CurrencyCode
  is_active: boolean
  color: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  type: TransactionType
  amount: number
  description: string
  category: string
  subcategory: string | null
  date: string
  is_recurring: boolean
  recurrence: Recurrence
  transfer_account_id: string | null
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  user_id: string
  category: string
  amount: number
  period: Recurrence
  color: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  status: GoalStatus
  linked_account_id: string | null
  color: string | null
  icon: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Bill {
  id: string
  user_id: string
  name: string
  amount: number
  due_day: number
  category: string
  recurrence: Recurrence
  auto_pay: boolean
  is_active: boolean
  last_paid_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Debt {
  id: string
  user_id: string
  name: string
  type: DebtType
  original_balance: number
  current_balance: number
  interest_rate: number
  minimum_payment: number
  due_day: number | null
  lender: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface NetWorthSnapshot {
  id: string
  user_id: string
  snapshot_date: string
  total_assets: number
  total_liabilities: number
  net_worth: number           // generated column
  notes: string | null
  created_at: string
}

export interface BusinessClient {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  tax_id: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  user_id: string
  client_id: string
  invoice_number: string
  status: InvoiceStatus
  issue_date: string
  due_date: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total: number
  amount_paid: number
  currency: CurrencyCode
  notes: string | null
  terms: string | null
  paid_at: string | null
  payment_method: PaymentMethod | null
  created_at: string
  updated_at: string
}

export interface InvoiceLine {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  amount: number              // generated column
  sort_order: number
  created_at: string
}

export interface BusinessExpense {
  id: string
  user_id: string
  category: ExpenseCategory
  description: string
  amount: number
  date: string
  vendor: string | null
  receipt_url: string | null
  is_deductible: boolean
  payment_method: PaymentMethod | null
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface MileageLog {
  id: string
  user_id: string
  date: string
  purpose: string
  from_location: string
  to_location: string
  miles: number
  rate_per_mile: number
  total_deduction: number     // generated column
  is_business: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TaxPayment {
  id: string
  user_id: string
  type: TaxType
  amount: number
  payment_date: string
  tax_year: number
  quarter: number | null
  reference_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Portfolio {
  id: string
  user_id: string
  name: string
  description: string | null
  currency: CurrencyCode
  is_taxable: boolean
  institution: string | null
  account_number: string | null
  color: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Holding {
  id: string
  portfolio_id: string
  user_id: string
  symbol: string
  name: string
  asset_class: AssetClass
  shares: number
  avg_cost_basis: number
  current_price: number | null
  current_value: number | null
  unrealized_gain: number | null
  last_price_update: string | null
  created_at: string
  updated_at: string
}

export interface InvestmentTransaction {
  id: string
  portfolio_id: string
  user_id: string
  holding_id: string | null
  type: InvestmentTxType
  symbol: string
  shares: number
  price_per_share: number
  total_amount: number
  fees: number
  date: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface WatchlistItem {
  id: string
  user_id: string
  symbol: string
  name: string
  asset_class: AssetClass
  target_buy_price: number | null
  target_sell_price: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ── Insert / Update helpers ──────────────────────────────────────────────────
// Omit auto-generated or server-set fields for inserts.

type OmitGenerated<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>

export type ProfileUpdate = Partial<OmitGenerated<Profile>>

export type AccountInsert = OmitGenerated<Account>
export type AccountUpdate = Partial<AccountInsert>

export type TransactionInsert = OmitGenerated<Transaction>
export type TransactionUpdate = Partial<TransactionInsert>

export type BudgetInsert = OmitGenerated<Budget>
export type BudgetUpdate = Partial<BudgetInsert>

export type GoalInsert = OmitGenerated<Goal>
export type GoalUpdate = Partial<GoalInsert>

export type BillInsert = OmitGenerated<Bill>
export type BillUpdate = Partial<BillInsert>

export type DebtInsert = OmitGenerated<Debt>
export type DebtUpdate = Partial<DebtInsert>

export type NetWorthSnapshotInsert = Omit<OmitGenerated<NetWorthSnapshot>, 'net_worth'>
export type NetWorthSnapshotUpdate = Partial<NetWorthSnapshotInsert>

export type BusinessClientInsert = OmitGenerated<BusinessClient>
export type BusinessClientUpdate = Partial<BusinessClientInsert>

export type InvoiceInsert = OmitGenerated<Invoice>
export type InvoiceUpdate = Partial<InvoiceInsert>

export type InvoiceLineInsert = Omit<OmitGenerated<InvoiceLine>, 'amount'>
export type InvoiceLineUpdate = Partial<InvoiceLineInsert>

export type BusinessExpenseInsert = OmitGenerated<BusinessExpense>
export type BusinessExpenseUpdate = Partial<BusinessExpenseInsert>

export type MileageLogInsert = Omit<OmitGenerated<MileageLog>, 'total_deduction'>
export type MileageLogUpdate = Partial<MileageLogInsert>

export type TaxPaymentInsert = OmitGenerated<TaxPayment>
export type TaxPaymentUpdate = Partial<TaxPaymentInsert>

export type PortfolioInsert = OmitGenerated<Portfolio>
export type PortfolioUpdate = Partial<PortfolioInsert>

export type HoldingInsert = OmitGenerated<Holding>
export type HoldingUpdate = Partial<HoldingInsert>

export type InvestmentTransactionInsert = OmitGenerated<InvestmentTransaction>
export type InvestmentTransactionUpdate = Partial<InvestmentTransactionInsert>

export type WatchlistItemInsert = OmitGenerated<WatchlistItem>
export type WatchlistItemUpdate = Partial<WatchlistItemInsert>

// ── Supabase Database shape (for typed client) ───────────────────────────────
// Row/Insert/Update are intersected with Record<string, unknown> so they
// satisfy the GenericTable constraint inside @supabase/postgrest-js.

type GR<T> = T & Record<string, unknown>

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: GR<Profile>
        Insert: GR<Omit<Profile, 'created_at' | 'updated_at'>>
        Update: GR<ProfileUpdate>
        Relationships: []
      }
      accounts: {
        Row: GR<Account>
        Insert: GR<AccountInsert>
        Update: GR<AccountUpdate>
        Relationships: []
      }
      transactions: {
        Row: GR<Transaction>
        Insert: GR<TransactionInsert>
        Update: GR<TransactionUpdate>
        Relationships: []
      }
      budgets: {
        Row: GR<Budget>
        Insert: GR<BudgetInsert>
        Update: GR<BudgetUpdate>
        Relationships: []
      }
      goals: {
        Row: GR<Goal>
        Insert: GR<GoalInsert>
        Update: GR<GoalUpdate>
        Relationships: []
      }
      bills: {
        Row: GR<Bill>
        Insert: GR<BillInsert>
        Update: GR<BillUpdate>
        Relationships: []
      }
      debts: {
        Row: GR<Debt>
        Insert: GR<DebtInsert>
        Update: GR<DebtUpdate>
        Relationships: []
      }
      net_worth_snapshots: {
        Row: GR<NetWorthSnapshot>
        Insert: GR<NetWorthSnapshotInsert>
        Update: GR<NetWorthSnapshotUpdate>
        Relationships: []
      }
      business_clients: {
        Row: GR<BusinessClient>
        Insert: GR<BusinessClientInsert>
        Update: GR<BusinessClientUpdate>
        Relationships: []
      }
      invoices: {
        Row: GR<Invoice>
        Insert: GR<InvoiceInsert>
        Update: GR<InvoiceUpdate>
        Relationships: []
      }
      invoice_lines: {
        Row: GR<InvoiceLine>
        Insert: GR<InvoiceLineInsert>
        Update: GR<InvoiceLineUpdate>
        Relationships: []
      }
      business_expenses: {
        Row: GR<BusinessExpense>
        Insert: GR<BusinessExpenseInsert>
        Update: GR<BusinessExpenseUpdate>
        Relationships: []
      }
      mileage_log: {
        Row: GR<MileageLog>
        Insert: GR<MileageLogInsert>
        Update: GR<MileageLogUpdate>
        Relationships: []
      }
      tax_payments: {
        Row: GR<TaxPayment>
        Insert: GR<TaxPaymentInsert>
        Update: GR<TaxPaymentUpdate>
        Relationships: []
      }
      portfolios: {
        Row: GR<Portfolio>
        Insert: GR<PortfolioInsert>
        Update: GR<PortfolioUpdate>
        Relationships: []
      }
      holdings: {
        Row: GR<Holding>
        Insert: GR<HoldingInsert>
        Update: GR<HoldingUpdate>
        Relationships: []
      }
      investment_transactions: {
        Row: GR<InvestmentTransaction>
        Insert: GR<InvestmentTransactionInsert>
        Update: GR<InvestmentTransactionUpdate>
        Relationships: []
      }
      watchlist: {
        Row: GR<WatchlistItem>
        Insert: GR<WatchlistItemInsert>
        Update: GR<WatchlistItemUpdate>
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: {
      app_mode: AppMode
      business_type: BusinessType
      currency_code: CurrencyCode
      account_type: AccountType
      transaction_type: TransactionType
      recurrence: Recurrence
      goal_status: GoalStatus
      debt_type: DebtType
      invoice_status: InvoiceStatus
      payment_method: PaymentMethod
      expense_category: ExpenseCategory
      tax_type: TaxType
      asset_class: AssetClass
      investment_tx_type: InvestmentTxType
    }
  }
}
