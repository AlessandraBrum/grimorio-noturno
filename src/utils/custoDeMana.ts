import type { Idioma } from '../types/card'

type Cor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C'

const NOMES_CORES: Record<Idioma, Record<Cor, [string, string]>> = {
  pt: {
    W: ['branco', 'brancos'],
    U: ['azul', 'azuis'],
    B: ['preto', 'pretos'],
    R: ['vermelho', 'vermelhos'],
    G: ['verde', 'verdes'],
    C: ['incolor', 'incolores'],
  },
  en: {
    W: ['white', 'white'],
    U: ['blue', 'blue'],
    B: ['black', 'black'],
    R: ['red', 'red'],
    G: ['green', 'green'],
    C: ['colorless', 'colorless'],
  },
}

const PALAVRAS = {
  pt: { generico: ['genérico', 'genéricos'], e: 'e', ou: 'ou', semCusto: 'Sem custo de mana', zero: '0 (não custa mana)', xVariavel: 'X (você escolhe o valor)', total: 'no total', hibrido: ['híbrido', 'híbridos'], phyrexiano: 'pago com cor ou 2 de vida cada' },
  en: { generico: ['generic', 'generic'], e: 'and', ou: 'or', semCusto: 'No mana cost', zero: '0 (costs no mana)', xVariavel: 'X (you choose the value)', total: 'total', hibrido: ['hybrid', 'hybrid'], phyrexiano: 'paid with color or 2 life each' },
} as const

function ehCor(simbolo: string): simbolo is Cor {
  return ['W', 'U', 'B', 'R', 'G', 'C'].includes(simbolo)
}

function juntar(partes: string[], idioma: Idioma): string {
  if (partes.length <= 1) return partes.join('')
  return `${partes.slice(0, -1).join(', ')} ${PALAVRAS[idioma].e} ${partes[partes.length - 1]}`
}

export function custoEmPalavras(custo: string, idioma: Idioma): string {
  const simbolos = custo.match(/\{[^}]+\}/g)?.map((s) => s.slice(1, -1)) ?? []
  const p = PALAVRAS[idioma]
  if (simbolos.length === 0) return p.semCusto

  let genericos = 0
  let total = 0
  let temX = false
  const cores = new Map<Cor, number>()
  const especiais = new Map<string, number>()

  for (const simbolo of simbolos) {
    if (/^\d+$/.test(simbolo)) {
      genericos += Number(simbolo)
      total += Number(simbolo)
    } else if (simbolo === 'X') {
      temX = true
    } else if (ehCor(simbolo)) {
      cores.set(simbolo, (cores.get(simbolo) ?? 0) + 1)
      total += 1
    } else {
      especiais.set(simbolo, (especiais.get(simbolo) ?? 0) + 1)
      total += 1
    }
  }

  const partes: string[] = []
  if (temX) partes.push(p.xVariavel)
  if (genericos > 0) partes.push(`${genericos} ${p.generico[genericos === 1 ? 0 : 1]}`)
  for (const [cor, quantidade] of cores) {
    partes.push(`${quantidade} ${NOMES_CORES[idioma][cor][quantidade === 1 ? 0 : 1]}`)
  }
  for (const [simbolo, quantidade] of especiais) {
    const [a, b] = simbolo.split('/')
    const nomeA = ehCor(a) ? NOMES_CORES[idioma][a][quantidade === 1 ? 0 : 1] : a
    if (b === 'P') {
      partes.push(`${quantidade} ${nomeA} ${p.phyrexiano}`)
    } else if (b) {
      const corA = ehCor(a) ? NOMES_CORES[idioma][a][0] : a
      const corB = ehCor(b) ? NOMES_CORES[idioma][b][0] : b
      partes.push(`${quantidade} ${p.hibrido[quantidade === 1 ? 0 : 1]} ${corA} ${p.ou} ${corB}`)
    } else {
      partes.push(`${quantidade} ${simbolo}`)
    }
  }
  if (partes.length === 0) return p.zero

  const frase = juntar(partes, idioma)
  return partes.length > 1 && !temX ? `${frase} (${total} ${p.total})` : frase
}
