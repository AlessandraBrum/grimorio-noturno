import type { Page } from '@playwright/test'
import { expect, test } from './apoio/scryfall-falso'

function guardarPreferencia(page: Page, animacoes: boolean) {
  return page.addInitScript((ligadas) => {
    localStorage.setItem('grimorio-noturno:preferencias', JSON.stringify({ animacoes: ligadas }))
  }, animacoes)
}

function animacoesDoCeu(page: Page) {
  return page.locator('.ceu__brilho, .ceu__cadente').evaluateAll((elementos) =>
    elementos.map((el) => getComputedStyle(el).animationName),
  )
}

test.describe('Céu estrelado', () => {
  test('estrelas cintilam e caem quando o sistema permite', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/')
    const nomes = await animacoesDoCeu(page)
    expect(nomes).toContain('piscar-suave')
    expect(nomes).toContain('cair')
  })

  test('param quando o sistema pede para reduzir movimento, mesmo com o botão do app ligado', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await guardarPreferencia(page, true)
    await page.goto('/')
    expect(new Set(await animacoesDoCeu(page))).toEqual(new Set(['none']))
  })

  test('param quando a pessoa desliga no app', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await guardarPreferencia(page, false)
    await page.goto('/')
    expect(new Set(await animacoesDoCeu(page))).toEqual(new Set(['none']))
  })

  test('estrelas cadentes ficam invisíveis quando as animações estão desligadas', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const opacidades = await page.locator('.ceu__cadente').evaluateAll((elementos) =>
      elementos.map((el) => getComputedStyle(el).opacity),
    )
    expect(new Set(opacidades)).toEqual(new Set(['0']))
  })

  test('o céu fica atrás do conteúdo', async ({ page }) => {
    await page.goto('/')
    const ceu = page.locator('.ceu')
    await expect(ceu).toHaveAttribute('aria-hidden', 'true')
    const estilo = await ceu.evaluate((el) => {
      const css = getComputedStyle(el)
      return { zIndex: css.zIndex, eventos: css.pointerEvents, mascara: css.maskImage || css.webkitMaskImage }
    })
    expect(Number(estilo.zIndex)).toBeLessThan(0)
    expect(estilo.eventos).toBe('none')
    expect(estilo.mascara).toContain('linear-gradient')
  })

  for (const largura of [320, 390, 768, 1024, 1440, 1920]) {
    test(`luas e estrelas ficam fora da coluna do texto em ${largura}px`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 900 })
      await page.goto('/')
      const fora = await page.locator('.ceu__lua, .ceu__brilho').evaluateAll((elementos) => {
        const texto = document.querySelector('.limite')!
        const estilo = getComputedStyle(texto)
        const caixa = texto.getBoundingClientRect()
        const inicio = caixa.left + parseFloat(estilo.paddingLeft)
        const fim = caixa.right - parseFloat(estilo.paddingRight)
        return elementos.every((el) => {
          const r = el.getBoundingClientRect()
          return r.right <= inicio || r.left >= fim
        })
      })
      expect(fora).toBe(true)
    })
  }
})
