import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1040 } })
  await page.goto('http://127.0.0.1:8011')
  await page.getByRole('button', { name: 'Abrir chamado Integração de pedidos indisponível', exact: true }).click()
  await page.getByRole('button', { name: 'Resolver chamado', exact: true }).waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo(0, 0))
  await mkdir('../docs', { recursive: true })
  await page.screenshot({ path: '../docs/overview.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: '../docs/mobile.png', fullPage: false })
} finally {
  await browser.close()
}
