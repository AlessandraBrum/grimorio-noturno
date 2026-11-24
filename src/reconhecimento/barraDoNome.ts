import type { Ponto } from './contorno'

const LARGURA_DA_CARTA = 700
const ALTURA_DA_CARTA = Math.round((LARGURA_DA_CARTA * 88) / 63)
const FAIXA_DE_BUSCA = { x0: 0.03, x1: 0.97, y0: 0.015, y1: 0.17 }
const COLUNAS_DO_TEXTO = { x0: 0.06, x1: 0.7 }
const ALTURA_DA_LINHA = 0.042
const FOLGA_DA_LINHA = 0.3
const ALTURA_DO_TEXTO = 48
const TRACO_DEITADO = 3
const TRACO_EM_PE = 1.3

export interface Quadro {
  dados: Uint8ClampedArray
  largura: number
  altura: number
}

export function lerQuadro(origem: CanvasImageSource, largura: number, altura: number): Quadro | null {
  const tela = origem instanceof HTMLCanvasElement ? origem : document.createElement('canvas')
  if (tela !== origem) {
    tela.width = largura
    tela.height = altura
    tela.getContext('2d')?.drawImage(origem, 0, 0, largura, altura)
  }
  const contexto = tela.getContext('2d', { willReadFrequently: true })
  if (!contexto) return null
  return { dados: contexto.getImageData(0, 0, largura, altura).data, largura, altura }
}

function resolver(a: number[][], b: number[]) {
  const n = b.length
  for (let i = 0; i < n; i++) {
    let pivo = i
    for (let k = i + 1; k < n; k++) if (Math.abs(a[k][i]) > Math.abs(a[pivo][i])) pivo = k
    ;[a[i], a[pivo]] = [a[pivo], a[i]]
    ;[b[i], b[pivo]] = [b[pivo], b[i]]
    for (let k = i + 1; k < n; k++) {
      const f = a[k][i] / a[i][i]
      for (let j = i; j < n; j++) a[k][j] -= f * a[i][j]
      b[k] -= f * b[i]
    }
  }
  const x = new Array<number>(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i]
    for (let j = i + 1; j < n; j++) s -= a[i][j] * x[j]
    x[i] = s / a[i][i]
  }
  return x
}

function homografia(destino: Ponto[], origem: Ponto[]) {
  const a: number[][] = []
  const b: number[] = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = destino[i]
    const { x: u, y: v } = origem[i]
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y])
    b.push(u)
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y])
    b.push(v)
  }
  return [...resolver(a, b), 1]
}

function ordenar(cantos: Ponto[]) {
  let lista = [...cantos]
  const giro = (lista[1].x - lista[0].x) * (lista[2].y - lista[1].y) - (lista[1].y - lista[0].y) * (lista[2].x - lista[1].x)
  if (giro < 0) lista = [lista[0], lista[3], lista[2], lista[1]]
  const curto = Math.hypot(lista[1].x - lista[0].x, lista[1].y - lista[0].y)
  const longo = Math.hypot(lista[2].x - lista[1].x, lista[2].y - lista[1].y)
  if (curto > longo) lista = [lista[1], lista[2], lista[3], lista[0]]
  return lista
}

export function orientacoes(cantos: Ponto[]) {
  const reta = ordenar(cantos)
  return [reta, [reta[2], reta[3], reta[0], reta[1]]]
}

function amostrar(quadro: Quadro, cantos: Ponto[], regiao: { x0: number; x1: number; y0: number; y1: number }) {
  const m = homografia(
    [{ x: 0, y: 0 }, { x: LARGURA_DA_CARTA, y: 0 }, { x: LARGURA_DA_CARTA, y: ALTURA_DA_CARTA }, { x: 0, y: ALTURA_DA_CARTA }],
    cantos,
  )
  const u0 = Math.round(regiao.x0 * LARGURA_DA_CARTA)
  const v0 = Math.round(regiao.y0 * ALTURA_DA_CARTA)
  const w = Math.round((regiao.x1 - regiao.x0) * LARGURA_DA_CARTA)
  const h = Math.round((regiao.y1 - regiao.y0) * ALTURA_DA_CARTA)
  const cinza = new Float32Array(w * h)
  const { dados, largura, altura } = quadro
  for (let j = 0; j < h; j++) {
    const v = v0 + j
    for (let i = 0; i < w; i++) {
      const u = u0 + i
      const z = m[6] * u + m[7] * v + m[8]
      const x = (m[0] * u + m[1] * v + m[2]) / z
      const y = (m[3] * u + m[4] * v + m[5]) / z
      const xi = Math.floor(x)
      const yi = Math.floor(y)
      if (xi < 0 || yi < 0 || xi >= largura - 1 || yi >= altura - 1) {
        cinza[j * w + i] = 128
        continue
      }
      const fx = x - xi
      const fy = y - yi
      const p = (yi * largura + xi) * 4
      const q = p + largura * 4
      const l00 = dados[p] * 0.299 + dados[p + 1] * 0.587 + dados[p + 2] * 0.114
      const l10 = dados[p + 4] * 0.299 + dados[p + 5] * 0.587 + dados[p + 6] * 0.114
      const l01 = dados[q] * 0.299 + dados[q + 1] * 0.587 + dados[q + 2] * 0.114
      const l11 = dados[q + 4] * 0.299 + dados[q + 5] * 0.587 + dados[q + 6] * 0.114
      cinza[j * w + i] = (l00 * (1 - fx) + l10 * fx) * (1 - fy) + (l01 * (1 - fx) + l11 * fx) * fy
    }
  }
  return { cinza, w, h }
}

