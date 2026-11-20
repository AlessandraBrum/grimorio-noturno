import { carregarBase, reconhecerQuadro } from './reconhecer'

interface Pedido {
  id: number
  rgba?: Uint8ClampedArray
  largura?: number
  altura?: number
}

self.onmessage = async ({ data }: MessageEvent<Pedido>) => {
  try {
    if (!data.rgba) {
      await carregarBase()
      self.postMessage({ id: data.id, resultado: null })
      return
    }
    const resultado = await reconhecerQuadro(data.rgba, data.largura!, data.altura!)
    self.postMessage({ id: data.id, resultado })
  } catch {
    self.postMessage({ id: data.id, resultado: null, falhou: true })
  }
}
