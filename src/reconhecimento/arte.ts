import { quadroDeTrabalho, reconhecerQuadro, type Reconhecimento } from './reconhecer'

interface Resposta {
  id: number
  resultado: Reconhecimento | null
  falhou?: boolean
}

let trabalhador: Worker | null | undefined
let proximoId = 1
const pendentes = new Map<number, (resposta: Resposta) => void>()

function obterTrabalhador() {
  if (trabalhador !== undefined) return trabalhador
  try {
    trabalhador = new Worker(new URL('./arte.worker.ts', import.meta.url), { type: 'module' })
    trabalhador.onmessage = ({ data }: MessageEvent<Resposta>) => {
      pendentes.get(data.id)?.(data)
      pendentes.delete(data.id)
    }
    trabalhador.onerror = () => {
      trabalhador = null
      for (const resolver of pendentes.values()) resolver({ id: 0, resultado: null, falhou: true })
      pendentes.clear()
    }
  } catch {
    trabalhador = null
  }
  return trabalhador
}

function pedir(mensagem: { rgba?: Uint8ClampedArray; largura?: number; altura?: number }, transferir: Transferable[] = []) {
  const destino = obterTrabalhador()
  if (!destino) return null
  const id = proximoId++
  return new Promise<Resposta>((resolve) => {
    pendentes.set(id, resolve)
    destino.postMessage({ id, ...mensagem }, transferir)
  })
}

export async function prepararArte() {
  const resposta = await pedir({})
  if (resposta?.falhou) throw new Error('base de artes indisponível')
}

export async function reconhecerArte(origem: CanvasImageSource, largura: number, altura: number) {
  const quadro = quadroDeTrabalho(origem, largura, altura)
  if (!quadro) return null
  const resposta = await pedir({ rgba: quadro.data, largura: quadro.width, altura: quadro.height }, [quadro.data.buffer])
  if (resposta) return resposta.falhou ? null : resposta.resultado
  return reconhecerQuadro(quadro.data, quadro.width, quadro.height)
}
