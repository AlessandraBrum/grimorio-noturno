import type { Card, Idioma } from '../types/card'

const BASE = 'https://api.scryfall.com'
const INTERVALO_MINIMO_MS = 100
const LIMITE_DE_CONSULTA_MS = 3500

let ultimaRequisicao = 0

export class CartaNaoEncontrada extends Error {}
export class SemConexao extends Error {}
export class ServicoDeCartasIndisponivel extends Error {
  readonly status?: number

  constructor(status?: number) {
    super()
    this.status = status
  }
}

async function esperarVez() {
  const agora = Date.now()
  const espera = ultimaRequisicao + INTERVALO_MINIMO_MS - agora
  ultimaRequisicao = Math.max(agora, ultimaRequisicao + INTERVALO_MINIMO_MS)
  if (espera > 0) {
    await new Promise((resolve) => setTimeout(resolve, espera))
  }
}

async function consultar(caminho: string, sinal?: AbortSignal) {
  const controle = new AbortController()
  const abortar = () => controle.abort()
  const limite = setTimeout(abortar, LIMITE_DE_CONSULTA_MS)
  sinal?.addEventListener('abort', abortar, { once: true })
  try {
    if (sinal?.aborted) abortar()
    return await fetch(BASE + caminho, {
      headers: { Accept: 'application/json' },
      signal: controle.signal,
    })
  } finally {
    clearTimeout(limite)
    sinal?.removeEventListener('abort', abortar)
  }
}

async function pedir<T>(caminho: string, sinal?: AbortSignal): Promise<T> {
  await esperarVez()
  let resposta: Response
  try {
    resposta = await consultar(caminho, sinal)
  } catch {
    sinal?.throwIfAborted()
    if (!navigator.onLine) throw new SemConexao()
    try {
      await esperarVez()
      sinal?.throwIfAborted()
      resposta = await consultar(caminho, sinal)
    } catch {
      sinal?.throwIfAborted()
      if (!navigator.onLine) throw new SemConexao()
      throw new ServicoDeCartasIndisponivel()
    }
  }
  if (!resposta.headers.get('content-type')?.includes('application/json')) throw new ServicoDeCartasIndisponivel(resposta.status)
  if (resposta.status === 404) throw new CartaNaoEncontrada()
  if (!resposta.ok) throw new ServicoDeCartasIndisponivel(resposta.status)
  return resposta.json() as Promise<T>
}

interface CartaScryfall {
  id: string
  name: string
  lang: string
  printed_name?: string
  type_line?: string
  printed_type_line?: string
  mana_cost?: string
  oracle_text?: string
  printed_text?: string
  keywords?: string[]
  power?: string
  toughness?: string
  artist?: string
  set_name: string
  rarity: string
  image_uris?: { normal: string }
  card_faces?: Array<{
    name: string
    type_line?: string
    mana_cost?: string
    oracle_text?: string
    printed_name?: string
    printed_type_line?: string
    printed_text?: string
    power?: string
    toughness?: string
    image_uris?: { normal: string }
  }>
}

interface ListaScryfall<T> {
  data: T[]
}

function converter(dados: CartaScryfall): Card {
  const face = dados.card_faces?.[0]
  return {
    id: dados.id,
    name: dados.name,
    lang: dados.lang === 'pt' ? 'pt' : 'en',
    printedName: dados.printed_name ?? face?.printed_name,
    typeLine: dados.type_line ?? face?.type_line ?? '',
    printedTypeLine: dados.printed_type_line ?? face?.printed_type_line,
    manaCost: dados.mana_cost ?? face?.mana_cost ?? '',
    oracleText: dados.oracle_text ?? face?.oracle_text ?? '',
    printedText: dados.printed_text ?? face?.printed_text,
    keywords: dados.keywords ?? [],
    power: dados.power ?? face?.power,
    toughness: dados.toughness ?? face?.toughness,
    artist: dados.artist ?? '',
    setName: dados.set_name,
    rarity: dados.rarity,
    imageUrl: dados.image_uris?.normal ?? face?.image_uris?.normal,
  }
}

export async function sugerirNomes(texto: string, sinal?: AbortSignal): Promise<string[]> {
  if (texto.trim().length < 2) return []
  const resultado = await pedir<ListaScryfall<string>>(
    `/cards/autocomplete?q=${encodeURIComponent(texto)}`,
    sinal,
  )
  return resultado.data.slice(0, 8)
}

