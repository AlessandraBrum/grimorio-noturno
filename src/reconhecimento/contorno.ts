const LADO_DE_ANALISE = 360
const ANGULOS = 180
const VIZINHANCA_ANGULAR = 3
const PICOS = 28
const PARALELAS_GRAUS = 14
const PROPORCAO_DA_CARTA = 88 / 63
const TOLERANCIA_DA_PROPORCAO = 0.3
const MENOR_AREA = 0.04
const MAIOR_AREA = 0.97
const APOIO_MINIMO = 0.55
const AMOSTRAS_POR_LADO = 48

export interface Ponto {
  x: number
  y: number
}

export interface Contorno {
  cantos: [Ponto, Ponto, Ponto, Ponto]
  ocupacao: number
  apoio: number
}

interface Reta {
  theta: number
  rho: number
  votos: number
}

interface Analise {
  w: number
  h: number
  escala: number
  borda: Uint8Array
  retas: Reta[]
}

const SENOS = Float32Array.from({ length: ANGULOS }, (_, i) => Math.sin((i * Math.PI) / ANGULOS))
const COSSENOS = Float32Array.from({ length: ANGULOS }, (_, i) => Math.cos((i * Math.PI) / ANGULOS))

function analisar(origem: CanvasImageSource, largura: number, altura: number): Analise | null {
  const escala = Math.min(1, LADO_DE_ANALISE / Math.max(largura, altura))
  const w = Math.max(8, Math.round(largura * escala))
  const h = Math.max(8, Math.round(altura * escala))
  const tela = document.createElement('canvas')
  tela.width = w
  tela.height = h
  const contexto = tela.getContext('2d', { willReadFrequently: true })
  if (!contexto) return null
  contexto.drawImage(origem, 0, 0, w, h)
  const rgba = contexto.getImageData(0, 0, w, h).data
  const cinza = new Float32Array(w * h)
  for (let i = 0; i < cinza.length; i++) cinza[i] = rgba[i * 4] * 0.299 + rgba[i * 4 + 1] * 0.587 + rgba[i * 4 + 2] * 0.114
  const intensidade = new Float32Array(w * h)
  const direcao = new Int16Array(w * h).fill(-1)
  const histograma = new Uint32Array(256)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const gx = cinza[i - w + 1] + 2 * cinza[i + 1] + cinza[i + w + 1] - cinza[i - w - 1] - 2 * cinza[i - 1] - cinza[i + w - 1]
      const gy = cinza[i + w - 1] + 2 * cinza[i + w] + cinza[i + w + 1] - cinza[i - w - 1] - 2 * cinza[i - w] - cinza[i - w + 1]
      const forca = Math.hypot(gx, gy) / 4
      intensidade[i] = forca
      histograma[Math.min(255, forca | 0)]++
      let angulo = Math.round((Math.atan2(gy, gx) * ANGULOS) / Math.PI)
      angulo = ((angulo % ANGULOS) + ANGULOS) % ANGULOS
      direcao[i] = angulo
    }
  }
  let acumulado = 0
  let limiar = 255
  const alvo = w * h * 0.88
  for (let v = 0; v < 256; v++) {
    acumulado += histograma[v]
    if (acumulado >= alvo) {
      limiar = v
      break
    }
  }
  limiar = Math.max(12, limiar)
  const borda = new Uint8Array(w * h)
  for (let i = 0; i < borda.length; i++) if (intensidade[i] > limiar) borda[i] = 1
  return { w, h, escala, borda, retas: votar(borda, direcao, w, h) }
}

function votar(borda: Uint8Array, direcao: Int16Array, w: number, h: number) {
  const diagonal = Math.ceil(Math.hypot(w, h))
  const linhas = diagonal * 2 + 1
  const votos = new Float32Array(ANGULOS * linhas)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!borda[i]) continue
      const base = direcao[i]
      for (let d = -VIZINHANCA_ANGULAR; d <= VIZINHANCA_ANGULAR; d++) {
        const t = (base + d + ANGULOS) % ANGULOS
        const rho = Math.round(x * COSSENOS[t] + y * SENOS[t]) + diagonal
        votos[t * linhas + rho] += 1
      }
    }
  }
  const retas: Reta[] = []
  const raioRho = Math.max(4, Math.round(diagonal * 0.02))
  const minimo = Math.min(w, h) * 0.12
  for (let t = 0; t < ANGULOS; t++) {
    for (let r = 0; r < linhas; r++) {
      const v = votos[t * linhas + r]
      if (v < minimo) continue
      let maximo = true
      for (let dt = -4; dt <= 4 && maximo; dt++) {
        const tt = (t + dt + ANGULOS) % ANGULOS
        const espelho = t + dt < 0 || t + dt >= ANGULOS
        for (let dr = -raioRho; dr <= raioRho; dr++) {
          const rr = espelho ? linhas - 1 - (r + dr) : r + dr
          if (rr < 0 || rr >= linhas || (dt === 0 && dr === 0)) continue
          const outro = votos[tt * linhas + rr]
          if (outro > v || (outro === v && (dt < 0 || (dt === 0 && dr < 0)))) {
            maximo = false
            break
          }
        }
      }
      if (maximo) retas.push({ theta: t, rho: r - diagonal, votos: v })
    }
  }
  return retas.sort((a, b) => b.votos - a.votos).slice(0, PICOS)
}

function diferencaAngular(a: number, b: number) {
  const d = Math.abs(a - b) % ANGULOS
  return Math.min(d, ANGULOS - d)
}

