import enderecoDoLeitor from 'tesseract.js/dist/worker.min.js?url'
import type { Worker } from 'tesseract.js'
import type { Idioma } from '../types/card'

const PASTA_DO_LEITOR = `${import.meta.env.BASE_URL}leitor`
const LADO_MAXIMO = 1280
const MODELO = { pt: 'por', en: 'eng' }
const CONFIANCA_MINIMA = 60
const CONFIANCA_COM_MAIS_DETALHE = 42

export interface LinhaLida {
  texto: string
  topo: number
  tituloIsolado?: boolean
}

const leitores = new Map<Idioma, Promise<Worker>>()
const progresso = new Map<Idioma, (porcentagem: number) => void>()

export function prepararLeitor(idioma: Idioma) {
  const existente = leitores.get(idioma)
  if (existente) return existente

  const leitor = import('tesseract.js').then(async ({ createWorker, PSM }) => {
    const tesseract = await createWorker(MODELO[idioma], 1, {
      workerPath: enderecoDoLeitor,
      workerBlobURL: false,
      corePath: PASTA_DO_LEITOR,
      langPath: PASTA_DO_LEITOR,
      logger: (mensagem) => {
        if (mensagem.status.includes('traineddata') || mensagem.status.includes('core')) {
          progresso.get(idioma)?.(Math.round(mensagem.progress * 100))
        }
      },
    })
    await tesseract.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT })
    return tesseract
  })
  leitores.set(idioma, leitor)
  leitor.catch(() => leitores.delete(idioma))
  return leitor
}

export function prepararImagem(origem: CanvasImageSource, largura: number, altura: number, ladoMaximo = LADO_MAXIMO) {
  const escala = Math.min(4, ladoMaximo / Math.max(largura, altura))
  const tela = document.createElement('canvas')
  tela.width = Math.round(largura * escala)
  tela.height = Math.round(altura * escala)
  const contexto = tela.getContext('2d')
  if (contexto) {
    contexto.filter = 'grayscale(1)'
    contexto.drawImage(origem, 0, 0, tela.width, tela.height)
  }
  return tela
}

