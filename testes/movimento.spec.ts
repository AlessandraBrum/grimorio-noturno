import type { Page } from '@playwright/test'
import { expect, test } from './apoio/scryfall-falso'

async function animacaoDaGaveta(page: Page) {
  await page.getByRole('button', { name: 'Abrir ajustes' }).click()
  const gaveta = page.locator('#painel-ajustes')
  await expect(gaveta).toBeVisible()
  return gaveta.evaluate((el) => getComputedStyle(el).animationName)
}

function guardarPreferencia(page: Page, animacoes: boolean) {
  return page.addInitScript((ligadas) => {
    localStorage.setItem('grimorio-noturno:preferencias', JSON.stringify({ animacoes: ligadas }))
  }, animacoes)
}

test.describe('Animações', () => {
  test('ficam ligadas quando o sistema permite', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/')
    expect(await animacaoDaGaveta(page)).toBe('entrar-pela-direita')
  })

  test('param quando o sistema pede para reduzir movimento, mesmo com o botão do app ligado', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await guardarPreferencia(page, true)
    await page.goto('/')
    expect(await animacaoDaGaveta(page)).toBe('none')
  })

  test('param quando a pessoa desliga no app', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await guardarPreferencia(page, false)
    await page.goto('/')
    expect(await animacaoDaGaveta(page)).toBe('none')
  })
})
