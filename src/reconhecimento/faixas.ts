const LADO_DE_ANALISE = 640
const MAXIMO_DE_FAIXAS = 8

export interface Faixa {
  x: number
  y: number
  largura: number
  altura: number
  vertical: boolean
  peso: number
}

interface Retangulo {
  x: number
  y: number
  largura: number
  altura: number
  peso: number
}

interface Caixa {
  x0: number
  y0: number
  x1: number
  y1: number
}

function tonsDeCinza(origem: CanvasImageSource, largura: number, altura: number) {
  const escala = Math.min(1, LADO_DE_ANALISE / Math.max(largura, altura))
  const w = Math.max(1, Math.round(largura * escala))
  const h = Math.max(1, Math.round(altura * escala))
  const tela = document.createElement('canvas')
  tela.width = w
  tela.height = h
  const contexto = tela.getContext('2d', { willReadFrequently: true })
  if (!contexto) return null
  contexto.drawImage(origem, 0, 0, w, h)
  const rgba = contexto.getImageData(0, 0, w, h).data
  const cinza = new Uint8Array(w * h)
  for (let i = 0; i < cinza.length; i++) {
    cinza[i] = (rgba[i * 4] * 77 + rgba[i * 4 + 1] * 150 + rgba[i * 4 + 2] * 29) >> 8
  }
  return { cinza, w, h, escala }
}

function transpor(cinza: Uint8Array, w: number, h: number) {
  const saida = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) saida[x * h + y] = cinza[y * w + x]
  return saida
}

function mapaDeBordas(cinza: Uint8Array, w: number, h: number) {
  const gradiente = new Uint8Array(w * h)
  const histograma = new Uint32Array(256)
  for (let y = 0; y < h; y++) {
    const linha = y * w
    for (let x = 1; x < w - 1; x++) {
      const valor = Math.abs(cinza[linha + x + 1] - cinza[linha + x - 1])
      gradiente[linha + x] = valor
      histograma[valor]++
    }
  }
  let acumulado = 0
  let percentil = 255
  const alvo = w * h * 0.9
  for (let v = 0; v < 256; v++) {
    acumulado += histograma[v]
    if (acumulado >= alvo) {
      percentil = v
      break
    }
  }
  const limiar = Math.min(40, Math.max(14, percentil * 0.8))
  const bordas = new Uint8Array(w * h)
  for (let i = 0; i < bordas.length; i++) if (gradiente[i] > limiar) bordas[i] = 1
  return bordas
}

function manchar(bordas: Uint8Array, w: number, h: number, vaoRelativo: number) {
  const vao = Math.max(3, Math.round(w * vaoRelativo))
  const mancha = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const linha = y * w
    let ultima = -1
    for (let x = 0; x < w; x++) {
      if (!bordas[linha + x]) continue
      if (ultima >= 0 && x - ultima <= vao) mancha.fill(1, linha + ultima, linha + x + 1)
      else mancha[linha + x] = 1
      ultima = x
    }
  }
  const limpa = new Uint8Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (mancha[i] && (mancha[i - w] || mancha[i + w])) limpa[i] = 1
    }
  }
  return limpa
}

function rotular(mapa: Uint8Array, w: number, h: number) {
  const rotulos = new Int32Array(w * h).fill(-1)
  const caixas: Caixa[] = []
  const pilha: number[] = []
  for (let inicio = 0; inicio < mapa.length; inicio++) {
    if (!mapa[inicio] || rotulos[inicio] >= 0) continue
    const caixa = { x0: w, y0: h, x1: 0, y1: 0 }
    const rotulo = caixas.length
    caixas.push(caixa)
    rotulos[inicio] = rotulo
    pilha.push(inicio)
    while (pilha.length) {
      const i = pilha.pop()!
      const x = i % w
      const y = (i - x) / w
      if (x < caixa.x0) caixa.x0 = x
      if (x > caixa.x1) caixa.x1 = x
      if (y < caixa.y0) caixa.y0 = y
      if (y > caixa.y1) caixa.y1 = y
      if (x > 0 && mapa[i - 1] && rotulos[i - 1] < 0) { rotulos[i - 1] = rotulo; pilha.push(i - 1) }
      if (x < w - 1 && mapa[i + 1] && rotulos[i + 1] < 0) { rotulos[i + 1] = rotulo; pilha.push(i + 1) }
      if (y > 0 && mapa[i - w] && rotulos[i - w] < 0) { rotulos[i - w] = rotulo; pilha.push(i - w) }
      if (y < h - 1 && mapa[i + w] && rotulos[i + w] < 0) { rotulos[i + w] = rotulo; pilha.push(i + w) }
    }
  }
  return { rotulos, caixas }
}

