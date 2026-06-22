import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { error } = await db.from('companies').select('api_key_hash, api_key_enc, api_key_created_at').limit(1)

if (error) {
  console.log('❌ Migration NOT applied yet.')
  console.log('   Error:', error.message)
  console.log('   → Run supabase/migrations/021_company_api_key.sql in the Supabase SQL Editor.')
  process.exit(1)
} else {
  console.log('✅ Migration already applied — api_key_hash / api_key_enc / api_key_created_at columns exist.')
}
