export const PALAVRAS_POR_IMPRESSAO = 4

export const ARTE = { esquerda: 0.081, topo: 0.112, largura: 0.838, altura: 0.442 }

export function tonsDeCinza(rgba, largura, altura) {
  const cinza = new Float32Array(largura * altura)
  for (let i = 0; i < cinza.length; i++) {
    cinza[i] = rgba[i * 4] * 0.299 + rgba[i * 4 + 1] * 0.587 + rgba[i * 4 + 2] * 0.114
  }
  return cinza
}

export function imagemIntegral(cinza, largura, altura) {
  const linha = largura + 1
  const soma = new Float64Array(linha * (altura + 1))
  for (let y = 0; y < altura; y++) {
    let acumulado = 0
    for (let x = 0; x < largura; x++) {
      acumulado += cinza[y * largura + x]
      soma[(y + 1) * linha + x + 1] = soma[y * linha + x + 1] + acumulado
    }
  }
  return soma
}

function media(soma, linha, x0, y0, x1, y1) {
  const area = (x1 - x0) * (y1 - y0)
  if (area <= 0) return 0
  return (soma[y1 * linha + x1] - soma[y0 * linha + x1] - soma[y1 * linha + x0] + soma[y0 * linha + x0]) / area
}

export function calcularImpressao(soma, largura, x, y, larguraDoRecorte, alturaDoRecorte, destino = new Uint32Array(PALAVRAS_POR_IMPRESSAO), posicao = 0) {
  const linha = largura + 1
  const grade = new Float64Array(81)
  for (let r = 0; r < 9; r++) {
    const y0 = Math.round(y + (alturaDoRecorte * r) / 9)
    const y1 = Math.max(y0 + 1, Math.round(y + (alturaDoRecorte * (r + 1)) / 9))
    for (let c = 0; c < 9; c++) {
      const x0 = Math.round(x + (larguraDoRecorte * c) / 9)
      const x1 = Math.max(x0 + 1, Math.round(x + (larguraDoRecorte * (c + 1)) / 9))
      grade[r * 9 + c] = media(soma, linha, x0, y0, x1, y1)
    }
  }
  for (let i = 0; i < PALAVRAS_POR_IMPRESSAO; i++) destino[posicao + i] = 0
  let bit = 0
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (grade[r * 9 + c] > grade[r * 9 + c + 1]) destino[posicao + (bit >> 5)] |= 1 << (bit & 31)
      bit++
    }
  }
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (grade[r * 9 + c] > grade[(r + 1) * 9 + c]) destino[posicao + (bit >> 5)] |= 1 << (bit & 31)
      bit++
    }
  }
  return destino
}

function contarBits(valor) {
  valor -= (valor >>> 1) & 0x55555555
  valor = (valor & 0x33333333) + ((valor >>> 2) & 0x33333333)
  return (((valor + (valor >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
}

export function distancia(a, posicaoA, b, posicaoB) {
  return (
    contarBits(a[posicaoA] ^ b[posicaoB]) +
    contarBits(a[posicaoA + 1] ^ b[posicaoB + 1]) +
    contarBits(a[posicaoA + 2] ^ b[posicaoB + 2]) +
    contarBits(a[posicaoA + 3] ^ b[posicaoB + 3])
  )
}
