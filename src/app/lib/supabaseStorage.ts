import { supabase, Transaction, RecurringRule, AppState } from './supabase'

export class SupabaseStorage {
  // Transactions
  static async getTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
      return []
    }

    return data || []
  }

  static async saveTransaction(transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('transactions')
      .insert([{ ...transaction, user_id: user.id }])
      .select()
      .single()

    if (error) {
      console.error('Error saving transaction:', error)
      return null
    }

    return data
  }

  static async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating transaction:', error)
      return null
    }

    return data
  }

  static async deleteTransaction(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting transaction:', error)
      return false
    }

    return true
  }

  // Recurring Rules
  static async getRecurringRules(): Promise<RecurringRule[]> {
    const { data, error } = await supabase
      .from('recurring_rules')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching recurring rules:', error)
      return []
    }

    // Convert snake_case to camelCase for application
    return (data || []).map(rule => ({
      id: rule.id,
      type: rule.type,
      amount: rule.amount,
      note: rule.note,
      frequency: rule.frequency,
      weekday: rule.weekday,
      dayOfMonth: rule.day_of_month,
      start: rule.start_date,
      end: rule.end_date,
      created_at: rule.created_at,
      updated_at: rule.updated_at
    }))
  }

  static async saveRecurringRule(rule: Omit<RecurringRule, 'id' | 'created_at' | 'updated_at'>): Promise<RecurringRule | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Convert camelCase to snake_case for database
    const dbRule = {
      user_id: user.id,
      type: rule.type,
      amount: rule.amount,
      note: rule.note,
      frequency: rule.frequency,
      weekday: rule.weekday,
      day_of_month: rule.dayOfMonth,
      start_date: rule.start,
      end_date: rule.end
    }

    const { data, error } = await supabase
      .from('recurring_rules')
      .insert([dbRule])
      .select()
      .single()

    if (error) {
      console.error('Error saving recurring rule:', error)
      return null
    }

    // Convert snake_case back to camelCase for application
    return {
      id: data.id,
      type: data.type,
      amount: data.amount,
      note: data.note,
      frequency: data.frequency,
      weekday: data.weekday,
      dayOfMonth: data.day_of_month,
      start: data.start_date,
      end: data.end_date,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }

  static async updateRecurringRule(id: string, updates: Partial<RecurringRule>): Promise<RecurringRule | null> {
    // Convert camelCase to snake_case for database
    const dbUpdates: any = {}
    if (updates.type !== undefined) dbUpdates.type = updates.type
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount
    if (updates.note !== undefined) dbUpdates.note = updates.note
    if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency
    if (updates.weekday !== undefined) dbUpdates.weekday = updates.weekday
    if (updates.dayOfMonth !== undefined) dbUpdates.day_of_month = updates.dayOfMonth
    if (updates.start !== undefined) dbUpdates.start_date = updates.start
    if (updates.end !== undefined) dbUpdates.end_date = updates.end

    const { data, error } = await supabase
      .from('recurring_rules')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating recurring rule:', error)
      return null
    }

    // Convert snake_case back to camelCase for application
    return {
      id: data.id,
      type: data.type,
      amount: data.amount,
      note: data.note,
      frequency: data.frequency,
      weekday: data.weekday,
      dayOfMonth: data.day_of_month,
      start: data.start_date,
      end: data.end_date,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }

  static async deleteRecurringRule(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('recurring_rules')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting recurring rule:', error)
      return false
    }

    return true
  }

  // App Settings
  static async getAppSettings(): Promise<Partial<AppState> | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('user_id', user.id)
        .eq('setting_key', 'app_state')
        .single()

      if (error) {
        // If no settings found, return null instead of error
        if (error.code === 'PGRST116') {
          return null
        }
        console.error('Error fetching app settings:', error)
        return null
      }

      return data?.setting_value || null
    } catch (error) {
      console.error('Error fetching app settings:', error)
      return null
    }
  }

  static async saveAppSettings(settings: Partial<AppState>): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        user_id: user.id,
        setting_key: 'app_state',
        setting_value: settings
      })

    if (error) {
      console.error('Error saving app settings:', error)
      return false
    }

    return true
  }

  // Utility methods
  static async exportData(): Promise<{ transactions: Transaction[], recurringRules: RecurringRule[], settings: any }> {
    const [transactions, recurringRules, settings] = await Promise.all([
      this.getTransactions(),
      this.getRecurringRules(),
      this.getAppSettings()
    ])

    return {
      transactions,
      recurringRules,
      settings
    }
  }

  static async importData(data: { transactions: Transaction[], recurringRules: RecurringRule[], settings: any }): Promise<boolean> {
    try {
      // Clear existing data
      await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('recurring_rules').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      // Insert new data
      if (data.transactions.length > 0) {
        const { error: transactionsError } = await supabase
          .from('transactions')
          .insert(data.transactions)

        if (transactionsError) throw transactionsError
      }

      if (data.recurringRules.length > 0) {
        const { error: rulesError } = await supabase
          .from('recurring_rules')
          .insert(data.recurringRules)

        if (rulesError) throw rulesError
      }

      if (data.settings) {
        await this.saveAppSettings(data.settings)
      }

      return true
    } catch (error) {
      console.error('Error importing data:', error)
      return false
    }
  }
}
