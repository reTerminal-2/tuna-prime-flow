-- Add HitPay columns to seller_payment_settings
ALTER TABLE seller_payment_settings 
ADD COLUMN IF NOT EXISTS hitpay_api_key TEXT,
ADD COLUMN IF NOT EXISTS hitpay_salt TEXT,
ADD COLUMN IF NOT EXISTS hitpay_is_active BOOLEAN DEFAULT false;
