import { expect, test } from './apoio/scryfall-falso'

test.describe('Navegação pelo teclado', () => {
  test('o primeiro Tab mostra o link de pular para a busca', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#titulo-tela')).toBeVisible()
    await page.keyboard.press('Tab')
    const pular = page.getByRole('link', { name: 'Pular para a busca' })
    await expect(pular).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('combobox', { name: 'Nome da carta' })).toBeFocused()
  })

  test('painel de ajustes abre, prende o foco e fecha com Esc', async ({ page }) => {
    await page.goto('/')
    const botaoAbrir = page.getByRole('button', { name: 'Abrir ajustes' })
    await botaoAbrir.focus()
    await page.keyboard.press('Enter')

    const painel = page.getByRole('dialog', { name: 'Ajustes' })
    await expect(painel).toBeVisible()
    await expect(painel.getByRole('button', { name: 'Fechar ajustes' })).toBeFocused()

    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab')
      const focoFora = await painel.evaluate((el) => {
        const foco = document.activeElement
        return !!foco && foco !== document.body && !el.contains(foco)
      })
      expect(focoFora, 'o foco foi para um elemento atrás do painel').toBe(false)
    }

    await painel.getByRole('button', { name: 'Fechar ajustes' }).focus()
    await page.keyboard.press('Escape')
    await expect(painel).toBeHidden()
    await expect(botaoAbrir).toBeFocused()
  })

  test('todo elemento focado mostra o contorno de foco', async ({ page }) => {
    await page.goto('/')
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      const contorno = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el || el === document.body) return 'sem foco'
        const estilo = getComputedStyle(el)
        const visivel = estilo.outlineStyle !== 'none' && parseFloat(estilo.outlineWidth) >= 2
        return visivel ? 'ok' : `${el.tagName} sem contorno`
      })
      expect(contorno).not.toContain('sem contorno')
    }
  })
})
