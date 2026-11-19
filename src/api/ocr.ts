import enderecoDoLeitor from 'tesseract.js/dist/worker.min.js?url'
import type { Worker } from 'tesseract.js'

const PASTA_DO_LEITOR = `${import.meta.env.BASE_URL}leitor`
const LARGURA_DE_LEITURA = 2000
const CONFIANCA_MINIMA = 60

export interface LinhaLida {
  texto: string
  topo: number
}

let leitor: Promise<Worker> | null = null
let avisarProgresso: (porcentagem: number) => void = () => {}

export function prepararLeitor() {
  leitor ??= import('tesseract.js').then(async ({ createWorker, PSM }) => {
    const tesseract = await createWorker(['eng', 'por'], 1, {
      workerPath: enderecoDoLeitor,
      workerBlobURL: false,
      corePath: PASTA_DO_LEITOR,
      langPath: PASTA_DO_LEITOR,
      logger: (mensagem) => {
        if (mensagem.status.includes('traineddata') || mensagem.status.includes('core')) {
          avisarProgresso(Math.round(mensagem.progress * 100))
        }
      },
    })
    await tesseract.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT })
    return tesseract
  })
  leitor.catch(() => {
    leitor = null
  })
  return leitor
}

export function prepararImagem(origem: CanvasImageSource, largura: number, altura: number) {
  const escala = Math.min(4, Math.max(1, LARGURA_DE_LEITURA / largura))
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

export async function lerLinhas(imagem: HTMLCanvasElement, aoProgredir: (porcentagem: number) => void): Promise<LinhaLida[]> {
  avisarProgresso = aoProgredir
  const tesseract = await prepararLeitor()
  const { data } = await tesseract.recognize(imagem, {}, { blocks: true, text: true })
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
