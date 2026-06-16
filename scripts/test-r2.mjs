import { readFileSync } from 'node:fs'
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'

// Parse .env.local, stripping inline "# ..." comments and surrounding whitespace
const env = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (!m) continue
  let val = m[2]
  // strip trailing inline comment (space + #)
  const c = val.indexOf('#')
  if (c !== -1) val = val.slice(0, c)
  env[m[1]] = val.trim()
}

console.log('R2_ENDPOINT      :', JSON.stringify(env.R2_ENDPOINT))
console.log('R2_BUCKET_NAME   :', JSON.stringify(env.R2_BUCKET_NAME))
console.log('R2_ACCESS_KEY_ID :', JSON.stringify(env.R2_ACCESS_KEY_ID), `(len ${env.R2_ACCESS_KEY_ID?.length})`)
console.log('R2_SECRET (len)  :', env.R2_SECRET_ACCESS_KEY?.length)

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

// 1. Try to LIST (read permission)
try {
  const list = await client.send(new ListObjectsV2Command({ Bucket: env.R2_BUCKET_NAME, MaxKeys: 3 }))
  console.log('\n✅ LIST ok — read works. Objects:', list.KeyCount ?? 0)
} catch (e) {
  console.log('\n❌ LIST failed:', e.name, '-', e.message)
}

// 2. Try to PUT (write permission)
try {
  const key = `properties/_diag/test-${Date.now()}.txt`
  await client.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: 'diagnostic upload test',
    ContentType: 'text/plain',
  }))
  console.log('✅ PUT ok — WRITE works. Key:', key)
} catch (e) {
  console.log('❌ PUT failed:', e.name, '-', e.message)
  if (e.$metadata) console.log('   HTTP status:', e.$metadata.httpStatusCode)
}
