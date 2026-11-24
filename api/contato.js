
const DESTINO = 'ambuxedev@gmail.com'
const ASSUNTOS = {
  sugestao: 'Sugestões de melhorias',
  erro: 'Reportar erro',
  agradecimento: 'Agradecimento',
  parcerias: 'Parcerias',
  outros: 'Outros',
}
const LIMITE_REQUISICAO = 3_100_000

function json(status, dados = {}) {
  return Response.json(dados, { status, headers: { 'Cache-Control': 'no-store' } })
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') return json(405)
    if (request.headers.get('origin') !== new URL(request.url).origin) return json(403)
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) return json(415)

    const tamanho = Number(request.headers.get('content-length'))
    if (!Number.isSafeInteger(tamanho) || tamanho <= 0 || tamanho > LIMITE_REQUISICAO) return json(413)
    const chave = process.env.RESEND_API_KEY?.trim()
    const remetente = process.env.CONTATO_EMAIL_REMETENTE?.trim()
    if (!chave || !remetente) return json(503)

    let dados
    try {
      dados = await request.formData()
    } catch {
      return json(400)
    }

    const assunto = dados.get('assunto')
    const canal = dados.get('canal')
    const resposta = dados.get('resposta')
    const mensagem = dados.get('mensagem')
    const imagem = dados.get('imagem')
    const origem = dados.get('origem')
    const id = dados.get('id')
    const parte = Number(dados.get('parte'))
    const total = Number(dados.get('total'))
    if (typeof assunto !== 'string' || !Object.hasOwn(ASSUNTOS, assunto) ||
      typeof resposta !== 'string' || resposta.length > 254 ||
      typeof origem !== 'string' || origem.length > 4000 ||
      typeof id !== 'string' || !/^[a-f\d-]{36}$/.test(id) ||
      !Number.isSafeInteger(parte) || !Number.isSafeInteger(total) || parte < 1 || parte > total) return json(400)
    if (canal === 'email') {
      if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(resposta)) return json(400)
    } else if (canal !== 'whatsapp' || !/^\+[1-9]\d{7,14}$/.test(resposta)) {
      return json(400)
    }
    if (imagem !== null) {
      if (mensagem !== null || !(imagem instanceof File) || !imagem.type.startsWith('image/') ||
        imagem.size === 0 || imagem.size > 3_000_000) return json(400)
    } else if (typeof mensagem !== 'string' || mensagem.length === 0 || mensagem.length > 100_000) {
      return json(400)
    }

    const referencia = id.slice(0, 8)
    const detalhes = [
      `Protocolo: ${id}`,
      `Parte: ${parte} de ${total}`,
      `Resposta por ${canal === 'email' ? 'e-mail' : 'WhatsApp'}: ${resposta}`,
      origem && `Origem: ${origem}`,
    ].filter(Boolean).join('\n')
    try {
      const resultado = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${chave}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `grimorio-noturno/${id}/${parte}`,
        },
        signal: AbortSignal.timeout(25_000),
        body: JSON.stringify({
          from: `Grimório Noturno <${remetente}>`,
          to: [DESTINO],
          reply_to: canal === 'email' ? resposta : undefined,
          subject: `[Grimório ${referencia}] ${ASSUNTOS[assunto]} (${parte}/${total})`,
          text: `${detalhes}\n\n${mensagem ?? 'Imagem em anexo.'}`,
          attachments: imagem ? [{
            // oxlint-disable-next-line no-control-regex
            filename: imagem.name.replace(/[\x00-\x1f\x7f/\\]/g, '_').slice(0, 240) || 'imagem',
            content: Buffer.from(await imagem.arrayBuffer()).toString('base64'),
          }] : undefined,
        }),
      })
      if (!resultado.ok) return json(502)
      return json(200, { enviado: true })
    } catch {
      return json(502)
    }
  },
}
