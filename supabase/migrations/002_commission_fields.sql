-- Commission & Commercial Agreement Fields
-- Run this in your Supabase SQL Editor

ALTER TABLE centers ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'none';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2);
ALTER TABLE centers ADD COLUMN IF NOT EXISTS commission_fixed_amount NUMERIC(10,2);
ALTER TABLE centers ADD COLUMN IF NOT EXISTS commission_currency TEXT DEFAULT 'USD';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS commission_notes TEXT;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS contract_start DATE;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS contract_end DATE;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS account_manager TEXT;

-- commission_type: 'none', 'percentage', 'fixed'
-- commission_rate: e.g. 10.00 for 10%
-- commission_fixed_amount: e.g. 500.00 for $500 per client
-- commission_currency: default 'USD'
-- commission_notes: internal notes about the deal
-- contract_start/end: agreement validity period
-- account_manager: who manages this center relationship
