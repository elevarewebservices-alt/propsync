import { NextResponse } from 'next/server'
import { resolveCompanyId } from '@/lib/auth'
import { uploadObject } from '@/lib/r2'

// TEMPORARY diagnostic — checks R2 env-var health on the server that actually
// runs in production (Vercel), then attempts a real test upload.
// Returns no secret values, only lengths/flags + the R2 error name.
// Delete this route once uploads are confirmed working.
export async function GET() {
  // Auth gate so this can't be probed anonymously.
  try {
    await resolveCompanyId()
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const vars = ['R2_ENDPOINT', 'R2_BUCKET_NAME', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_URL']
  const env: Record<string, unknown> = {}
  for (const k of vars) {
    const v = process.env[k]
    env[k] = {
      set: !!v,
      length: v?.length ?? 0,
      trailingSpace: v ? /\s$/.test(v) : false,
      leadingSpace: v ? /^\s/.test(v) : false,
      hasHash: v ? v.includes('#') : false,
      // first/last 4 chars only — safe for matching against the known-good value
      preview: v ? `${v.slice(0, 4)}…${v.slice(-4)}` : null,
    }
  }

  // Attempt a real upload with whatever Vercel has configured.
  let upload: Record<string, unknown>
  try {
    const key = `properties/_diag/vercel-${Date.now()}.txt`
    const { publicUrl } = await uploadObject(key, Buffer.from('diag'), 'text/plain')
    upload = { ok: true, publicUrl }
  } catch (err) {
    const e = err as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } }
    upload = { ok: false, error: e?.name, message: e?.message, status: e?.$metadata?.httpStatusCode }
  }

  return NextResponse.json({ env, upload })
}
