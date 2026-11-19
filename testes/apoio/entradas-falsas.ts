import type { Page } from '@playwright/test'

export async function simularLeitorDeTexto(page: Page, texto: string) {
  const leitorFalso = `
    self.onmessage = ({ data }) => {
      const resposta = data.action === 'recognize' ? { text: ${JSON.stringify(texto)} } : {}
      self.postMessage({ workerId: data.workerId, jobId: data.jobId, action: data.action, status: 'resolve', data: resposta })
    }
  `
  await page.route(/worker\.min.*\.js/, (rota) => rota.fulfill({ contentType: 'text/javascript', body: leitorFalso }))
}

export async function simularVoz(page: Page, frases: string[]) {
  await page.addInitScript((alternativas) => {
    class ReconhecedorFalso {
      lang = ''
      maxAlternatives = 1
      interimResults = false
      onresult: ((evento: unknown) => void) | null = null
      onerror: ((evento: unknown) => void) | null = null
      onend: (() => void) | null = null
      start() {
        setTimeout(() => {
          this.onresult?.({ results: [alternativas.map((transcript) => ({ transcript }))] })
          this.onend?.()
        }, 50)
      }
      stop() {
        this.onend?.()
      }
    }
    Object.assign(window, { SpeechRecognition: ReconhecedorFalso, webkitSpeechRecognition: undefined })
  }, frases)
}

export async function semVozNoNavegador(page: Page) {
  await page.addInitScript(() => {
    Object.assign(window, { SpeechRecognition: undefined, webkitSpeechRecognition: undefined })
  })
}

export async function semCamera(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.reject(new DOMException('negado', 'NotAllowedError')) },
    })
  })
}

export const FOTO_DA_CARTA = {
  name: 'carta.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  ),
}
