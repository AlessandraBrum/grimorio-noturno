import type { Card, Idioma } from '../types/card'

const BASE = 'https://api.scryfall.com'
const INTERVALO_MINIMO_MS = 100

let ultimaRequisicao = 0

export class CartaNaoEncontrada extends Error {}
export class SemConexao extends Error {}

async function esperarVez() {
  const agora = Date.now()
  const espera = ultimaRequisicao + INTERVALO_MINIMO_MS - agora
  ultimaRequisicao = Math.max(agora, ultimaRequisicao + INTERVALO_MINIMO_MS)
  if (espera > 0) {
    await new Promise((resolve) => setTimeout(resolve, espera))
  }
}

async function pedir<T>(caminho: string, sinal?: AbortSignal): Promise<T> {
  await esperarVez()
  let resposta: Response
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      headers: { Accept: 'application/json' },
      signal: sinal,
    })
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === 'AbortError') throw erro
    throw new SemConexao()
  }
  if (resposta.status === 404) throw new CartaNaoEncontrada()
  if (!resposta.ok) throw new Error(`Scryfall respondeu ${resposta.status}`)
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

export interface Identificacao {
  nomes: string[]
  certeza: boolean
}

interface Achado {
  nomes: string[]
  certeza: boolean
}

const jaProcurados = new Map<string, Achado>()

async function buscarPorTexto(texto: string, idioma: Idioma) {
  const palavras = texto.replace(/[^\p{L}\p{N} -]/gu, ' ').trim()
  if (!palavras) return []
  const consulta = 'lang:' + idioma + ' ' + palavras
  const lista = await pedir<ListaScryfall<CartaScryfall>>('/cards/search?q=' + encodeURIComponent(consulta))
  return lista.data.filter((carta) => carta.lang === idioma)
}

async function procurarTexto(texto: string, idioma: Idioma): Promise<Achado> {
  const chave = idioma + ':' + normalizar(texto)
  const guardado = jaProcurados.get(chave)
  if (guardado) return guardado

  let achado: Achado = { nomes: [], certeza: false }
  try {
    const carta = (idioma === 'pt' ? await buscarNomeExato(texto, idioma) : undefined)
      ?? await pedir<CartaScryfall>(`/cards/named?fuzzy=${encodeURIComponent(texto)}`)
    const impresso = idioma === carta.lang ? carta.printed_name ?? carta.card_faces?.[0]?.printed_name : undefined
    cartasIdentificadas.set(idioma + ':' + carta.name.toLowerCase(), carta)
    const pontuacao = Math.max(semelhanca(texto, carta.name), semelhanca(texto, impresso ?? ''))
    achado = { nomes: [carta.name], certeza: pontuacao >= SEMELHANCA_SEGURA }
  } catch (erro) {
    if (!(erro instanceof CartaNaoEncontrada)) throw erro
    try {
      const encontradas = (await buscarPorTexto(texto, idioma)).slice(0, 3)
      for (const carta of encontradas) {
        cartasIdentificadas.set(idioma + ':' + carta.name.toLowerCase(), carta)
      }
      const primeira = encontradas[0]
      achado = {
        nomes: encontradas.map((carta) => carta.name),
        certeza:
          encontradas.length === 1 &&
          !!primeira &&
          semelhanca(texto, primeira.printed_name ?? primeira.name) >= SEMELHANCA_SEGURA,
      }
    } catch (erroBusca) {
      if (!(erroBusca instanceof CartaNaoEncontrada)) throw erroBusca
    }
  }
  jaProcurados.set(chave, achado)
  return achado
}

export async function identificarCandidatos(textos: string[], idioma: Idioma): Promise<Identificacao> {
  const nomes: string[] = []
  const guardar = (nome: string) => {
    if (!nomes.includes(nome)) nomes.push(nome)
  }

  for (const texto of textos.slice(0, 4)) {
    const limpo = texto.trim()
    if (limpo.length < 3) continue
    const achado = await procurarTexto(limpo, idioma)
    if (achado.certeza) return { nomes: achado.nomes.slice(0, 1), certeza: true }
    achado.nomes.forEach(guardar)
  }

  if (nomes.length > 0 && nomes.length < 3) {
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
