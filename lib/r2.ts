import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const R2_PUBLIC_BASE = process.env.R2_PUBLIC_URL!

function getClient() {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    // Disable automatic checksums — they get embedded in the presigned URL
    // but the browser PUT doesn't send the matching headers → 403.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
}

const BUCKET = process.env.R2_BUCKET_NAME!
const PUBLIC_URL = process.env.R2_PUBLIC_URL!

export async function createPresignedUploadUrl(
  key: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const client = getClient()
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  })
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 })
  const publicUrl = `${PUBLIC_URL}/${key}`
  return { uploadUrl, publicUrl }
}

// Server-side direct upload — the browser sends the file to our API and we
// push it to R2 from the server. Avoids browser→R2 CORS and presigned-URL
// signature fragility entirely.
export async function uploadObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<{ publicUrl: string }> {
  const client = getClient()
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
  return { publicUrl: `${PUBLIC_URL}/${key}` }
}

export async function deleteObject(key: string): Promise<void> {
  const client = getClient()
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

export function keyFromUrl(url: string): string {
  return url.replace(`${PUBLIC_URL}/`, '')
}
