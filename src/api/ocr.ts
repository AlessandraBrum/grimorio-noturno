import enderecoDoLeitor from 'tesseract.js/dist/worker.min.js?url'
import type { Worker } from 'tesseract.js'

const PASTA_DO_LEITOR = `${import.meta.env.BASE_URL}leitor`
const LETRAS_PERMITIDAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz,'- "

export interface LeituraDeLinha {
  texto: string
  confianca: number
}

let leitor: Promise<Worker> | null = null
let avisarProgresso: (porcentagem: number) => void = () => {}

export function prepararLeitor(aoProgredir?: (porcentagem: number) => void) {
  if (aoProgredir) avisarProgresso = aoProgredir
  leitor ??= import('tesseract.js').then(async ({ createWorker, PSM }) => {
    const tesseract = await createWorker('eng', 1, {
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
    await tesseract.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      tessedit_char_whitelist: LETRAS_PERMITIDAS,
    })
    return tesseract
  })
  leitor.catch(() => {
    leitor = null
  })
  return leitor
}

export async function lerLinha(imagem: HTMLCanvasElement): Promise<LeituraDeLinha> {
  const tesseract = await prepararLeitor()
  const { data } = await tesseract.recognize(imagem)
  const primeira = data.text.split('\n').find((linha) => linha.trim()) ?? ''
  return { texto: primeira.replace(/\s+/g, ' ').trim(), confianca: data.confidence }
}
