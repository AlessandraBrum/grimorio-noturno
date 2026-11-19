import { CARTA_FALSA, expect, simularSemInternet, test } from './apoio/scryfall-falso'

test.describe('Busca de carta', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('mostra sugestões e abre a carta pelo teclado', async ({ page }) => {
    const campo = page.getByRole('combobox', { name: 'Nome da carta' })
    await campo.fill('midnight')

    const sugestoes = page.getByRole('listbox', { name: 'Sugestões' })
    await expect(sugestoes.getByRole('option')).toHaveCount(3)

    await campo.press('ArrowDown')
    await expect(sugestoes.getByRole('option', { name: 'Midnight Owl' })).toHaveAttribute('aria-selected', 'true')
    await campo.press('Enter')

    await expect(page.getByRole('heading', { level: 1, name: 'Midnight Owl' })).toBeVisible()
    await expect(page.getByText('Creature — Bird').first()).toBeVisible()
    await expect(page.getByRole('img', { name: 'Imagem da carta Midnight Owl' })).toBeVisible()
    await expect(page).toHaveTitle(/Midnight Owl/)
  })

  test('um nome digitado imperfeito não abre o resultado aproximado', async ({ page }) => {
    const campo = page.getByRole('combobox', { name: 'Nome da carta' })
    await campo.fill('Midnight Owl zzzz')
    await campo.press('Enter')
    await expect(page.getByText('Nenhuma carta com esse nome')).toBeVisible()
  })

  test('avisa quando a carta não existe', async ({ page }) => {
    const campo = page.getByRole('combobox', { name: 'Nome da carta' })
    await campo.fill('carta que não existe')
    await campo.press('Enter')
    await expect(page.getByText('Nenhuma carta com esse nome')).toBeVisible()
  })

  test('avisa quando está sem internet', async ({ page }) => {
    await simularSemInternet(page)
    const campo = page.getByRole('combobox', { name: 'Nome da carta' })
    await campo.fill('Midnight Owl')
    await campo.press('Enter')
    await expect(page.getByText('Você está sem internet.')).toBeVisible()
  })

  test('repete uma consulta que falhou com internet disponível', async ({ page }) => {
    let tentativas = 0
    await page.route('https://api.scryfall.com/cards/named?*', (rota) => {
      tentativas += 1
      return tentativas === 1 ? rota.abort('failed') : rota.fulfill({ json: CARTA_FALSA })
    })
    const campo = page.getByRole('combobox', { name: 'Nome da carta' })
    await campo.fill('Midnight Owl')
    await campo.press('Enter')
    await expect(page.getByRole('heading', { level: 1, name: 'Midnight Owl' })).toBeVisible()
  })

  test('uma API indisponível com internet disponível não acusa falta de internet', async ({ page }) => {
    await page.route('https://api.scryfall.com/**', (rota) => rota.abort('failed'))
    const campo = page.getByRole('combobox', { name: 'Nome da carta' })
    await campo.fill('Midnight Owl')
    await campo.press('Enter')
    await expect(page.getByText('Não foi possível consultar o Scryfall agora.', { exact: false })).toBeVisible()
    await expect(page.getByText('Você está sem internet.', { exact: false })).toHaveCount(0)
  })

  test('carta já vista aparece em recentes', async ({ page }) => {
    const campo = page.getByRole('combobox', { name: 'Nome da carta' })
    await campo.fill('Midnight Owl')
    await campo.press('Enter')
    await expect(page.getByRole('heading', { level: 1, name: 'Midnight Owl' })).toBeVisible()

    await page.goto('/#buscar')
    await expect(page.getByText('Vistas recentemente')).toBeVisible()
    await expect(page.getByText('Midnight Owl').first()).toBeVisible()
  })
})
