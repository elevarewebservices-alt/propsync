import { readFileSync } from 'node:fs'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (!m) continue
  let val = m[2]
  const c = val.indexOf('#')
  if (c !== -1) val = val.slice(0, c)
  env[m[1]] = val.trim()
}

const client = new S3Client({
  region: 'auto',
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
})

const pngBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

// ── Variant A: WITH ContentType in command (current app behaviour) ──
{
  const key = `properties/_diag/presigned-A-${Date.now()}.png`
  const cmd = new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, ContentType: 'image/png' })
  const url = await getSignedUrl(client, cmd, { expiresIn: 300 })
  const signed = new URL(url).searchParams.get('X-Amz-SignedHeaders')
  console.log('\n[A] WITH ContentType — SignedHeaders =', signed)

  // A1: browser-like PUT sending Content-Type header
  const r1 = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: pngBytes })
  console.log('   A1 PUT w/ Content-Type header  →', r1.status, r1.statusText)
  // A2: PUT without Content-Type header
  const r2 = await fetch(url, { method: 'PUT', body: pngBytes })
  console.log('   A2 PUT w/o Content-Type header →', r2.status, r2.statusText)
}

// ── Variant B: WITHOUT ContentType in command ──
{
  const key = `properties/_diag/presigned-B-${Date.now()}.png`
  const cmd = new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key })
  const url = await getSignedUrl(client, cmd, { expiresIn: 300 })
  const signed = new URL(url).searchParams.get('X-Amz-SignedHeaders')
  console.log('\n[B] WITHOUT ContentType — SignedHeaders =', signed)

  const r1 = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: pngBytes })
  console.log('   B1 PUT w/ Content-Type header  →', r1.status, r1.statusText)
  const r2 = await fetch(url, { method: 'PUT', body: pngBytes })
  console.log('   B2 PUT w/o Content-Type header →', r2.status, r2.statusText)
}
