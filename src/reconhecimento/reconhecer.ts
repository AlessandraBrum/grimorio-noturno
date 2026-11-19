import { ARTE, calcularImpressao, distancia, imagemIntegral, PALAVRAS_POR_IMPRESSAO, tonsDeCinza } from './impressao.js'

const LADO_DE_TRABALHO = 360
const PEDACOS = 8
const VALORES_POR_PEDACO = 1 << 16
const PROPORCAO_DA_ARTE = (ARTE.altura * 88) / (ARTE.largura * 63)
const MENOR_ARTE = 0.3
const MAIOR_ARTE = 0.95
const PASSO_DE_ESCALA = 1.12
const PASSO_DE_POSICAO = 0.1

interface Base {
  nomes: string[]
  indices: Uint32Array
  impressoes: Uint32Array
  inicios: Uint32Array[]
  entradas: Uint32Array[]
}

export interface Reconhecimento {
  nome: string
  distancia: number
  margem: number
}

let base: Promise<Base> | null = null

function pedaco(impressoes: Uint32Array, posicao: number, k: number) {
  const palavra = impressoes[posicao + (k >> 1)]
  return k & 1 ? palavra >>> 16 : palavra & 0xffff
}

function indexar(impressoes: Uint32Array, total: number) {
  const inicios: Uint32Array[] = []
  const entradas: Uint32Array[] = []
  for (let k = 0; k < PEDACOS; k++) {
    const contagem = new Uint32Array(VALORES_POR_PEDACO + 1)
    for (let i = 0; i < total; i++) contagem[pedaco(impressoes, i * PALAVRAS_POR_IMPRESSAO, k) + 1]++
    for (let v = 0; v < VALORES_POR_PEDACO; v++) contagem[v + 1] += contagem[v]
    const lista = new Uint32Array(total)
    const cursor = contagem.slice(0, VALORES_POR_PEDACO)
    for (let i = 0; i < total; i++) lista[cursor[pedaco(impressoes, i * PALAVRAS_POR_IMPRESSAO, k)]++] = i
    inicios.push(contagem)
    entradas.push(lista)
  }
  return { inicios, entradas }
}

export function carregarBase() {
  base ??= fetch(`${import.meta.env.BASE_URL}cartas/impressoes.json`)
    .then((resposta) => {
      if (!resposta.ok) throw new Error('base indisponível')
      return resposta.json() as Promise<{ nomes: string[]; indices: number[]; impressoes: string }>
    })
    .then((dados) => {
      const binario = Uint8Array.from(atob(dados.impressoes), (letra) => letra.charCodeAt(0))
      const impressoes = new Uint32Array(binario.buffer)
      return { nomes: dados.nomes, indices: Uint32Array.from(dados.indices), impressoes, ...indexar(impressoes, dados.indices.length) }
    })
  base.catch(() => {
    base = null
  })
  return base
}

function procurar(dados: Base, consulta: Uint32Array, melhores: Map<number, number>) {
  const vistos = new Set<number>()
  for (let k = 0; k < PEDACOS; k++) {
    const valor = pedaco(consulta, 0, k)
    for (let bit = -1; bit < 16; bit++) {
      const vizinho = bit < 0 ? valor : valor ^ (1 << bit)
      const fim = dados.inicios[k][vizinho + 1]
      for (let p = dados.inicios[k][vizinho]; p < fim; p++) {
        const entrada = dados.entradas[k][p]
        if (vistos.has(entrada)) continue
        vistos.add(entrada)
        const d = distancia(consulta, 0, dados.impressoes, entrada * PALAVRAS_POR_IMPRESSAO)
        const nome = dados.indices[entrada]
        const anterior = melhores.get(nome)
        if (anterior === undefined || d < anterior) melhores.set(nome, d)
      }
    }
  }
}

export async function reconhecerImagem(origem: CanvasImageSource, largura: number, altura: number): Promise<Reconhecimento | null> {
  const dados = await carregarBase()
  const escala = Math.min(1, LADO_DE_TRABALHO / Math.max(largura, altura))
  const w = Math.max(1, Math.round(largura * escala))
  const h = Math.max(1, Math.round(altura * escala))
  const tela = document.createElement('canvas')
  tela.width = w
  tela.height = h
  const contexto = tela.getContext('2d', { willReadFrequently: true })
  if (!contexto) return null
  contexto.drawImage(origem, 0, 0, w, h)
  const soma = imagemIntegral(tonsDeCinza(contexto.getImageData(0, 0, w, h).data, w, h), w, h)

  const melhores = new Map<number, number>()
  const consulta = new Uint32Array(PALAVRAS_POR_IMPRESSAO)
  const menorLado = Math.min(w, h)
  const maiorArte = Math.min(w, h / PROPORCAO_DA_ARTE) * MAIOR_ARTE
  for (let larguraDaArte = menorLado * MENOR_ARTE; larguraDaArte <= maiorArte; larguraDaArte *= PASSO_DE_ESCALA) {
    const alturaDaArte = larguraDaArte * PROPORCAO_DA_ARTE
    const passo = Math.max(2, larguraDaArte * PASSO_DE_POSICAO)
    for (let y = 0; y + alturaDaArte <= h; y += passo) {
      for (let x = 0; x + larguraDaArte <= w; x += passo) {
        calcularImpressao(soma, w, x, y, larguraDaArte, alturaDaArte, consulta)
        procurar(dados, consulta, melhores)
      }
    }
  }

  let melhorNome = -1
  let melhor = Infinity
  let segundo = Infinity
  for (const [nome, d] of melhores) {
    if (d < melhor) {
      segundo = melhor
      melhor = d
      melhorNome = nome
    } else if (d < segundo) {
      segundo = d
    }
  }
  if (melhorNome < 0) return null
  const r = { nome: dados.nomes[melhorNome], distancia: melhor, margem: segundo - melhor }
  ;((window as unknown as { __DEPURAR__: unknown[] }).__DEPURAR__ ??= []).push(r)
  return r
}
