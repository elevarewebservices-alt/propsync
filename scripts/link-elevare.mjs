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

const COMPANY_ID = 'a0000000-0000-0000-0000-000000000001'
const USER_ID    = 'ccbb8126-5e81-4661-a827-d6bb574a8f1e' // elevarewebservices@gmail.com
const USER_EMAIL = 'elevarewebservices@gmail.com'

// Also promote the seed company to agency plan if not already
await db.from('companies').update({ plan_id: 'agency' }).eq('id', COMPANY_ID)

// Insert a new agent row for elevarewebservices (owner in the same company)
const { data, error } = await (db.from('agents')).insert({
  company_id:   COMPANY_ID,
  auth_user_id: USER_ID,
  email:        USER_EMAIL,
  nombre:       'Elevare Webservices',
  rol:          'owner',
  is_active:    true,
}).select()

if (error) {
  // Maybe already exists — try update instead
  console.log('Insert failed, trying update:', error.message)
  const { data: upd, error: upderr } = await db.from('agents')
    .update({ auth_user_id: USER_ID, is_active: true, rol: 'owner' })
    .eq('company_id', COMPANY_ID)
    .eq('email', USER_EMAIL)
    .select()
  console.log('update result:', upderr ? `ERROR: ${upderr.message}` : upd)
} else {
  console.log('insert result:', data)
}

// Verify all agents
const { data: agents } = await db.from('agents')
  .select('id, email, auth_user_id, rol, is_active')
  .eq('company_id', COMPANY_ID)
console.log('\nagents in company now:', agents)