function limparLinha(linha: string) {
  return linha
    .replace(/\{[^{}]+\}/g, ' ')
    .split(/\s+/)
    .map((palavra) => palavra.replace(/^[^\p{L}]+|[^\p{L}',-]+$/gu, ''))
    .filter((palavra) => /\p{L}/u.test(palavra))
    .join(' ')
    .trim()
}

function localizarCarta(imagem: HTMLCanvasElement) {
  const proporcao = imagem.width / imagem.height
  if (proporcao >= 0.68 && proporcao <= 0.76) {
    return { x: 0, y: 0, largura: imagem.width, altura: imagem.height }
  }

  const amostra = document.createElement('canvas')
  const escala = Math.min(1, 240 / Math.max(imagem.width, imagem.height))
  amostra.width = Math.max(1, Math.round(imagem.width * escala))
  amostra.height = Math.max(1, Math.round(imagem.height * escala))
  const contexto = amostra.getContext('2d')
  if (!contexto) return null
  const { width, height } = amostra
  contexto.drawImage(imagem, 0, 0, width, height)
  const pixels = contexto.getImageData(0, 0, width, height).data
  const escuros = new Uint8Array(width * height)
  for (let i = 0; i < escuros.length; i++) {
    escuros[i] = pixels[i * 4] * 0.21 + pixels[i * 4 + 1] * 0.72 + pixels[i * 4 + 2] * 0.07 < 78 ? 1 : 0
  }

  const bordas = escuros.slice()
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      if ((bordas[i - 1] && bordas[i + 1]) || (bordas[i - width] && bordas[i + width])) escuros[i] = 1
    }
  }

  let melhor = null
  let maiorArea = 0
  const fila = new Int32Array(escuros.length)
  for (let origem = 0; origem < escuros.length; origem++) {
    if (!escuros[origem]) continue
    fila[0] = origem
    escuros[origem] = 0
    let tamanho = 1
    let esquerda = width
    let direita = 0
    let topo = height
    let base = 0
    for (let i = 0; i < tamanho; i++) {
      const atual = fila[i]
      const x = atual % width
      const y = Math.floor(atual / width)
      esquerda = Math.min(esquerda, x)
      direita = Math.max(direita, x)
      topo = Math.min(topo, y)
      base = Math.max(base, y)
      for (const vizinho of [x > 0 ? atual - 1 : -1, x < width - 1 ? atual + 1 : -1, atual - width, atual + width]) {
        if (!escuros[vizinho]) continue
        escuros[vizinho] = 0
        fila[tamanho++] = vizinho
      }
    }
    let largura = direita - esquerda + 1
    let altura = base - topo + 1
    if (topo < 3 || altura < 36) continue
    if (esquerda === 0 || direita === width - 1 || base === height - 1) {
      // Uma sombra ou a mão pode unir a borda inferior da carta ao fundo.
      let inicioDaBorda = width
      let fimDaBorda = 0
      for (let i = 0; i < tamanho; i++) {
        const ponto = fila[i]
        if (Math.floor(ponto / width) > topo + 3) continue
        inicioDaBorda = Math.min(inicioDaBorda, ponto % width)
        fimDaBorda = Math.max(fimDaBorda, ponto % width)
      }
      if (inicioDaBorda === 0 || fimDaBorda === width - 1) continue
      esquerda = inicioDaBorda
      largura = fimDaBorda - esquerda + 1
      altura = largura * 88 / 63
      if (largura < 30 || topo + altura > height || altura > base - topo + 12) continue
    }
    const formato = largura / altura
    const area = largura * altura
    if (formato < 0.57 || formato > 0.84 || area <= maiorArea) continue
    if (tamanho < (largura + altura) * 1.5) continue
    maiorArea = area
    melhor = { x: esquerda / escala, y: topo / escala, largura: largura / escala, altura: altura / escala }
  }
  return melhor
}

function recortarTitulo(imagem: HTMLCanvasElement) {
  const carta = localizarCarta(imagem)
  if (!carta) return null
  const recorte = document.createElement('canvas')
  const largura = carta.largura * 0.69
  const altura = carta.altura * 0.053
  recorte.width = Math.max(1, Math.round(largura))
  recorte.height = Math.max(1, Math.round(altura))
  const contexto = recorte.getContext('2d')
  if (!contexto) return null
  contexto.drawImage(imagem, carta.x + carta.largura * 0.082, carta.y + carta.altura * 0.049, largura, altura, 0, 0, recorte.width, recorte.height)
  return recorte
}

export async function lerLinhas(
  obterImagem: () => HTMLCanvasElement | null,
  idioma: Idioma,
  aoProgredir: (porcentagem: number) => void,
  corrigirInclinacao = false,
  priorizarTitulo = true,
): Promise<LinhaLida[]> {
  progresso.set(idioma, aoProgredir)
  const tesseract = await prepararLeitor(idioma).finally(() => {
    if (progresso.get(idioma) === aoProgredir) progresso.delete(idioma)
  })
  const imagem = obterImagem()
  if (!imagem) return []
  const recorte = priorizarTitulo ? recortarTitulo(imagem) : null
  if (recorte) {
    const { PSM } = await import('tesseract.js')
    const opcoesDoTitulo = { rotateAuto: false, tessedit_pageseg_mode: PSM.SINGLE_LINE }
    const { data } = await tesseract.recognize(recorte, opcoesDoTitulo)
    const texto = limparLinha(data.text).replace(/^[B-DF-HJ-NP-TV-Z] (?=\p{L}{3})/u, '')
    if (data.confidence >= 70 && (texto.match(/\p{L}/gu) ?? []).length >= 3) {
      return [{ texto, topo: 0, tituloIsolado: true }]
    }
  }
  const { data } = await tesseract.recognize(imagem, { rotateAuto: corrigirInclinacao }, { blocks: true, text: true })
  const linhas = (data.blocks ?? []).flatMap((bloco) =>
    bloco.paragraphs.flatMap((paragrafo) => paragrafo.lines),
  )
  const confiancaMinima = corrigirInclinacao ? CONFIANCA_COM_MAIS_DETALHE : CONFIANCA_MINIMA
  const lidas = linhas.length
    ? linhas
        .filter((linha) => linha.confidence >= confiancaMinima)
        .map((linha) => ({ texto: limparLinha(linha.text), topo: linha.bbox.y0 }))
    : data.text.split('\n').map((texto, indice) => ({ texto: limparLinha(texto), topo: indice }))
  return lidas
    .filter((linha) => (linha.texto.match(/\p{L}/gu) ?? []).length >= 3)
    .sort((a, b) => a.topo - b.topo)
}
