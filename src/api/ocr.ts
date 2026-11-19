import enderecoDoLeitor from 'tesseract.js/dist/worker.min.js?url'
import type { Worker } from 'tesseract.js'
import type { Idioma } from '../types/card'

const PASTA_DO_LEITOR = `${import.meta.env.BASE_URL}leitor`
const LADO_MAXIMO = 1280
const MODELO = { pt: 'por', en: 'eng' }
const CONFIANCA_MINIMA = 60

export interface LinhaLida {
  texto: string
  topo: number
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
    .split(/\s+/)
    .map((palavra) => palavra.replace(/^[^\p{L}]+|[^\p{L}',-]+$/gu, ''))
    .filter((palavra) => /\p{L}/u.test(palavra))
    .join(' ')
    .trim()
}

export async function lerLinhas(imagem: HTMLCanvasElement, idioma: Idioma, aoProgredir: (porcentagem: number) => void, corrigirInclinacao = false): Promise<LinhaLida[]> {
  progresso.set(idioma, aoProgredir)
  const tesseract = await prepararLeitor(idioma).finally(() => {
    if (progresso.get(idioma) === aoProgredir) progresso.delete(idioma)
  })
  const { data } = await tesseract.recognize(imagem, { rotateAuto: corrigirInclinacao }, { blocks: true, text: true })
  const linhas = (data.blocks ?? []).flatMap((bloco) =>
    bloco.paragraphs.flatMap((paragrafo) => paragrafo.lines),
  )
  const lidas = linhas.length
    ? linhas
        .filter((linha) => linha.confidence >= CONFIANCA_MINIMA)
        .map((linha) => ({ texto: limparLinha(linha.text), topo: linha.bbox.y0 }))
    : data.text.split('\n').map((texto, indice) => ({ texto: limparLinha(texto), topo: indice }))
  return lidas
    .filter((linha) => (linha.texto.match(/\p{L}/gu) ?? []).length >= 4)
    .sort((a, b) => a.topo - b.topo)
}
