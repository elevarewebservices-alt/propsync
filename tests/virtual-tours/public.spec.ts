import { test, expect } from '@playwright/test'
test('public demo: hotspots, navigation, property info, sharing, QR and responsive layout', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  const fullImages: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('request', (request) => {
    if (
      /\/tour-demo\/[^/]+\.webp$/.test(request.url()) &&
      !request.url().includes('-thumb')
    )
      fullImages.push(request.url())
  })
  const response = await page.goto('/tour/demo')
  expect(response?.status()).toBe(200)
  await expect(
    page.getByRole('heading', { name: 'Un hogar frente al mar' }),
  ).toBeVisible()
  await expect(page.locator('.vt-photo-plane>img')).toBeVisible()
  await expect(page.locator('.vt-hotspot').first()).toBeVisible()
  expect(fullImages).toHaveLength(1)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /tour-demo\/sala.webp$/,
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: `.playwright-mcp/tour-${testInfo.project.name}.png`,
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Ir a cocina', exact: true }).click()
  await expect(page.locator('.vt-scene-caption strong')).toHaveText('Cocina')
  await page
    .getByRole('button', { name: '03 · Habitación principal', exact: true })
    .click()
  await expect(page.locator('.vt-scene-caption strong')).toHaveText(
    'Habitación principal',
  )
  await page.getByRole('button', { name: 'Acercar', exact: true }).click()
  await expect(page.locator('.vt-photo-plane')).toHaveAttribute(
    'style',
    /scale\(1.5\)/,
  )
  await page.getByRole('button', { name: 'Restablecer vista' }).click()
  await page.getByRole('button', { name: 'Ver propiedad', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(
    page.getByText('Apartamento ilustrativo · No disponible para venta'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await page
    .getByRole('button', { name: 'Compartir tour', exact: true })
    .click()
  await expect(page.getByLabel('Enlace público')).toHaveValue(/\/tour\/demo$/)
  await expect(
    page.getByRole('link', { name: 'Descargar QR' }),
  ).toHaveAttribute('href', /^data:image\/png;base64,/)
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await expect(
    page.getByRole('link', { name: 'Conocer PropSync', exact: true }),
  ).toHaveAttribute('href', 'https://propsyncia.com')
  expect(errors).toEqual([])
})
test('editor and write APIs require a session', async ({ page, request }) => {
  await page.goto('/virtual-tours')
  await expect(page).toHaveURL(/\/login\?next=/)
  const response = await request.post('/api/virtual-tours', {
    data: { name: 'Unauthorized', slug: 'unauthorized' },
  })
  expect(response.status()).toBe(401)
})