function dividirEmLinhas(caixa: Caixa, rotulo: number, rotulos: Int32Array, bordas: Uint8Array, w: number) {
  const linhas: (Caixa & { bordas: number })[] = []
  const largura = caixa.x1 - caixa.x0 + 1
  let atual: (Caixa & { bordas: number }) | null = null
  for (let y = caixa.y0; y <= caixa.y1 + 1; y++) {
    let ocupados = 0
    let primeiro = -1
    let ultimo = -1
    let arestas = 0
    if (y <= caixa.y1) {
      for (let x = caixa.x0; x <= caixa.x1; x++) {
        const i = y * w + x
        if (rotulos[i] !== rotulo) continue
        ocupados++
        arestas += bordas[i]
        if (primeiro < 0) primeiro = x
        ultimo = x
      }
    }
    const cheia = ocupados > largura * 0.12 && arestas > ocupados * 0.06
    if (cheia) {
      if (!atual) atual = { x0: primeiro, y0: y, x1: ultimo, y1: y, bordas: 0 }
      atual.x0 = Math.min(atual.x0, primeiro)
      atual.x1 = Math.max(atual.x1, ultimo)
      atual.y1 = y
      atual.bordas += arestas
    } else if (atual) {
      linhas.push(atual)
      atual = null
    }
  }
  return linhas
}

function linhasDeTexto(cinza: Uint8Array, w: number, h: number, vaoRelativo: number): Retangulo[] {
  const bordas = mapaDeBordas(cinza, w, h)
  const { rotulos, caixas } = rotular(manchar(bordas, w, h, vaoRelativo), w, h)
  const maiorLado = Math.max(w, h)
  const linhas: Retangulo[] = []
  caixas.forEach((caixa, rotulo) => {
    if (caixa.x1 - caixa.x0 < 12) return
    for (const linha of dividirEmLinhas(caixa, rotulo, rotulos, bordas, w)) {
      const largura = linha.x1 - linha.x0 + 1
      const altura = linha.y1 - linha.y0 + 1
      if (altura < 6 || altura > maiorLado * 0.05) continue
      if (largura < altura * 2.5 || largura > w * 0.97) continue
      const densidade = linha.bordas / (largura * altura)
      if (densidade < 0.08 || densidade > 0.75) continue
      linhas.push({ x: linha.x0, y: linha.y0, largura, altura, peso: altura * Math.min(1, largura / (altura * 3.5)) })
    }
  })
  for (const linha of linhas) linha.peso /= 1 + vizinhas(linha, linhas)
  return linhas.sort((a, b) => b.peso - a.peso)
}

function vizinhas(linha: Retangulo, linhas: Retangulo[]) {
  let total = 0
  for (const outra of linhas) {
    if (outra === linha) continue
    const distancia = Math.abs(outra.y - linha.y)
    const proporcao = outra.altura / linha.altura
    const sobreposicao = Math.min(linha.x + linha.largura, outra.x + outra.largura) - Math.max(linha.x, outra.x)
    if (distancia >= linha.altura * 0.8 && distancia <= linha.altura * 2.2 && proporcao > 0.7 && proporcao < 1.4
      && sobreposicao > Math.min(linha.largura, outra.largura) * 0.3) total++
  }
  return Math.min(total, 2)
}

