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
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
})

const key = `properties/_diag/cors-${Date.now()}.png`
const cmd = new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, ContentType: 'image/png' })
const url = await getSignedUrl(client, cmd, { expiresIn: 300 })

const ORIGIN = 'https://www.propsyncia.com'

// 1. Simulate the browser CORS preflight (OPTIONS)
console.log('=== PREFLIGHT (OPTIONS) ===')
const pre = await fetch(url, {
  method: 'OPTIONS',
  headers: {
    'Origin': ORIGIN,
    'Access-Control-Request-Method': 'PUT',
    'Access-Control-Request-Headers': 'content-type',
  },
})
console.log('status:', pre.status, pre.statusText)
console.log('access-control-allow-origin :', pre.headers.get('access-control-allow-origin'))
console.log('access-control-allow-methods:', pre.headers.get('access-control-allow-methods'))
console.log('access-control-allow-headers:', pre.headers.get('access-control-allow-headers'))

// 2. Simulate the actual PUT with an Origin header (what the browser sends after preflight)
console.log('\n=== ACTUAL PUT (with Origin) ===')
const put = await fetch(url, {
  method: 'PUT',
  headers: { 'Origin': ORIGIN, 'Content-Type': 'image/png' },
  body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),
})
console.log('status:', put.status, put.statusText)
console.log('access-control-allow-origin :', put.headers.get('access-control-allow-origin'))
