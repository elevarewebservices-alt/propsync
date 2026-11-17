// Captures the screenshots shown on /demo from the seeded demo account.
//
//   node scripts/capture-demo.mjs [baseUrl]
//
// baseUrl defaults to http://localhost:3000 (run `npm run build && npm start`
// first, with DEMO_LOGIN_EMAIL/DEMO_LOGIN_PASSWORD in .env.local and the demo
// seeded). Pass https://www.propsyncia.com to capture production instead.
// Writes public/demo/{dashboard,propiedades,crm,asistente}.webp.

import { chromium } from 'playwright'
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '')
const outDir = join(process.cwd(), 'public', 'demo')
mkdirSync(outDir, { recursive: true })

const SHOTS = [
  { key: 'dashboard', path: '/dashboard' },
  { key: 'propiedades', path: '/propiedades' },
  { key: 'crm', path: '/crm' },
  { key: 'asistente', path: '/asistente' },
]

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'dark' })
const page = await context.newPage()

// Sign in exactly like a visitor does: POST the demo-login form.
await page.goto(`${base}/demo`)
await Promise.all([
  page.waitForURL('**/dashboard', { timeout: 30_000 }),
  page.locator('form[action="/api/demo/login"] button').first().click(),
])

for (const shot of SHOTS) {
  await page.goto(`${base}${shot.path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500) // let charts/images settle
  const png = await page.screenshot({ type: 'png' })
  const file = join(outDir, `${shot.key}.webp`)
  await sharp(png).resize(1440).webp({ quality: 82 }).toFile(file)
  console.log('✓', file)
}

await browser.close()