function cruzar(a: Reta, b: Reta): Ponto | null {
  const det = COSSENOS[a.theta] * SENOS[b.theta] - SENOS[a.theta] * COSSENOS[b.theta]
  if (Math.abs(det) < 1e-6) return null
  return {
    x: (a.rho * SENOS[b.theta] - b.rho * SENOS[a.theta]) / det,
    y: (b.rho * COSSENOS[a.theta] - a.rho * COSSENOS[b.theta]) / det,
  }
}

function apoioDoLado(analise: Analise, a: Ponto, b: Ponto) {
  const { w, h, borda } = analise
  let presentes = 0
  for (let k = 1; k <= AMOSTRAS_POR_LADO; k++) {
    const f = k / (AMOSTRAS_POR_LADO + 1)
    const x = Math.round(a.x + (b.x - a.x) * f)
    const y = Math.round(a.y + (b.y - a.y) * f)
    let achou = false
    for (let dy = -1; dy <= 1 && !achou; dy++) {
      for (let dx = -1; dx <= 1 && !achou; dx++) {
        const xx = x + dx
        const yy = y + dy
        if (xx >= 0 && yy >= 0 && xx < w && yy < h && borda[yy * w + xx]) achou = true
      }
    }
    if (achou) presentes++
  }
  return presentes / AMOSTRAS_POR_LADO
}

function distancia(a: Ponto, b: Ponto) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function areaDoQuadrilatero(c: Ponto[]) {
  let soma = 0
  for (let i = 0; i < 4; i++) {
    const a = c[i]
    const b = c[(i + 1) % 4]
    soma += a.x * b.y - b.x * a.y
  }
  return Math.abs(soma) / 2
}

function convexo(c: Ponto[]) {
  let sinal = 0
  for (let i = 0; i < 4; i++) {
    const a = c[i]
    const b = c[(i + 1) % 4]
    const d = c[(i + 2) % 4]
    const z = (b.x - a.x) * (d.y - b.y) - (b.y - a.y) * (d.x - b.x)
    if (Math.abs(z) < 1e-6) return false
    const s = Math.sign(z)
    if (sinal && s !== sinal) return false
    sinal = s
  }
  return true
}

export function encontrarContornos(origem: CanvasImageSource, largura: number, altura: number, quantos = 3): Contorno[] {
  const analise = analisar(origem, largura, altura)
  if (!analise) return []
  const { w, h, escala, retas } = analise
  const menorLado = Math.min(w, h)
  const pares: [Reta, Reta][] = []
  for (let i = 0; i < retas.length; i++) {
    for (let j = i + 1; j < retas.length; j++) {
      const a = retas[i]
      const b = retas[j]
      if (diferencaAngular(a.theta, b.theta) > PARALELAS_GRAUS) continue
      const rhoB = Math.abs(a.theta - b.theta) > ANGULOS / 2 ? -b.rho : b.rho
      if (Math.abs(a.rho - rhoB) < menorLado * 0.15) continue
      pares.push([a, b])
    }
  }
  const achados: (Contorno & { pontuacao: number })[] = []
  for (let i = 0; i < pares.length; i++) {
    for (let j = i + 1; j < pares.length; j++) {
      const [a, b] = pares[i]
      const [c, d] = pares[j]
      const entre = diferencaAngular(a.theta, c.theta)
      if (entre < 60) continue
      const cantos = [cruzar(a, c), cruzar(c, b), cruzar(b, d), cruzar(d, a)]
      if (cantos.some((p) => !p || p.x < -w * 0.05 || p.y < -h * 0.05 || p.x > w * 1.05 || p.y > h * 1.05)) continue
      const q = cantos as Ponto[]
      if (!convexo(q)) continue
      const area = areaDoQuadrilatero(q) / (w * h)
      if (area < MENOR_AREA || area > MAIOR_AREA) continue
      const ladoA = (distancia(q[0], q[1]) + distancia(q[2], q[3])) / 2
      const ladoB = (distancia(q[1], q[2]) + distancia(q[3], q[0])) / 2
      const proporcao = Math.max(ladoA, ladoB) / Math.min(ladoA, ladoB)
      const erro = Math.abs(proporcao - PROPORCAO_DA_CARTA) / PROPORCAO_DA_CARTA
      if (erro > TOLERANCIA_DA_PROPORCAO) continue
      const apoios = [0, 1, 2, 3].map((k) => apoioDoLado(analise, q[k], q[(k + 1) % 4]))
      const apoio = apoios.reduce((s, v) => s + v, 0) / 4
      if (Math.min(...apoios) < APOIO_MINIMO * 0.5 || apoio < APOIO_MINIMO) continue
      const pontuacao = apoio * apoio * Math.sqrt(area) * (1 - erro)
      achados.push({
        cantos: q.map((p) => ({ x: p.x / escala, y: p.y / escala })) as Contorno['cantos'],
        ocupacao: area,
        apoio,
        pontuacao,
      })
    }
  }
  achados.sort((a, b) => b.pontuacao - a.pontuacao)
  const escolhidos: Contorno[] = []
  for (const achado of achados) {
    if (escolhidos.length >= quantos) break
    const parecido = escolhidos.some((outro) => outro.cantos.every((p) => achado.cantos.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < Math.max(largura, altura) * 0.03)))
    if (!parecido) escolhidos.push({ cantos: achado.cantos, ocupacao: achado.ocupacao, apoio: achado.apoio })
  }
  return escolhidos
}