function forcaDaOrientacao(linhas: Retangulo[]) {
  return linhas.filter((linha) => linha.largura >= linha.altura * 5).length
}

const INCLINACAO_MAXIMA = 12

function inclinacao(cinza: Uint8Array, w: number, h: number) {
  const xs: number[] = []
  const ys: number[] = []
  const passo = Math.max(1, Math.floor((w * h) / 120000))
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1 + (y % passo); x < w - 1; x += passo) {
      const i = y * w + x
      const gx = Math.abs(cinza[i + 1] - cinza[i - 1])
      const gy = Math.abs(cinza[i + w] - cinza[i - w])
      if (gx + gy > 60) {
        xs.push(x)
        ys.push(y)
      }
    }
  }
  if (xs.length < 200) return 0
  const tamanho = w + h
  const linhas = new Float32Array(tamanho * 2)
  const colunas = new Float32Array(tamanho * 2)
  let melhor = 0
  let melhorPontuacao = -1
  for (let graus = -INCLINACAO_MAXIMA; graus <= INCLINACAO_MAXIMA; graus += 1) {
    const t = Math.tan((graus * Math.PI) / 180)
    linhas.fill(0)
    colunas.fill(0)
    for (let k = 0; k < xs.length; k++) {
      linhas[Math.round(ys[k] - xs[k] * t) + tamanho]++
      colunas[Math.round(xs[k] + ys[k] * t) + tamanho]++
    }
    let pontuacao = 0
    for (let i = 0; i < linhas.length; i++) pontuacao += linhas[i] * linhas[i] + colunas[i] * colunas[i]
    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao
      melhor = graus
    }
  }
  return melhor
}

export function endireitar(origem: CanvasImageSource, largura: number, altura: number, grausConhecidos?: number) {
  const imagem = grausConhecidos === undefined ? tonsDeCinza(origem, largura, altura) : null
  const graus = grausConhecidos ?? (imagem ? inclinacao(imagem.cinza, imagem.w, imagem.h) : 0)
  const tela = document.createElement('canvas')
  tela.width = largura
  tela.height = altura
  const contexto = tela.getContext('2d')
  if (contexto) {
    contexto.translate(largura / 2, altura / 2)
    contexto.rotate((-graus * Math.PI) / 180)
    contexto.drawImage(origem, -largura / 2, -altura / 2, largura, altura)
  }
  return { tela, graus }
}

const VAO_NO_QUADRO = 0.014
const VAO_NA_CARTA = 0.03

export function encontrarFaixas(origem: CanvasImageSource, largura: number, altura: number, cartaRecortada = false): Faixa[] {
  const imagem = tonsDeCinza(origem, largura, altura)
  if (!imagem) return []
  const { cinza, w, h, escala } = imagem
  const vao = cartaRecortada ? VAO_NA_CARTA : VAO_NO_QUADRO
  const deitadas = linhasDeTexto(cinza, w, h, vao)
  const empe = linhasDeTexto(transpor(cinza, w, h), h, w, vao)
  const paraFaixa = (vertical: boolean) => (r: Retangulo): Faixa => vertical
    ? { x: r.y / escala, y: r.x / escala, largura: r.altura / escala, altura: r.largura / escala, peso: r.peso, vertical }
    : { x: r.x / escala, y: r.y / escala, largura: r.largura / escala, altura: r.altura / escala, peso: r.peso, vertical }
  const horizontais = deitadas.map(paraFaixa(false))
  const verticais = empe.map(paraFaixa(true))
  const [primeira, segunda] = forcaDaOrientacao(deitadas) >= forcaDaOrientacao(empe)
    ? [horizontais, verticais]
    : [verticais, horizontais]
  return [...primeira.slice(0, 5), ...segunda.slice(0, 3)].slice(0, MAXIMO_DE_FAIXAS)
}
