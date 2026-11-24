
const LIMITE_ANEXO = 3_000_000

export async function prepararImagem(arquivo: File): Promise<File | undefined> {
  if (!arquivo.type.startsWith('image/') || !arquivo.size) return
  if (arquivo.size <= LIMITE_ANEXO) return arquivo

  try {
    const imagem = await createImageBitmap(arquivo)
    try {
      const quadro = document.createElement('canvas')
      const ctx = quadro.getContext('2d', { alpha: false })
      if (!ctx) return
      for (const larguraMaxima of [1920, 1280, 800]) {
        const escala = Math.min(1, larguraMaxima / Math.max(imagem.width, imagem.height))
        quadro.width = Math.max(1, Math.round(imagem.width * escala))
        quadro.height = Math.max(1, Math.round(imagem.height * escala))
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, quadro.width, quadro.height)
        ctx.drawImage(imagem, 0, 0, quadro.width, quadro.height)
        const blob = await new Promise<Blob | null>((resolve) => quadro.toBlob(resolve, 'image/jpeg', 0.84))
        if (blob && blob.size <= LIMITE_ANEXO) {
          const nome = arquivo.name.replace(/\.[^.]+$/, '') + '.jpg'
          return new File([blob], nome, { type: blob.type })
        }
      }
    } finally {
      imagem.close()
    }
  } catch {
    // Alguns formatos de foto só podem ser abertos pela galeria do aparelho.
  }
}
