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
const SEED_AGENT_ID = 'b0000000-0000-0000-0000-000000000001'
const USER_ID = 'e23530a1-9029-4734-ad65-2d2b5246407f' // claudiojupiter55@gmail.com
const USER_EMAIL = 'claudiojupiter55@gmail.com'

// Link the seed owner agent to the real auth user.
const { data, error } = await db
  .from('agents')
  .update({
    auth_user_id: USER_ID,
    email: USER_EMAIL,
    nombre: 'Claudio Jupiter',
    is_active: true,
    rol: 'owner',
  })
  .eq('id', SEED_AGENT_ID)
  .eq('company_id', COMPANY_ID)
  .select()

console.log('update result:', error ? `ERROR: ${error.message}` : data)

// Verify
const { data: check } = await db
  .from('agents')
  .select('id, email, auth_user_id, rol, company_id, is_active')
  .eq('company_id', COMPANY_ID)
console.log('\nagents now:', check)
