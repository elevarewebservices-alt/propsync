-- Add TikTok Lead Gen webhook token to companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS tiktok_webhook_token TEXT UNIQUE;
