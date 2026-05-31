import crypto from 'crypto'

const ALGO = 'aes-256-gcm'

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY
  if (!secret || secret.length < 32) {
    throw new Error('ENCRYPTION_KEY must be set and at least 32 chars long')
  }
  return crypto.createHash('sha256').update(secret).digest()
}

export function encrypt(plain: string): string {
  const iv     = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const enc    = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag    = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, encB64] = payload.split(':')
  if (!ivB64 || !tagB64 || !encB64) throw new Error('Malformed encrypted payload')
  const iv       = Buffer.from(ivB64, 'base64')
  const tag      = Buffer.from(tagB64, 'base64')
  const enc      = Buffer.from(encB64, 'base64')
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}
