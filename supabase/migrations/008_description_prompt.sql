-- Add AI description prompt template per company
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS description_prompt_template TEXT;