const cartasPorIdioma = new Map<string, Card>()
const cartasIdentificadas = new Map<string, CartaScryfall>()

export async function buscarCarta(nome: string, idioma: Idioma): Promise<Card> {
  const chave = idioma + ':' + nome.trim().toLowerCase()
  const guardada = cartasPorIdioma.get(chave)
  if (guardada) return guardada
  const dados = cartasIdentificadas.get(chave)
    ?? (idioma === 'pt' ? await buscarNomeExato(nome, idioma) : undefined)
    ?? await pedir<CartaScryfall>('/cards/named?exact=' + encodeURIComponent(nome.trim()))
  const original = converter(dados)
  if (dados.lang === idioma && (idioma === 'en' || temTextoEmPortugues(original))) {
    cartasPorIdioma.set(chave, original)
    return original
  }
  const emIngles: Card = {
    ...original,
    lang: 'en',
    printedName: undefined,
    printedTypeLine: undefined,
    printedText: undefined,
  }

  try {
    const dadosLocalizados = await buscarNomeExato(original.name, idioma)
    const localizada = dadosLocalizados ? converter(dadosLocalizados) : undefined
    const resultado = localizada ?? emIngles
    cartasPorIdioma.set(chave, resultado)
    return resultado
  } catch {
    return emIngles
  }
}

async function buscarNomeExato(nome: string, idioma: Idioma): Promise<CartaScryfall | undefined> {
  const seguro = nome.replace(/["\\]/g, '').trim()
  if (!seguro) return undefined
  const consulta = '!"' + seguro + '" lang:' + idioma
  try {
    const lista = await pedir<ListaScryfall<CartaScryfall>>(
      '/cards/search?q=' + encodeURIComponent(consulta) + '&unique=prints',
    )
    return lista.data.find((carta) => carta.lang === idioma
      && (idioma === 'en' || temTextoEmPortugues(converter(carta))))
  } catch (erro) {
    if (!(erro instanceof CartaNaoEncontrada)) throw erro
    return undefined
  }
}

function temTextoEmPortugues(carta: Card) {
  return !!carta.printedName && !!carta.printedTypeLine && (!carta.oracleText || !!carta.printedText)
}

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function semelhanca(a: string, b: string) {
  const x = normalizar(a)
  const y = normalizar(b)
  if (!x || !y) return 0
  let anterior = Array.from({ length: y.length + 1 }, (_, indice) => indice)
  for (let i = 1; i <= x.length; i++) {
    const atual = [i]
    for (let j = 1; j <= y.length; j++) {
      atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1))
    }
    anterior = atual
  }
  return 1 - anterior[y.length] / Math.max(x.length, y.length)
}

const SEMELHANCA_SEGURA = 0.6
const SEMELHANCA_PARA_CONFIRMAR = 0.66

export interface Identificacao {
  nomes: string[]
  certeza: boolean
}

interface Achado {
  nomes: string[]
  pontuacao: number
  tipos: string[]
  ambigua?: boolean
}

const jaProcurados = new Map<string, Achado>()

async function buscarPorTexto(texto: string, idioma: Idioma) {
  const palavras = texto.replace(/[^\p{L}\p{N} -]/gu, ' ').trim()
  if (!palavras) return []
  const consulta = 'lang:' + idioma + ' ' + palavras
  const lista = await pedir<ListaScryfall<CartaScryfall>>('/cards/search?q=' + encodeURIComponent(consulta))
  return lista.data.filter((carta) => carta.lang === idioma)
}

function avaliarNome(texto: string, carta: CartaScryfall, idioma: Idioma) {
  const local = idioma === carta.lang
  const faces = carta.card_faces ?? []
  const nomes = [carta.name, ...faces.map((face) => face.name)]
  if (local) {
    nomes.push(carta.printed_name ?? '', ...faces.map((face) => face.printed_name ?? ''))
  }
  return Math.max(...nomes.map((nome) => semelhanca(texto, nome)))
}

function tiposDaCarta(carta: CartaScryfall, idioma: Idioma) {
  return [carta, ...(carta.card_faces ?? [])]
    .flatMap((face) => [face.type_line, idioma === carta.lang ? face.printed_type_line : undefined])
    .filter((tipo): tipo is string => !!tipo)
}

