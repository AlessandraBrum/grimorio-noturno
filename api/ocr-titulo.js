const LIMITE_DO_RECORTE = 128 * 1024
const VISION = 'https://vision.googleapis.com/v1/images:annotate'

function json(dados, status = 200) {
  return Response.json(dados, { status, headers: { 'Cache-Control': 'no-store' } })
}

async function lerRecorte(request) {
  if (!request.body) return null
  const leitor = request.body.getReader()
  const partes = []
  let tamanho = 0

  for (;;) {
    const { done, value } = await leitor.read()
    if (done) break
    tamanho += value.byteLength
    if (tamanho > LIMITE_DO_RECORTE) {
      await leitor.cancel()
      return null
    }
    partes.push(value)
  }

  const imagem = Buffer.concat(partes, tamanho)
  if (imagem[0] !== 0xff || imagem[1] !== 0xd8 || imagem[2] !== 0xff) return null
  return imagem
}

export default {
  async fetch(request) {
    const chave = process.env.GOOGLE_CLOUD_VISION_API_KEY
    if (request.method === 'GET') return json({ disponivel: !!chave })
    if (request.method !== 'POST') return json({}, 405)
    if (!chave) return json({}, 503)

    const url = new URL(request.url)
    if (request.headers.get('origin') !== url.origin) return json({}, 403)
    const idioma = url.searchParams.get('idioma')
    if (!['pt', 'en'].includes(idioma) || request.headers.get('content-type') !== 'image/jpeg') {
      return json({}, 415)
    }

    try {
      const imagem = await lerRecorte(request)
      if (!imagem) return json({}, 400)
      const resposta = await fetch(VISION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
        signal: AbortSignal.timeout(1800),
        body: JSON.stringify({ requests: [{
          image: { content: imagem.toString('base64') },
          features: [{ type: 'TEXT_DETECTION' }],
          imageContext: { languageHints: [idioma] },
        }] }),
      })
      if (!resposta.ok) return json({}, 502)
      const dados = await resposta.json()
      const leitura = dados.responses?.[0]
      if (!leitura || leitura.error) return json({}, 502)
      const texto = leitura.textAnnotations?.[0]?.description ?? ''
      return json({ texto: texto.slice(0, 256) })
    } catch {
      return json({}, 502)
    }
  },
}