function linhaMaisProvavel(cinza: Float32Array, w: number, h: number) {
  const x0 = Math.round(((COLUNAS_DO_TEXTO.x0 - FAIXA_DE_BUSCA.x0) / (FAIXA_DE_BUSCA.x1 - FAIXA_DE_BUSCA.x0)) * w)
  const x1 = Math.round(((COLUNAS_DO_TEXTO.x1 - FAIXA_DE_BUSCA.x0) / (FAIXA_DE_BUSCA.x1 - FAIXA_DE_BUSCA.x0)) * w)
  const energia = new Float32Array(h)
  for (let y = 0; y < h; y++) {
    let soma = 0
    for (let x = x0 + 1; x < x1; x++) soma += Math.abs(cinza[y * w + x] - cinza[y * w + x - 1])
    energia[y] = soma / (x1 - x0)
  }
  const altura = Math.round(ALTURA_DA_LINHA * ALTURA_DA_CARTA)
  const margem = Math.max(2, Math.round(altura * 0.35))
  const acumulada = new Float32Array(h + 1)
  for (let y = 0; y < h; y++) acumulada[y + 1] = acumulada[y] + energia[y]
  const media = (a: number, b: number) => (a >= b ? 0 : (acumulada[b] - acumulada[a]) / (b - a))
  let melhor = 0
  let melhorNota = -Infinity
  for (let y = 0; y + altura <= h; y++) {
    const dentro = media(y, y + altura)
    const acima = media(Math.max(0, y - margem), y)
    const abaixo = media(y + altura, Math.min(h, y + altura + margem))
    const nota = dentro - Math.max(acima, abaixo)
    if (nota > melhorNota) {
      melhorNota = nota
      melhor = y
    }
  }
  return { topo: melhor, altura }
}

function esticarContraste(cinza: Float32Array) {
  const histograma = new Uint32Array(256)
  for (const v of cinza) histograma[Math.max(0, Math.min(255, v | 0))]++
  const n = cinza.length
  const percentil = (p: number) => {
    let acumulado = 0
    for (let v = 0; v < 256; v++) {
      acumulado += histograma[v]
      if (acumulado >= n * p) return v
    }
    return 255
  }
  const escuro = percentil(0.02)
  const claro = percentil(0.98)
  const mediana = percentil(0.5)
  const inverter = mediana < (escuro + claro) / 2
  const fator = 255 / Math.max(1, claro - escuro)
  const saida = new Uint8ClampedArray(n)
  for (let i = 0; i < n; i++) {
    const v = (cinza[i] - escuro) * fator
    saida[i] = inverter ? 255 - v : v
  }
  return saida
}

function otsu(valores: Uint8ClampedArray) {
  const histograma = new Uint32Array(256)
  for (const v of valores) histograma[v]++
  const n = valores.length
  let soma = 0
  for (let v = 0; v < 256; v++) soma += v * histograma[v]
  let somaFundo = 0
  let pesoFundo = 0
  let melhor = -1
  let limiar = 128
  for (let v = 0; v < 256; v++) {
    pesoFundo += histograma[v]
    if (!pesoFundo) continue
    const pesoFrente = n - pesoFundo
    if (!pesoFrente) break
    somaFundo += v * histograma[v]
    const diferenca = somaFundo / pesoFundo - (soma - somaFundo) / pesoFrente
    const entre = pesoFundo * pesoFrente * diferenca * diferenca
    if (entre > melhor) {
      melhor = entre
      limiar = v
    }
  }
  return limiar
}

function apagarTracos(tinta: Uint8Array, w: number, h: number, alturaDaLinha: number) {
  const maiorDeitado = Math.round(alturaDaLinha * TRACO_DEITADO)
  const maiorEmPe = Math.round(alturaDaLinha * TRACO_EM_PE)
  const apagar = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    let inicio = -1
    for (let x = 0; x <= w; x++) {
      const cheio = x < w && tinta[y * w + x]
      if (cheio && inicio < 0) inicio = x
      if (!cheio && inicio >= 0) {
        if (x - inicio > maiorDeitado) apagar.fill(1, y * w + inicio, y * w + x)
        inicio = -1
      }
    }
  }
  for (let x = 0; x < w; x++) {
    let inicio = -1
    for (let y = 0; y <= h; y++) {
      const cheio = y < h && tinta[y * w + x]
      if (cheio && inicio < 0) inicio = y
      if (!cheio && inicio >= 0) {
        if (y - inicio > maiorEmPe) for (let k = inicio; k < y; k++) apagar[k * w + x] = 1
        inicio = -1
      }
    }
  }
  for (let i = 0; i < tinta.length; i++) if (apagar[i]) tinta[i] = 0
}

