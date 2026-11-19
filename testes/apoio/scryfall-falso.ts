import { test as base, type Page } from '@playwright/test'

export const CARTA_FALSA = {
  object: 'card',
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Midnight Owl',
  lang: 'en',
  type_line: 'Creature — Bird',
  mana_cost: '{2}{W}',
  oracle_text: 'Flying',
  keywords: ['Flying'],
  power: '2',
  toughness: '2',
  artist: 'Artista de Teste',
  set_name: 'Conjunto de Teste',
  rarity: 'common',
  image_uris: { normal: 'https://cards.scryfall.io/normal/teste.png' },
}

const NOMES = ['Midnight Owl', 'Midnight Oil', 'Midnight Haunting']

const PNG_VAZIO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

const SVG_VAZIO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg>'

const NAO_ENCONTRADA = { status: 404, json: { object: 'error', status: 404 } }

export async function simularScryfall(page: Page) {
  await page.route(
    (url) => url.hostname !== 'localhost',
    (rota) => rota.abort('blockedbyclient'),
  )

  await page.route('https://api.scryfall.com/**', (rota) => {
    const url = new URL(rota.request().url())
    const busca = (url.searchParams.get('q') ?? url.searchParams.get('fuzzy') ?? '').toLowerCase()

    if (url.pathname === '/cards/autocomplete') {
      const data = NOMES.filter((nome) => nome.toLowerCase().includes(busca))
      return rota.fulfill({ json: { object: 'catalog', data } })
    }
    if (url.pathname === '/cards/named' && busca.includes('midnight owl')) {
      return rota.fulfill({ json: CARTA_FALSA })
    }
    return rota.fulfill(NAO_ENCONTRADA)
  })

  await page.route('https://cards.scryfall.io/**', (rota) =>
    rota.fulfill({ contentType: 'image/png', body: PNG_VAZIO }),
  )
  await page.route('https://svgs.scryfall.io/**', (rota) =>
    rota.fulfill({ contentType: 'image/svg+xml', body: SVG_VAZIO }),
  )
}

export async function simularSemInternet(page: Page) {
  await page.route('https://api.scryfall.com/**', (rota) => rota.abort('internetdisconnected'))
}

export const test = base.extend({
  page: async ({ page }, usar) => {
    await simularScryfall(page)
    await usar(page)
  },
})

export { expect } from '@playwright/test'
