import type { Custo } from './barraDoNome'
import { chaveDoNome } from './catalogo'

export interface Sinais {
  tipos: string
  forca: string
}

export interface Ficha {
  tipos: string
  custo: string
  forca: string
}

export type Fichas = Map<string, Ficha>

const NOME_FORTE = 0.9

const PALAVRAS_DE_TIPO: [string, string][] = [
  ['creature', 'C'], ['criatura', 'C'], ['sorcery', 'S'], ['feitico', 'S'], ['instant', 'I'], ['instantanea', 'I'],
  ['artifact', 'A'], ['artefato', 'A'], ['enchantment', 'E'], ['encantamento', 'E'], ['land', 'L'], ['terreno', 'L'],
  ['planeswalker', 'P'], ['battle', 'B'], ['batalha', 'B'], ['kindred', 'K'], ['tribal', 'K'],
]

let fichas: Promise<Map<string, Ficha>> | null = null

export function carregarFichas() {
  fichas ??= fetch(`${import.meta.env.BASE_URL}cartas/cartas.json`)
    .then((resposta) => {
      if (!resposta.ok) throw new Error('fichas indisponíveis')
      return resposta.json() as Promise<{ faces: Record<string, string> }>
    })
    .then(({ faces }) => {
      const mapa = new Map<string, Ficha>()
      for (const [nome, resumo] of Object.entries(faces)) {
        const [tipos, custo, forca] = resumo.split('|')
        mapa.set(nome, { tipos, custo, forca })
      }
      return mapa
    })
  fichas.catch(() => {
    fichas = null
  })
  return fichas
}

function distancia(a: string, b: string) {
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const atual = [i]
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    anterior = atual
  }
  return anterior[b.length]
}

export function tiposLidos(texto: string) {
  const achados = new Set<string>()
  const palavras = texto.split(/[^\p{L}]+/u).map(chaveDoNome).filter((palavra) => palavra.length >= 4)
  for (const palavra of palavras) {
    for (const [tipo, letra] of PALAVRAS_DE_TIPO) {
      const tolerancia = tipo.length >= 9 ? 2 : tipo.length >= 6 ? 1 : 0
      if (distancia(palavra, tipo) <= tolerancia) achados.add(letra)
    }
  }
  return [...achados].join('')
}

function digitos(texto: string) {
  return texto.replace(/[^0-9*X]/g, '')
}

function forcaBate(lida: string, certa: string) {
  const [poder, resistencia] = certa.split('/')
  const lidos = digitos(lida)
  if (!lidos || !poder) return null
  const juntos = `${poder}${resistencia}`
  for (let i = 0; i <= lidos.length - juntos.length; i++) {
    if (lidos.slice(i, i + poder.length) !== poder) continue
    const resto = lidos.slice(i + poder.length)
    if (resto.startsWith(resistencia) || resto.slice(1).startsWith(resistencia)) return true
  }
  return false
}

export function custoConfere(nome: string, pontuacao: number, custo: Custo | null, fichas: Fichas | null) {
  const ficha = fichas?.get(nome)
  if (!custo || !ficha) return true
  if (custo.seguro) return custo.quantidade === ficha.custo.length
  return pontuacao >= NOME_FORTE
}

function tipoBate(sinais: Sinais, ficha: Ficha) {
  return !!ficha.tipos && [...sinais.tipos].every((letra) => ficha.tipos.includes(letra))
}

function filtrar(nomes: string[], mapa: Fichas, teste: (ficha: Ficha) => boolean | null) {
  const restantes = nomes.filter((nome) => {
    const ficha = mapa.get(nome)
    return !ficha || teste(ficha) !== false
  })
  return restantes.length ? restantes : nomes
}

export function desempatar(nomes: string[], sinais: Sinais, mapa: Fichas) {
  if (!sinais.tipos || nomes.length < 2) return null
  let restantes = filtrar(nomes, mapa, (ficha) => tipoBate(sinais, ficha))
  if (restantes.length > 1) {
    restantes = filtrar(restantes, mapa, (ficha) => (ficha.forca ? forcaBate(sinais.forca, ficha.forca) : sinais.forca && digitos(sinais.forca).length >= 2 ? false : null))
  }
  if (restantes.length !== 1 || restantes.length === nomes.length) return null
  const ficha = mapa.get(restantes[0])
  return ficha && tipoBate(sinais, ficha) ? restantes[0] : null
}
