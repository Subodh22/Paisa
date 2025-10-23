import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  note: string
  date: string
  source: string
  basiq_id?: string
  account_id?: string
  institution_id?: string
  _ruleId?: string
  created_at?: string
  updated_at?: string
}

export interface RecurringRule {
  id: string
  type: 'income' | 'expense'
  amount: number
  note: string
  frequency: 'weekly' | 'fortnightly' | 'monthly'
  weekday?: number
  dayOfMonth?: number
  start: string
  end?: string
  active: boolean
  created_at?: string
  updated_at?: string
}

export interface AppState {
  currentYear: number
  currentMonth: number
  startingBalance: number
  startingBalanceByMonth: Record<string, number>
  transactions: Transaction[]
  recurringRules: RecurringRule[]
}
