const ENDERECO = 'https://api.scryfall.com/catalog/card-names'
const CHAVE = 'grimorio-noturno:catalogo-de-nomes'
const CANDIDATOS = 250
const SOBRA_NO_INICIO = 2
const SOBRA_NO_FIM = 3
const NOME_CURTO = 5

interface Catalogo {
  nomes: string[]
  chaves: string[]
  trigramas: Map<string, number[]>
}

export interface Achado {
  nome: string
  pontuacao: number
}

let catalogo: Promise<Catalogo> | null = null

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

export function chaveDoNome(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '')
}

function trigramasDe(chave: string) {
  const comBordas = `^${chave}$`
  const lista: string[] = []
  for (let i = 0; i + 3 <= comBordas.length; i++) lista.push(comBordas.slice(i, i + 3))
  return lista
}

function lerGuardado(): { dia: string; nomes: string[] } | null {
  try {
    const valor = localStorage.getItem(CHAVE)
    if (!valor) return null
    const dados = JSON.parse(valor)
    return Array.isArray(dados?.nomes) && typeof dados.dia === 'string' ? dados : null
  } catch {
    return null
  }
}

function guardar(nomes: string[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ dia: hoje(), nomes }))
  } catch {
    return
  }
}

async function baixarDoScryfall() {
  const resposta = await fetch(ENDERECO, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
  if (!resposta.ok) throw new Error('catálogo indisponível')
  const dados = await resposta.json()
  if (!Array.isArray(dados?.data) || dados.data.length === 0) throw new Error('catálogo inválido')
  return dados.data as string[]
}

async function baixarDaBaseLocal() {
  const resposta = await fetch(`${import.meta.env.BASE_URL}cartas/impressoes.json`)
  if (!resposta.ok) throw new Error('base indisponível')
  return ((await resposta.json()) as { nomes: string[] }).nomes
}

async function obterNomes() {
  const guardado = lerGuardado()
  if (guardado?.dia === hoje()) return guardado.nomes
  try {
    const nomes = await baixarDoScryfall()
    guardar(nomes)
    return nomes
  } catch {
    if (guardado) return guardado.nomes
    return baixarDaBaseLocal()
  }
}

function indexar(nomesCompletos: string[]): Catalogo {
  const nomes: string[] = []
  const chaves: string[] = []
  const trigramas = new Map<string, number[]>()
  const vistos = new Set<string>()
  for (const completo of nomesCompletos) {
    for (const face of completo.split(' // ')) {
      const chave = chaveDoNome(face)
      if (chave.length < 3 || vistos.has(chave)) continue
      vistos.add(chave)
      const indice = nomes.length
      nomes.push(face)
      chaves.push(chave)
      for (const trigrama of new Set(trigramasDe(chave))) {
        const lista = trigramas.get(trigrama)
        if (lista) lista.push(indice)
        else trigramas.set(trigrama, [indice])
      }
    }
  }
  return { nomes, chaves, trigramas }
}

export function carregarCatalogo() {
  catalogo ??= obterNomes().then(indexar)
  catalogo.catch(() => {
    catalogo = null
  })
  return catalogo
}

function custoDeAlinhar(nome: string, texto: string) {
  let anterior = new Float32Array(texto.length + 1)
  let atual = new Float32Array(texto.length + 1)
  for (let j = 0; j <= texto.length; j++) anterior[j] = Math.max(0, j - SOBRA_NO_INICIO)
  for (let i = 1; i <= nome.length; i++) {
    atual[0] = i
    for (let j = 1; j <= texto.length; j++) {
      const troca = anterior[j - 1] + (nome[i - 1] === texto[j - 1] ? 0 : 1)
      atual[j] = Math.min(troca, anterior[j] + 1, atual[j - 1] + 1)
    }
    ;[anterior, atual] = [atual, anterior]
  }
  let melhor = Infinity
  for (let j = 0; j <= texto.length; j++) {
    const custo = anterior[j] + Math.max(0, texto.length - j - SOBRA_NO_FIM) * 0.5
    if (custo < melhor) melhor = custo
  }
  return melhor
}

function pontuar(nome: string, texto: string) {
  const pontuacao = 1 - custoDeAlinhar(nome, texto) / nome.length
  if (nome.length <= NOME_CURTO && (pontuacao < 1 || texto.length > nome.length + 1)) return Math.min(pontuacao, 0.5)
  return pontuacao
}

export function procurarNoCatalogo(dados: Catalogo, lido: string): Achado[] {
  const texto = chaveDoNome(lido)
  if (texto.length < 3) return []
  const contagem = new Map<number, number>()
  for (const trigrama of new Set(trigramasDe(texto))) {
    for (const indice of dados.trigramas.get(trigrama) ?? []) {
      contagem.set(indice, (contagem.get(indice) ?? 0) + 1)
    }
  }
  const candidatos = [...contagem.entries()]
    .map(([indice, comuns]) => ({ indice, peso: comuns / (dados.chaves[indice].length + 2) }))
    .sort((a, b) => b.peso - a.peso)
    .slice(0, CANDIDATOS)
  const melhores = new Map<string, number>()
  for (const { indice } of candidatos) {
    const pontuacao = pontuar(dados.chaves[indice], texto)
    const nome = dados.nomes[indice]
    if (pontuacao > (melhores.get(nome) ?? -Infinity)) melhores.set(nome, pontuacao)
  }
  return [...melhores.entries()]
    .map(([nome, pontuacao]) => ({ nome, pontuacao }))
    .sort((a, b) => b.pontuacao - a.pontuacao || b.nome.length - a.nome.length)
    .slice(0, 3)
}
