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

export async function buscarCarta(nome: string, idioma: Idioma): Promise<Card> {
  const original = converter(
    await pedir<CartaScryfall>(`/cards/named?fuzzy=${encodeURIComponent(nome)}`),
  )
  if (idioma === 'en') return original

  try {
    const consulta = encodeURIComponent(`!"${original.name}" lang:pt`)
    const lista = await pedir<ListaScryfall<CartaScryfall>>(
      `/cards/search?q=${consulta}&unique=prints`,
    )
    const emPortugues = lista.data.find((carta) => carta.printed_text || carta.printed_name)
    if (!emPortugues) return original
    const traduzida = converter(emPortugues)
    return { ...traduzida, oracleText: original.oracleText, keywords: original.keywords }
  } catch {
    return original
  }
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

async function procurarTexto(texto: string): Promise<Achado> {
  const chave = normalizar(texto)
  const guardado = jaProcurados.get(chave)
  if (guardado) return guardado

  let achado: Achado = { nomes: [], certeza: false }
  try {
    const carta = await pedir<CartaScryfall>(`/cards/named?fuzzy=${encodeURIComponent(texto)}`)
    achado = { nomes: [carta.name], certeza: semelhanca(texto, carta.name) >= SEMELHANCA_SEGURA }
  } catch (erro) {
    if (erro instanceof SemConexao) throw erro
    try {
      const lista = await pedir<ListaScryfall<CartaScryfall>>(
        `/cards/search?q=${encodeURIComponent(texto)}&include_multilingual=true`,
      )
      const encontradas = lista.data.slice(0, 3)
      const primeira = encontradas[0]
      achado = {
        nomes: encontradas.map((carta) => carta.name),
        certeza:
          encontradas.length === 1 &&
          !!primeira &&
          semelhanca(texto, primeira.printed_name ?? primeira.name) >= SEMELHANCA_SEGURA,
      }
    } catch (erroBusca) {
      if (erroBusca instanceof SemConexao) throw erroBusca
    }
  }
  jaProcurados.set(chave, achado)
  return achado
}

export async function identificarCandidatos(textos: string[]): Promise<Identificacao> {
  const nomes: string[] = []
  const guardar = (nome: string) => {
    if (!nomes.includes(nome)) nomes.push(nome)
  }

  for (const texto of textos.slice(0, 4)) {
    const limpo = texto.trim()
    if (limpo.length < 3) continue
    const achado = await procurarTexto(limpo)
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
