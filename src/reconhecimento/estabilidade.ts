const LARGURA = 48
const ALTURA = 36
const DIFERENCA_PARADA = 7
const CONTRASTE_MINIMO = 18

export class DetectorDeEstabilidade {
  private anterior: Float32Array | null = null
  private paradaDesde = 0
  private readonly tela = document.createElement('canvas')
  private readonly contexto: CanvasRenderingContext2D | null
  private readonly tempoParado: number
  brilho = 255

  constructor(tempoParado: number) {
    this.tempoParado = tempoParado
    this.tela.width = LARGURA
    this.tela.height = ALTURA
    this.contexto = this.tela.getContext('2d', { willReadFrequently: true })
  }

  reiniciar() {
    this.anterior = null
    this.paradaDesde = 0
  }

  observar(origem: CanvasImageSource, agora: number) {
    if (!this.contexto) return false
    this.contexto.drawImage(origem, 0, 0, LARGURA, ALTURA)
    const rgba = this.contexto.getImageData(0, 0, LARGURA, ALTURA).data
    const atual = new Float32Array(LARGURA * ALTURA)
    let soma = 0
    for (let i = 0; i < atual.length; i++) {
      atual[i] = rgba[i * 4] * 0.299 + rgba[i * 4 + 1] * 0.587 + rgba[i * 4 + 2] * 0.114
      soma += atual[i]
    }
    const media = soma / atual.length
    this.brilho = media
    let variancia = 0
    for (let i = 0; i < atual.length; i++) variancia += (atual[i] - media) ** 2
    const temConteudo = Math.sqrt(variancia / atual.length) >= CONTRASTE_MINIMO
    let diferenca = Infinity
    if (this.anterior) {
      let total = 0
      for (let i = 0; i < atual.length; i++) total += Math.abs(atual[i] - this.anterior[i])
      diferenca = total / atual.length
    }
    this.anterior = atual
    if (!temConteudo || diferenca > DIFERENCA_PARADA) {
      this.paradaDesde = 0
      return false
    }
    if (!this.paradaDesde) this.paradaDesde = agora
    return agora - this.paradaDesde >= this.tempoParado
  }
}
