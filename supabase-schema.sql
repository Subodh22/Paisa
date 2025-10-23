-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(10,2) NOT NULL,
  note TEXT,
  date DATE NOT NULL,
  source VARCHAR(50) DEFAULT 'manual',
  basiq_id VARCHAR(255),
  account_id VARCHAR(255),
  institution_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recurring_rules table
CREATE TABLE IF NOT EXISTS recurring_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(10,2) NOT NULL,
  note TEXT,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'fortnightly', 'monthly')),
  weekday INTEGER CHECK (weekday >= 0 AND weekday <= 6),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create app_settings table for storing app state
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  setting_key VARCHAR(50) NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, setting_key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_basiq_id ON transactions(basiq_id);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_frequency ON recurring_rules(frequency);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_start_date ON recurring_rules(start_date);

-- Enable Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user-specific access
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own recurring rules" ON recurring_rules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring rules" ON recurring_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring rules" ON recurring_rules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring rules" ON recurring_rules
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own app settings" ON app_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own app settings" ON app_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own app settings" ON app_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own app settings" ON app_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_rules_updated_at
  BEFORE UPDATE ON recurring_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
