import type { Idioma } from '../types/card'

const ENDPOINT = '/api/ocr-titulo'
const TEMPO_LIMITE_MS = 2000
let disponibilidade: Promise<boolean> | undefined
let suspensoAte = 0

export function consultarOcrNuvem() {
  disponibilidade ??= fetch(ENDPOINT, { signal: AbortSignal.timeout(TEMPO_LIMITE_MS) })
    .then(async (resposta) => resposta.ok && (await resposta.json()).disponivel === true)
    .catch(() => false)
  return disponibilidade
}

export async function lerTituloNaNuvem(recorte: HTMLCanvasElement, idioma: Idioma) {
  if (Date.now() < suspensoAte) return ''
  try {
    const imagem = await new Promise<Blob | null>((resolve) => recorte.toBlob(resolve, 'image/jpeg', 0.86))
    if (!imagem) return ''
    const resposta = await fetch(ENDPOINT + '?idioma=' + idioma, {
      method: 'POST',
      body: imagem,
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    })
    if (!resposta.ok) throw new Error('OCR indisponível')
    const { texto } = await resposta.json()
    return typeof texto === 'string' ? texto.split(/\r?\n/).find((linha) => linha.trim()) ?? '' : ''
  } catch {
    suspensoAte = Date.now() + 30_000
    return ''
  }
}
