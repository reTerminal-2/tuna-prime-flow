-- Create the seller_payment_settings table
CREATE TABLE IF NOT EXISTS seller_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  payrex_secret_key TEXT,
  payrex_public_key TEXT,
  payrex_webhook_secret TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Note: The service_role (used by Edge Functions) bypasses RLS automatically,
-- ensuring it can always access the secret keys securely.

-- Enable Row Level Security
ALTER TABLE seller_payment_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own payment settings"
  ON seller_payment_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment settings"
  ON seller_payment_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment settings"
  ON seller_payment_settings
  FOR UPDATE
  USING (auth.uid() = user_id);
