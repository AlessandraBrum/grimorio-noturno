import { conferirAcessibilidade } from './apoio/acessibilidade'
import { expect, test } from './apoio/scryfall-falso'

test('Glossário encontra termos em português e inglês', async ({ page }) => {
  await page.goto('/#glossario')
  const busca = page.getByRole('searchbox', { name: 'Procurar palavra' })
  for (const [consulta, nome] of [
    ['connive', 'Acobertar'],
    ['extorquir', 'Extorquir'],
    ['swamp walk', 'Travessia de pântano'],
    ['mill', 'Triturar'],
    ['surveil', 'Vigiar'],
    ['videncia', 'Vidência'],
  ]) {
    await busca.fill(consulta)
    await expect(page.locator('dt').filter({ hasText: nome })).toBeVisible()
  }
})

const TELAS = [
  { nome: 'Buscar', endereco: '/#buscar' },
  { nome: 'Glossário', endereco: '/#glossario' },
  { nome: 'Leitura', endereco: '/#leitura' },
  { nome: 'Ajuda', endereco: '/#ajuda' },
  { nome: 'Sobre', endereco: '/#sobre' },
]

const TEMAS = ['escuro', 'claro'] as const

for (const tema of TEMAS) {
  test.describe(`Acessibilidade WCAG AAA, tema ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((temaEscolhido) => {
        localStorage.setItem('grimorio-noturno:preferencias', JSON.stringify({ tema: temaEscolhido }))
      }, tema)
    })

    for (const tela of TELAS) {
      test(`tela ${tela.nome}`, async ({ page }) => {
        await page.goto(tela.endereco)
        await expect(page.locator('#titulo-tela')).toBeVisible()
        await conferirAcessibilidade(page)
      })
    }

    test('tela da carta', async ({ page }) => {
      await page.goto('/')
      const campo = page.getByRole('combobox', { name: 'Nome da carta' })
      await campo.fill('Midnight Owl')
      await campo.press('Enter')
      await expect(page.getByRole('heading', { level: 1, name: 'Midnight Owl' })).toBeVisible()
      await conferirAcessibilidade(page)
    })

    test('painel de ajustes aberto', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Abrir ajustes' }).click()
      await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeVisible()
      await conferirAcessibilidade(page)
    })
  })
}
