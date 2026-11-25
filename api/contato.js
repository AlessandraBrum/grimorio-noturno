const SITE = 'Grimório Noturno'
const REMETENTE = 'envio@lunasoftwares.com'
const DESTINO = 'ambuxedev@gmail.com'
const ASSUNTOS = {
  sugestao: 'Sugestões de melhorias',
  erro: 'Reportar erro',
  agradecimento: 'Agradecimento',
  parcerias: 'Parcerias',
  outros: 'Outros',
}
const LIMITE_REQUISICAO = 3_100_000
const JANELA_MS = 10 * 60 * 1000
const ENVIOS_POR_JANELA = 60
const envios = new Map()

function passouDoLimite(ip) {
  const agora = Date.now()
  for (const [chave, momentos] of envios) {
    if (momentos.every((momento) => agora - momento >= JANELA_MS)) envios.delete(chave)
  }
  const recentes = (envios.get(ip) ?? []).filter((momento) => agora - momento < JANELA_MS)
  recentes.push(agora)
  envios.set(ip, recentes)
  return recentes.length > ENVIOS_POR_JANELA
}

function nomeSeguro(nome) {
  return Array.from(nome, (letra) => {
    const codigo = letra.charCodeAt(0)
    return codigo < 32 || codigo === 127 || letra === '/' || letra === '\\' ? '_' : letra
  }).join('').slice(0, 240)
}

const EXTENSOES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg',
}

function nomeDoAnexo(imagem, nome) {
  const extensao = EXTENSOES[imagem.type] ?? 'png'
  const base = nome || 'imagem'
  return /\.[a-z\d]{2,5}$/i.test(base) ? base : `${base}.${extensao}`
}

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
    if (!chave?.startsWith('re_')) {
      console.error('RESEND_API_KEY ausente ou sem o prefixo re_')
      return json(503)
    }

    const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'desconhecido'
    if (passouDoLimite(ip)) return json(429)

    let dados
    try {
      dados = await request.formData()
    } catch {
      return json(400)
    }

    const armadilha = dados.get('site')
    if (typeof armadilha === 'string' && armadilha.trim()) return json(200, { enviado: true })

    const nome = dados.get('nome')
    if (nome !== null && (typeof nome !== 'string' || !nome.trim() || nome.length > 120)) return json(400)

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

    const nomeLimpo = nome?.trim()
    const detalhes = [
      nomeLimpo && `Nome: ${nomeLimpo}`,
      `Assunto: ${ASSUNTOS[assunto]}`,
      `Resposta por ${canal === 'email' ? 'e-mail' : 'WhatsApp'}: ${resposta}`,
      `Protocolo: ${id}`,
      `Parte: ${parte} de ${total}`,
      origem && `Origem: ${origem}`,
    ].filter(Boolean).join('\n')

    const corpo = {
      from: `${SITE} <${REMETENTE}>`,
      to: [DESTINO],
      subject: `[${SITE} ${id.slice(0, 8)}] ${ASSUNTOS[assunto]}${nomeLimpo ? ` de ${nomeLimpo}` : ''} (${parte}/${total})`,
      text: `${detalhes}\n\n${mensagem ?? 'Imagem em anexo.'}`,
    }
    if (canal === 'email') corpo.reply_to = resposta
    if (imagem) {
      corpo.attachments = [{
        filename: nomeDoAnexo(imagem, nomeSeguro(imagem.name)),
        content: Buffer.from(await imagem.arrayBuffer()).toString('base64'),
      }]
    }

    try {
      const resultado = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${chave}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `contato/${id}/${parte}`,
        },
        signal: AbortSignal.timeout(25_000),
        body: JSON.stringify(corpo),
      })
      if (!resultado.ok) {
        console.error('Resend recusou o envio', resultado.status, await resultado.text())
        return json(502)
      }
      return json(200, { enviado: true })
    } catch (erro) {
      console.error('Falha ao falar com o Resend', erro)
      return json(502)
    }
  },
}
