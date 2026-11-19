export const PALAVRAS_POR_IMPRESSAO: number
export const ARTE: { esquerda: number; topo: number; largura: number; altura: number }
export function tonsDeCinza(rgba: Uint8ClampedArray, largura: number, altura: number): Float32Array
export function imagemIntegral(cinza: Float32Array, largura: number, altura: number): Float64Array
export function calcularImpressao(
  soma: Float64Array,
  largura: number,
  x: number,
  y: number,
  larguraDoRecorte: number,
  alturaDoRecorte: number,
  destino?: Uint32Array,
  posicao?: number,
): Uint32Array
export function distancia(a: Uint32Array, posicaoA: number, b: Uint32Array, posicaoB: number): number
