import { conferirAcessibilidade } from './apoio/acessibilidade'
import { FOTO_DA_CARTA, semCamera, semVozNoNavegador, simularLeitorDeTexto, simularVoz } from './apoio/entradas-falsas'
import { CARTA_FALSA, expect, test } from './apoio/scryfall-falso'

const LEITURA_DUVIDOSA = 'xx midnight owl zzzz qqqq wwww'

test.describe('Busca por voz', () => {
  test('nome falado inteiro abre a carta direto', async ({ page }) => {
    await simularVoz(page, ['midnight owl'])
    await page.goto('/')
    await page.getByRole('button', { name: 'Falar o nome' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Midnight Owl' })).toBeVisible()
  })

  test('só pergunta "É esta carta?" quando entende mal o nome', async ({ page }) => {
    await simularVoz(page, [LEITURA_DUVIDOSA])
    await page.goto('/')
    await page.getByRole('button', { name: 'Falar o nome' }).click()
    await expect(page.getByRole('heading', { name: 'É esta carta?' })).toBeFocused()
    await conferirAcessibilidade(page)
    await page.getByRole('button', { name: 'Sim, abrir' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Midnight Owl' })).toBeVisible()
  })

  test('avisa quando não acha a carta falada', async ({ page }) => {
    await simularVoz(page, ['abacaxi voador'])
    await page.goto('/')
    await page.getByRole('button', { name: 'Falar o nome' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Não achei nenhuma carta' })).toBeVisible()
  })

  test('explica o que fazer quando o navegador não reconhece voz', async ({ page }) => {
    await semVozNoNavegador(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Falar o nome' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Este navegador não reconhece voz' })).toBeVisible()
  })
})

test.describe('Escanear com a câmera', () => {
  test('o botão da busca leva para a câmera', async ({ page }) => {
    await semCamera(page)
    await page.goto('/')
    await page.getByRole('link', { name: 'Escanear com a câmera' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Escanear carta' })).toBeVisible()
  })

  test('a câmera espera a carta parar, lê o nome e abre sem interação', async ({ page }) => {
    await page.addInitScript(() => {
      const getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        canvas.width = 1600
        canvas.height = 900
        const contexto = canvas.getContext('2d')!
        const inicio = performance.now()
        const desenhar = () => {
          const tempo = performance.now() - inicio
          contexto.fillStyle = '#2a2525'
          contexto.fillRect(0, 0, 1600, 900)
          contexto.save()
          const mexendo = tempo < 1200
          contexto.translate(85 + (mexendo ? Math.sin(tempo / 60) * 16 : 0), 160)
          contexto.filter = tempo < 800 ? 'blur(12px)' : 'none'
          contexto.fillStyle = 'black'
          contexto.fillRect(0, 0, 470, 650)
          contexto.fillStyle = 'white'
          contexto.fillRect(12, 12, 446, 626)
          contexto.fillStyle = 'black'
          contexto.font = 'bold 48px Arial'
          contexto.fillText('Midnight Owl', 40, 61)
          contexto.fillText('Creature - Bird', 20, 370)
          contexto.restore()
          requestAnimationFrame(desenhar)
        }
        desenhar()
        return canvas.captureStream(24)
      }
      Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia } })
    })
    const modelos: string[] = []
    page.on('request', (request) => {
      if (request.url().endsWith('.traineddata.gz')) modelos.push(new URL(request.url()).pathname)
    })
    await page.goto('/#camera')
    await expect(page.getByRole('status').filter({ hasText: 'Leitura automática ativa' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Capturar quadro e ler' })).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1, name: 'Midnight Owl' })).toBeVisible({ timeout: 15_000 })
    expect(modelos).toEqual(['/leitor/eng.traineddata.gz'])
  })

  test('sem câmera, oferece foto e botões de voz e digitação', async ({ page }) => {
    await semCamera(page)
    await page.goto('/#camera')
    await expect(page.getByRole('status').filter({ hasText: 'Não consegui abrir a câmera' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Escolher uma foto' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Falar o nome' })).toBeVisible()
    const digitar = page.getByRole('button', { name: 'Digitar o nome' })
    await expect(digitar).toBeVisible()
    await conferirAcessibilidade(page)
    await digitar.click()
    await expect(page.getByRole('combobox', { name: 'Nome da carta' })).toBeFocused()
  })

  test('a busca por voz pode abrir uma carta a partir da tela da câmera', async ({ page }) => {
    await semCamera(page)
    await simularVoz(page, ['midnight owl'])
    await page.goto('/#camera')
    await page.getByRole('button', { name: 'Falar o nome' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Midnight Owl' })).toBeFocused()
  })

  test('nome lido com clareza abre direto e permite escanear outra', async ({ page }) => {
    await semCamera(page)
    await simularLeitorDeTexto(page, 'Midnight Owl  {2}{W}\nCreature — Bird\n')
    await page.goto('/#camera')
    await page.locator('input[type="file"]').setInputFiles(FOTO_DA_CARTA)
    await expect(page.getByRole('heading', { level: 1, name: 'Midnight Owl' })).toBeVisible()

    const escanearOutra = page.getByRole('link', { name: 'Escanear outra carta' })
    await escanearOutra.focus()
    await escanearOutra.press('Enter')
    await expect(page.getByRole('heading', { level: 1, name: 'Escanear carta' })).toBeFocused()
  })

  test('recupera um nome com erro de OCR quando o tipo da carta bate', async ({ page }) => {
    await semCamera(page)
    await simularLeitorDeTexto(page, 'Midnight Owl zz\nCreature — Bird')
    await page.goto('/#camera')
    await page.locator('input[type="file"]').setInputFiles(FOTO_DA_CARTA)
    await expect(page.getByRole('heading', { level: 1, name: 'Midnight Owl' })).toBeVisible()
  })

  test('nome lido com pequeno erro abre direto, sem pedir confirmação', async ({ page }) => {
    await semCamera(page)
    await simularLeitorDeTexto(page, 'Midnight Owl zz')
    await page.goto('/#camera')
    await page.locator('input[type="file"]').setInputFiles(FOTO_DA_CARTA)
    await expect(page.getByRole('heading', { level: 1, name: 'Midnight Owl' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'É esta carta?' })).toHaveCount(0)
  })

  test('uma palavra das regras sem o tipo correspondente não abre uma carta', async ({ page }) => {
    await semCamera(page)
    await simularLeitorDeTexto(page, 'Lifelink\nCreature - Human Cleric')
    await page.route('https://api.scryfall.com/cards/named?fuzzy=Lifelink', (rota) => rota.fulfill({
      json: { ...CARTA_FALSA, name: 'Lifelink', type_line: 'Enchantment — Aura' },
    }))
    await page.goto('/#camera')
    await page.locator('input[type="file"]').setInputFiles(FOTO_DA_CARTA)
    await expect(page.getByRole('status').filter({ hasText: 'Não consegui ler o nome' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'É esta carta?' })).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1, name: 'Escanear carta' })).toBeVisible()
  })

  test('corrige pelo catálogo de nomes uma letra que faltou na leitura', async ({ page }) => {
    await semCamera(page)
    await simularLeitorDeTexto(page, 'Acidic Slim')
    await page.route(/\/cards\/named\?exact=Acidic/, (rota) => rota.fulfill({
      json: { ...CARTA_FALSA, name: 'Acidic Slime', type_line: 'Creature — Ooze' },
    }))
    await page.goto('/#camera')
    await page.locator('input[type="file"]').setInputFiles(FOTO_DA_CARTA)
    await expect(page.getByRole('heading', { level: 1, name: 'Acidic Slime' })).toBeVisible()
  })

  test('reconhece o nome e o tipo da face visível de Liliana', async ({ page }) => {
    await semCamera(page)
    await simularLeitorDeTexto(page, 'Liliana, Heretical Healer\nLegendary Creature - Human Cleric\nLifelink')
    await page.route(/\/cards\/named\?.*Liliana/, (rota) => rota.fulfill({
      json: {
        ...CARTA_FALSA,
        name: 'Liliana, Heretical Healer // Liliana, Defiant Necromancer',
        card_faces: [
          { name: 'Liliana, Heretical Healer', type_line: 'Legendary Creature — Human Cleric' },
          { name: 'Liliana, Defiant Necromancer', type_line: 'Legendary Planeswalker — Liliana' },
        ],
      },
    }))
    await page.goto('/#camera')
    await page.locator('input[type="file"]').setInputFiles(FOTO_DA_CARTA)
    await expect(page.getByRole('heading', { level: 1, name: /Liliana, Heretical Healer/ })).toBeVisible()
  })

  test('vibra e toca um som curto quando reconhece a carta', async ({ page }) => {
    await semCamera(page)
    await simularLeitorDeTexto(page, 'Midnight Owl\nCreature — Bird')
    await page.addInitScript(() => {
      const avisos: string[] = []
      Object.assign(window, { avisosDeReconhecimento: avisos })
      Object.defineProperty(navigator, 'vibrate', { value: () => avisos.push('vibrou') })
      const AudioOriginal = window.AudioContext
      window.AudioContext = class extends AudioOriginal {
        createOscillator() {
          avisos.push('som')
          return super.createOscillator()
        }
      }
    })
    await page.goto('/#camera')
    await page.locator('input[type="file"]').setInputFiles(FOTO_DA_CARTA)
    await expect(page.getByRole('heading', { level: 1, name: 'Midnight Owl' })).toBeVisible()
    expect(await page.evaluate(() => Reflect.get(window, 'avisosDeReconhecimento'))).toEqual(['vibrou', 'som'])
  })

  test('avisa quando não consegue ler o nome', async ({ page }) => {
    await semCamera(page)
    await simularLeitorDeTexto(page, '~~ ..\n')
    await page.goto('/#camera')
    await page.locator('input[type="file"]').setInputFiles(FOTO_DA_CARTA)
    await expect(page.getByRole('status').filter({ hasText: 'Não consegui ler o nome' })).toBeVisible()
  })
})

async function gravarFalas(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const falas: string[] = []
    Object.assign(window, { falasGravadas: falas })
    window.speechSynthesis.speak = (fala: SpeechSynthesisUtterance) => {
      falas.push(fala.text)
    }
  })
}

function falasGravadas(page: import('@playwright/test').Page) {
  return page.evaluate(() => (window as unknown as { falasGravadas: string[] }).falasGravadas)
}

async function abrirCarta(page: import('@playwright/test').Page) {
  const campo = page.getByRole('combobox', { name: 'Nome da carta' })
  await campo.fill('Midnight Owl')
  await campo.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Midnight Owl' })).toBeVisible()
}

test.describe('Leitura em voz alta', () => {
  test('lê a carta em inglês e separa poder de resistência quando não houver tradução', async ({ page }) => {
    await gravarFalas(page)
    await page.goto('/')
    await abrirCarta(page)
    await page.getByRole('button', { name: 'Ler em voz alta' }).click()
    const falas = await falasGravadas(page)
    expect(falas).toHaveLength(1)
    expect(falas[0]).toContain('2 power and 2 toughness')
    expect(falas[0]).not.toContain('2/2')
    expect(falas[0]).toContain('Mana cost')
  })

  test('mudo por padrão: nenhuma carta é lida sozinha', async ({ page }) => {
    await gravarFalas(page)
    await page.goto('/')
    await abrirCarta(page)
    expect(await falasGravadas(page)).toHaveLength(0)
  })

  test('com o som ligado, toda carta aberta é lida sozinha até a pessoa mutar', async ({ page }) => {
    await gravarFalas(page)
    await page.goto('/')
    await abrirCarta(page)
    const som = page.getByRole('button', { name: 'Ler toda carta automaticamente' })
    await som.click()
    await expect(som).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(async () => (await falasGravadas(page)).length).toBe(1)
    const depoisDeLigar = (await falasGravadas(page)).length

    await page.goto('/#buscar')
    await abrirCarta(page)
    await expect.poll(async () => (await falasGravadas(page)).length).toBe(depoisDeLigar + 1)
    const antesDeMutar = (await falasGravadas(page)).length

    await page.getByRole('button', { name: 'Ler toda carta automaticamente' }).click()
    await page.goto('/#buscar')
    await abrirCarta(page)
    expect((await falasGravadas(page)).length).toBe(antesDeMutar)
  })
})
