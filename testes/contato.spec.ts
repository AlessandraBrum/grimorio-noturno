
import { conferirAcessibilidade } from './apoio/acessibilidade'
import { expect, test } from './apoio/scryfall-falso'

for (const tema of ['escuro', 'claro']) {
  test(`contato acessível no tema ${tema}`, async ({ page }) => {
    await page.addInitScript((temaEscolhido) => {
      localStorage.setItem('grimorio-noturno:preferencias', JSON.stringify({ tema: temaEscolhido }))
    }, tema)
    await page.goto('/#contato')
    await page.getByRole('combobox', { name: /Assunto/ }).click()
    await page.getByRole('option', { name: 'Agradecimento', exact: true }).click()
    await expect(page.getByLabel('Mensagem', { exact: true })).toHaveAccessibleDescription(
      'Muito obrigada! O aplicativo me ajudou no dia a dia da seguinte maneira:',
    )
    await expect(page.locator('#contato-exemplo')).toContainText('*****')
    await page.getByRole('radio', { name: 'E-mail', exact: true }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByLabel('Número do WhatsApp')).toBeVisible()
    await conferirAcessibilidade(page)
    await page.setViewportSize({ width: 320, height: 720 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  })
}

test('envia texto longo e várias imagens, retomando após falha parcial', async ({ page }) => {
  const partes: number[] = []
  await page.route('**/api/contato', async (rota) => {
    const pedido = rota.request().postDataBuffer()!.toString()
    expect(pedido).toContain('contato@example.com')
    const parte = Number(pedido.match(/name="parte"\r\n\r\n(\d+)/)?.[1])
    partes.push(parte)
    if (partes.length === 2) return rota.fulfill({ status: 502 })
    await rota.fulfill({ json: { enviado: true } })
  })
  await page.goto('/#contato')
  await page.getByRole('combobox', { name: /Assunto/ }).click()
  await page.getByRole('option', { name: 'Reportar erro', exact: true }).click()
  await page.getByLabel('Mensagem').fill('a'.repeat(50_001))
  await page.getByRole('textbox', { name: 'E-mail' }).fill('contato@example.com')
  const imagens = page.getByLabel('Imagens (opcional)')
  await imagens.setInputFiles({ name: 'primeira.png', mimeType: 'image/png', buffer: Buffer.from('imagem') })
  await imagens.setInputFiles({ name: 'segunda.png', mimeType: 'image/png', buffer: Buffer.from('imagem') })
  await expect(page.getByText('2 imagens anexadas.')).toBeVisible()
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Parte da mensagem já foi enviada' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar envio' }).click()
  await expect(page.getByText('Mensagem enviada.', { exact: false })).toBeVisible()
  expect(partes).toEqual([1, 2, 2, 3, 4])
})

test('abre pelo menu e pela ficha da carta', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Abrir ajustes' }).click()
  await page.getByRole('dialog').getByRole('link', { name: 'Contato' }).press('Enter')
  await expect(page.getByRole('heading', { name: 'Contato', exact: true })).toBeFocused()

  await page.goto('/')
  const busca = page.getByRole('combobox', { name: 'Nome da carta' })
  await busca.fill('Midnight Owl')
  await busca.press('Enter')
  await page.getByRole('button', { name: 'Reportar erro' }).click()
  await expect(page.getByRole('combobox', { name: /Assunto/ })).toContainText('Reportar erro')
  await expect(page.getByText('Origem: Carta exibida (Midnight Owl)')).toBeVisible()
  await page.goBack()
  await page.getByRole('contentinfo').getByRole('link', { name: 'Contato' }).click()
  await expect(page.getByRole('combobox', { name: /Assunto/ })).toContainText('Escolha um assunto')
})


test('redimensiona imagem grande e permite remover a captura', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => {
        const imagem = document.createElement('canvas')
        imagem.width = 128
        imagem.height = 128
        const ctx = imagem.getContext('2d')!
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, 128, 128)
        return imagem.captureStream(15)
      },
    })
  })
  await page.goto('/#camera')
  await expect.poll(() => page.locator('video').evaluate((video) => (video as HTMLVideoElement).videoWidth)).toBe(128)
  await page.getByRole('button', { name: 'Reportar erro' }).click()
  await expect(page.getByRole('combobox', { name: /Assunto/ })).toContainText('Reportar erro')
  const remover = page.getByRole('button', { name: 'Remover captura-da-camera.jpg' })
  await expect(remover).toBeVisible()
  await remover.click()
  const entrada = page.getByLabel('Imagens (opcional)')
  await expect(entrada).toBeFocused()
  await entrada.evaluate((elemento) => {
    const input = elemento as HTMLInputElement
    const imagem = document.createElement('canvas')
    imagem.width = 20
    imagem.height = 20
    imagem.toBlob((blob) => {
      const dados = new DataTransfer()
      dados.items.add(new File([blob!, new Uint8Array(3_000_001)], 'grande.png', { type: 'image/png' }))
      input.files = dados.files
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
  })
  await expect(page.getByRole('button', { name: 'Remover grande.jpg' })).toBeVisible()
})


test('Ajuda oferece Contato com foco e brilho do tema', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('grimorio-noturno:preferencias', JSON.stringify({ tema: 'claro' }))
  })
  await page.goto('/#ajuda')
  const contato = page.getByRole('main').getByRole('link', { name: 'Contato' })
  await contato.focus()
  await expect(contato).toHaveCSS('outline-style', 'solid')
  if (await page.evaluate(() => matchMedia('(hover: hover)').matches)) {
    const brilhoInicial = await contato.evaluate((link) => getComputedStyle(link).boxShadow)
    await contato.hover()
    await expect.poll(() => contato.evaluate((link) => getComputedStyle(link).boxShadow)).not.toBe(brilhoInicial)
    await expect(contato).toHaveCSS('color', 'rgb(243, 233, 238)')
  }
  await contato.press('Enter')
  await expect(page.getByRole('heading', { name: 'Contato', exact: true })).toBeFocused()
})