async function procurarTexto(texto: string, idioma: Idioma, origem: 'voz' | 'camera'): Promise<Achado> {
  const chave = origem + ':' + idioma + ':' + normalizar(texto)
  const guardado = jaProcurados.get(chave)
  if (guardado) return guardado

  let achado: Achado = { nomes: [], pontuacao: 0, tipos: [] }
  try {
    const carta = (idioma === 'pt' ? await buscarNomeExato(texto, idioma) : undefined)
      ?? await pedir<CartaScryfall>(`/cards/named?fuzzy=${encodeURIComponent(texto)}`)
    cartasIdentificadas.set(idioma + ':' + carta.name.toLowerCase(), carta)
    achado = { nomes: [carta.name], pontuacao: avaliarNome(texto, carta, idioma), tipos: tiposDaCarta(carta, idioma) }
  } catch (erro) {
    if (!(erro instanceof CartaNaoEncontrada)) throw erro
  }

  if (!achado.nomes.length || (origem === 'camera' && achado.pontuacao < SEMELHANCA_PARA_CONFIRMAR)) {
    try {
      const encontradas = (await buscarPorTexto(texto, idioma))
        .map((carta) => ({ carta, pontuacao: avaliarNome(texto, carta, idioma) }))
        .sort((a, b) => b.pontuacao - a.pontuacao)
        .slice(0, 3)
      for (const { carta } of encontradas) {
        cartasIdentificadas.set(idioma + ':' + carta.name.toLowerCase(), carta)
      }
      const primeira = encontradas[0]
      if (primeira && primeira.pontuacao >= achado.pontuacao) {
        achado = {
          nomes: encontradas.map(({ carta }) => carta.name),
          pontuacao: primeira.pontuacao,
          tipos: tiposDaCarta(primeira.carta, idioma),
          ambigua: encontradas.some(({ carta, pontuacao }) => carta.name !== primeira.carta.name && primeira.pontuacao - pontuacao < 0.08),
        }
      }
    } catch (erro) {
      if (!(erro instanceof CartaNaoEncontrada)) throw erro
    }
  }
  jaProcurados.set(chave, achado)
  return achado
}

const PALAVRAS_DE_TIPO = [
  'creature', 'criatura', 'instant', 'instantanea', 'sorcery', 'feitico', 'enchantment', 'encantamento',
  'artifact', 'artefato', 'land', 'terreno', 'planeswalker', 'battle', 'batalha', 'kindred', 'tribal',
]

function palavrasDeTipo(texto: string) {
  const palavras = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z]+/)
  return PALAVRAS_DE_TIPO.filter((tipo) => palavras.includes(tipo))
}

function tipoContradiz(linhasSeguintes: string[], tiposDaCarta: string[]) {
  if (!tiposDaCarta.length) return false
  const daCarta = new Set(tiposDaCarta.flatMap(palavrasDeTipo))
  const linhasDeTipo = linhasSeguintes.map(palavrasDeTipo).filter((tipos) => tipos.length > 0)
  return linhasDeTipo.length > 0 && linhasDeTipo.every((tipos) => !tipos.some((tipo) => daCarta.has(tipo)))
}

export async function identificarCandidatos(textos: string[], idioma: Idioma, origem: 'voz' | 'camera' = 'voz'): Promise<Identificacao> {
  const nomes: string[] = []
  const guardar = (nome: string) => {
    if (!nomes.includes(nome)) nomes.push(nome)
  }

  for (const [indice, texto] of textos.slice(0, 4).entries()) {
    const limpo = texto.trim()
    if (limpo.length < 3) continue
    const achado = await procurarTexto(limpo, idioma, origem)
    const contradiz = origem === 'camera' && tipoContradiz(textos.slice(indice + 1), achado.tipos)
    if (achado.pontuacao >= SEMELHANCA_SEGURA && !achado.ambigua && !contradiz) {
      return { nomes: achado.nomes.slice(0, 1), certeza: true }
    }
    achado.nomes.forEach(guardar)
  }

  if (origem === 'voz' && nomes.length > 0 && nomes.length < 3) {
    try {
      ;(await sugerirNomes(nomes[0].split(' ')[0])).forEach((nome) => {
        if (nomes.length < 3) guardar(nome)
      })
    } catch {
      return { nomes, certeza: false }
    }
  }
  return { nomes: nomes.slice(0, 3), certeza: false }
}
