import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// Load env from .env.local
const env = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

console.log('SUPABASE_URL host:', env.NEXT_PUBLIC_SUPABASE_URL)

// 1. Does the pipelines table exist / query work?
{
  const { data, error } = await db.from('pipelines').select('id, company_id, nombre, slug, is_active')
  console.log('\n=== pipelines ===')
  if (error) console.log('ERROR:', error.message, '| code:', error.code)
  else console.log('rows:', data.length, data.map(p => `${p.nombre}(${p.slug}) co=${p.company_id} active=${p.is_active}`))
}

// 2. Companies
{
  const { data, error } = await db.from('companies').select('id, nombre, plan_id')
  console.log('\n=== companies ===')
  if (error) console.log('ERROR:', error.message)
  else console.log(data)
}

// 3. Agents
{
  const { data, error } = await db.from('agents').select('id, email, company_id, auth_user_id, is_active, rol')
  console.log('\n=== agents ===')
  if (error) console.log('ERROR:', error.message)
  else console.log(data)
}

// 4. Auth users — find any without a matching active agent (would 500 on resolveCompanyId)
{
  const { data, error } = await db.auth.admin.listUsers()
  console.log('\n=== auth users ===')
  if (error) console.log('ERROR:', error.message)
  else {
    const { data: agents } = await db.from('agents').select('auth_user_id')
    const linked = new Set((agents ?? []).map(a => a.auth_user_id))
    for (const u of data.users) {
      console.log(`${u.email} | id=${u.id} | confirmed=${!!u.email_confirmed_at} | hasAgent=${linked.has(u.id)}`)
    }
  }
}

// 5. crm_stages
{
  const { data, error } = await db.from('crm_stages').select('company_id, slug, pipeline_id')
  console.log('\n=== crm_stages ===')
  if (error) console.log('ERROR:', error.message)
  else console.log('rows:', data.length, '| with pipeline_id:', data.filter(s => s.pipeline_id).length)
}