function limparTinta(tinta: Uint8Array, w: number, h: number, alturaDaLinha: number) {
  const rotulos = new Int32Array(w * h).fill(-1)
  const pilha: number[] = []
  const membros: number[] = []
  for (let inicio = 0; inicio < tinta.length; inicio++) {
    if (!tinta[inicio] || rotulos[inicio] >= 0) continue
    rotulos[inicio] = inicio
    pilha.push(inicio)
    membros.length = 0
    let x0 = w
    let y0 = h
    let x1 = 0
    let y1 = 0
    while (pilha.length) {
      const i = pilha.pop()!
      membros.push(i)
      const x = i % w
      const y = (i - x) / w
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
      if (x > 0 && tinta[i - 1] && rotulos[i - 1] < 0) { rotulos[i - 1] = inicio; pilha.push(i - 1) }
      if (x < w - 1 && tinta[i + 1] && rotulos[i + 1] < 0) { rotulos[i + 1] = inicio; pilha.push(i + 1) }
      if (y > 0 && tinta[i - w] && rotulos[i - w] < 0) { rotulos[i - w] = inicio; pilha.push(i - w) }
      if (y < h - 1 && tinta[i + w] && rotulos[i + w] < 0) { rotulos[i + w] = inicio; pilha.push(i + w) }
    }
    const largura = x1 - x0 + 1
    const altura = y1 - y0 + 1
    const encostaNaBorda = y0 === 0 || y1 === h - 1 || x0 === 0 || x1 === w - 1
    const comprida = largura > alturaDaLinha * 3 && altura < alturaDaLinha * 0.45
    const alta = altura > alturaDaLinha * 1.25
    const miuda = membros.length < 6
    if (comprida || alta || miuda || (encostaNaBorda && altura < alturaDaLinha * 0.35)) {
      for (const i of membros) tinta[i] = 0
    }
  }
}

function ampliar(claro: Uint8ClampedArray, w: number, h: number, escala: number) {
  const origem = document.createElement('canvas')
  origem.width = w
  origem.height = h
  const imagem = new ImageData(w, h)
  for (let i = 0; i < claro.length; i++) {
    imagem.data[i * 4] = imagem.data[i * 4 + 1] = imagem.data[i * 4 + 2] = claro[i]
    imagem.data[i * 4 + 3] = 255
  }
  origem.getContext('2d')?.putImageData(imagem, 0, 0)
  const saida = document.createElement('canvas')
  saida.width = Math.round(w * escala)
  saida.height = Math.round(h * escala)
  saida.getContext('2d')?.drawImage(origem, 0, 0, saida.width, saida.height)
  return saida
}

export function recortarNome(quadro: Quadro, cantos: Ponto[], modo: 'tinta' | 'cinza' = 'tinta') {
  const { cinza, w, h } = amostrar(quadro, cantos, FAIXA_DE_BUSCA)
  const { topo, altura } = linhaMaisProvavel(cinza, w, h)
  const folga = Math.round(altura * FOLGA_DA_LINHA)
  const y0 = Math.max(0, topo - folga)
  const y1 = Math.min(h, topo + altura + folga)
  const alturaDoRecorte = y1 - y0
  const claro = esticarContraste(cinza.subarray(y0 * w, y1 * w))
  if (modo === 'cinza') return ampliar(claro, w, alturaDoRecorte, ALTURA_DO_TEXTO / altura)
  const limiar = otsu(claro)
  const tinta = new Uint8Array(claro.length)
  for (let i = 0; i < claro.length; i++) if (claro[i] <= limiar) tinta[i] = 1
  apagarTracos(tinta, w, alturaDoRecorte, altura)
  limparTinta(tinta, w, alturaDoRecorte, altura)
  const margem = Math.round(altura * 0.4)
  const origem = document.createElement('canvas')
  origem.width = w + margem * 2
  origem.height = alturaDoRecorte + margem * 2
  const imagem = new ImageData(origem.width, origem.height)
  imagem.data.fill(255)
  for (let y = 0; y < alturaDoRecorte; y++) {
    for (let x = 0; x < w; x++) {
      if (!tinta[y * w + x]) continue
      const p = ((y + margem) * origem.width + x + margem) * 4
      imagem.data[p] = imagem.data[p + 1] = imagem.data[p + 2] = 0
    }
  }
  origem.getContext('2d')?.putImageData(imagem, 0, 0)
  const escala = ALTURA_DO_TEXTO / altura
  const saida = document.createElement('canvas')
  saida.width = Math.round(origem.width * escala)
  saida.height = Math.round(origem.height * escala)
  const contexto = saida.getContext('2d')
  if (contexto) {
    contexto.fillStyle = '#fff'
    contexto.fillRect(0, 0, saida.width, saida.height)
    contexto.drawImage(origem, 0, 0, saida.width, saida.height)
  }
  return saida
}
