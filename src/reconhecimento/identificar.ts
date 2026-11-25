import { lerLinha } from '../api/ocr'
import { identificarCandidatos } from '../api/scryfall'
import type { Idioma } from '../types/card'
import { carregarCatalogo, chaveDoNome, procurarNoCatalogo, type Achado } from './catalogo'
import { lerCusto, lerQuadro, orientacoes, recortarNome, type Custo, type Quadro } from './barraDoNome'
import { encontrarContornos, type Ponto } from './contorno'
import { carregarFichas, custoConfere, desempatar, tiposLidos, type Fichas, type Sinais } from './desempate'
import { encontrarFaixas, endireitar, type Faixa } from './faixas'

const ALTURA_DO_TEXTO = 76
const LARGURA_MAXIMA = 1400
const NOME_CERTO = 0.84
const FOLGA_ENTRE_NOMES = 0.1
const FOLGA_COM_NOME_EXATO = 0.06
const NOME_POSSIVEL = 0.6
const NOME_PROVAVEL = 0.68
const FOLGA_PROVAVEL = 0.05
const ORCAMENTO_MS = 1600
const CONTORNOS_TESTADOS = 2
const NOME_CURTO = 6
const NOME_EXATO = 0.95
const CONFIANCA_SOZINHA = 45
const MODOS_DE_RECORTE = ['tinta', 'cinza'] as const
const PROPORCAO_MAXIMA_DO_NOME = 24
const CONFIANCA_PARA_BUSCAR_ONLINE = 70
const CONFIANCA_MINIMA = 25
const CARTA_PEQUENA = 0.12
const CARTA_TORTA_GRAUS = 8
const SO_TIPO = /^\W*((legendary|basic|snow|artifact|creature|enchantment|instant|sorcery|land|planeswalker|battle|kindred|tribal|criatura|artefato|encantamento|magica|feitico|terreno|lendari[oa])\s*)+\W*$/i
const LINHA_DE_DIREITOS = /wizards\s*of\s*the\s*c|©|\billus\b/i
const LINHA_DE_TIPO = /^\W*(\w{1,3}\s+)?(legendary\s+|basic\s+|snow\s+|token\s+|world\s+)*(creature|artifact|enchantment|instant|sorcery|land|planeswalker|battle|kindred|tribal|criatura|artefato|encantamento|magica|feitico|terreno|lendari[oa])\b.*[-—]/i
const NOMES_QUE_SAO_PALAVRAS_DE_REGRA = new Set([
  'lifelink', 'vigilance', 'flash', 'fear', 'regenerate', 'explore', 'persist', 'delirium', 'overload',
  'dredge', 'recover', 'flashback', 'bargain', 'mobilize', 'harmonize', 'firebending',
])

export type Dica = 'aproxime' | 'endireite' | null

export interface Diagnostico {
  dica: Dica
  provaveis?: string[]
}

export interface CartaIdentificada {
  nome: string
  porDesempate: boolean
}

interface Opcoes {
  diagnostico?: Diagnostico
  rapido?: boolean
  anteriores?: string[]
}

function recortar(origem: CanvasImageSource, faixa: Faixa, giro: number) {
  const espessura = faixa.vertical ? faixa.largura : faixa.altura
  const margemNaLinha = espessura * 0.5
  const margemAoLado = espessura * 0.25
  const mx = faixa.vertical ? margemAoLado : margemNaLinha
  const my = faixa.vertical ? margemNaLinha : margemAoLado
  const x = faixa.x - mx
  const y = faixa.y - my
  const largura = faixa.largura + mx * 2
  const altura = faixa.altura + my * 2
  const escala = Math.min(ALTURA_DO_TEXTO / espessura, LARGURA_MAXIMA / Math.max(largura, altura))
  const w = Math.round(largura * escala)
  const h = Math.round(altura * escala)
  const deitado = giro % 180 !== 0
  const tela = document.createElement('canvas')
  tela.width = deitado ? h : w
  tela.height = deitado ? w : h
  const contexto = tela.getContext('2d')
  if (!contexto) return tela
  contexto.fillStyle = '#fff'
  contexto.fillRect(0, 0, tela.width, tela.height)
  contexto.filter = 'grayscale(1) contrast(1.4)'
  contexto.translate(tela.width / 2, tela.height / 2)
  contexto.rotate((giro * Math.PI) / 180)
  contexto.drawImage(origem, x, y, largura, altura, -w / 2, -h / 2, w, h)
  return tela
}

interface Tentativa {
  faixa: Faixa
  giro: number
}

function inicioNaLeitura(faixa: Faixa, giro: number) {
  if (giro === 0) return faixa.y
  if (giro === 180) return -(faixa.y + faixa.altura)
  if (giro === 90) return faixa.x
  return -(faixa.x + faixa.largura)
}

function ePrimeiraLinha({ faixa, giro }: Tentativa, faixas: Faixa[]) {
  const inicio = inicioNaLeitura(faixa, giro)
  return !faixas.some((outra) => {
    if (outra === faixa || outra.vertical !== faixa.vertical) return false
    const sobreposicao = faixa.vertical
      ? Math.min(faixa.y + faixa.altura, outra.y + outra.altura) - Math.max(faixa.y, outra.y)
      : Math.min(faixa.x + faixa.largura, outra.x + outra.largura) - Math.max(faixa.x, outra.x)
    const comprimento = faixa.vertical ? Math.min(faixa.altura, outra.altura) : Math.min(faixa.largura, outra.largura)
    return sobreposicao > comprimento * 0.3 && inicioNaLeitura(outra, giro) < inicio
  })
}

function tentativas(faixas: Faixa[]) {
  const lista: Tentativa[] = []
  const provaveis = faixas.filter((faixa) => {
    const comprimento = Math.max(faixa.largura, faixa.altura)
    const espessura = Math.min(faixa.largura, faixa.altura)
    return comprimento <= espessura * PROPORCAO_MAXIMA_DO_NOME
  })
  for (const [indice, faixa] of provaveis.entries()) {
    if (faixa.vertical) {
      lista.push({ faixa, giro: 90 }, { faixa, giro: -90 })
      continue
    }
    lista.push({ faixa, giro: 0 })
    const anterior = provaveis[indice - 1]
    if (indice % 2 === 1 && anterior && !anterior.vertical) lista.push({ faixa: anterior, giro: 180 }, { faixa, giro: 180 })
  }
  return lista
}

async function lerSinais(quadro: Quadro, cantos: Ponto[]): Promise<Sinais> {
  const tipo = await lerLinha(recortarNome(quadro, cantos, 'cinza', 'tipo'))
  const tipos = tiposLidos(tipo.texto)
  const ehCriatura = tipos.includes('C')
  const forca = ehCriatura || !tipos ? (await lerLinha(recortarNome(quadro, cantos, 'cinza', 'forca'))).texto : ''
  return { tipos, forca }
}

function confere(leitura: Leitura, nome: string, pontuacao: number) {
  return custoConfere(nome, pontuacao, leitura.custo, leitura.fichas)
}

async function decidir(todos: Achado[], leitura: Leitura): Promise<CartaIdentificada | null> {
  const achados = todos.filter((achado) => achado.pontuacao >= NOME_POSSIVEL && confere(leitura, achado.nome, achado.pontuacao))
  const [primeiro, segundo] = achados
  if (!primeiro) return null
  const folga = primeiro.pontuacao === 1 ? FOLGA_COM_NOME_EXATO : FOLGA_ENTRE_NOMES
  const nomeClaro = primeiro.pontuacao >= NOME_CERTO
    && (!segundo || primeiro.pontuacao - segundo.pontuacao >= folga)
  if (nomeClaro) return { nome: primeiro.nome, porDesempate: false }
  if (!leitura.pedirSinais || !leitura.fichas || achados.length < 2 || performance.now() - leitura.inicio > ORCAMENTO_MS) return null
  const sinais = await leitura.pedirSinais()
  const escolhido = desempatar(achados.map((achado) => achado.nome), sinais, leitura.fichas)
  return escolhido ? { nome: escolhido, porDesempate: true } : null
}

interface Leitura {
  pedirSinais: (() => Promise<Sinais>) | null
  custo: Custo | null
  custoDaCarta: Custo | null
  fichas: Fichas | null
  melhor: { texto: string; confianca: number }
  provaveis: string[]
  anteriores: string[]
  inicio: number
  inclinacao: number
  catalogo: Awaited<ReturnType<typeof carregarCatalogo>>
}

function precisaConfirmar(nome: string, pontuacao: number, confianca: number) {
  return chaveDoNome(nome).length <= NOME_CURTO || (pontuacao < NOME_EXATO && confianca < CONFIANCA_SOZINHA)
}

async function avaliarTexto(texto: string, confianca: number, leitura: Leitura) {
  if (confianca > leitura.melhor.confianca && texto.replace(/[^a-z]/gi, '').length >= 4) leitura.melhor = { texto, confianca }
  const semAcento = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (confianca < CONFIANCA_MINIMA || LINHA_DE_TIPO.test(semAcento) || SO_TIPO.test(semAcento) || LINHA_DE_DIREITOS.test(semAcento)) return null
  const achados = procurarNoCatalogo(leitura.catalogo, texto)
  const pontuacao = achados[0]?.pontuacao ?? 0
  const [primeiro, segundo] = achados
  const provavel = primeiro && primeiro.pontuacao >= NOME_PROVAVEL
    && (!segundo || primeiro.pontuacao - segundo.pontuacao >= FOLGA_PROVAVEL)
  if (provavel && !leitura.provaveis.includes(primeiro.nome)) leitura.provaveis.push(primeiro.nome)
  const decisao = await decidir(achados, leitura)
  if (!decisao && provavel && leitura.anteriores.includes(primeiro.nome) && confere(leitura, primeiro.nome, primeiro.pontuacao)) return { nome: primeiro.nome, porDesempate: false }
  if (decisao && !decisao.porDesempate && precisaConfirmar(decisao.nome, pontuacao, confianca)) {
    if (!leitura.provaveis.includes(decisao.nome)) leitura.provaveis.push(decisao.nome)
    return leitura.anteriores.includes(decisao.nome) ? decisao : null
  }
  return decisao
}

async function tentar(reta: HTMLCanvasElement, tentativa: Tentativa, faixas: Faixa[], leitura: Leitura) {
  const { faixa, giro } = tentativa
  const { texto, confianca } = await lerLinha(recortar(reta, faixa, giro))
  const decisao = await avaliarTexto(texto, confianca, leitura)
  if (decisao && NOMES_QUE_SAO_PALAVRAS_DE_REGRA.has(chaveDoNome(decisao.nome))
    && (!faixas.length || !ePrimeiraLinha(tentativa, faixas))) return null
  return decisao
}

async function lerBarraDoNome(origem: CanvasImageSource, largura: number, altura: number, leitura: Leitura) {
  const contornos = encontrarContornos(origem, largura, altura, CONTORNOS_TESTADOS)
  const quadro = contornos.length ? lerQuadro(origem, largura, altura) : null
  if (!quadro) return { decisao: null, ocupacao: 0 }
  for (const contorno of contornos) {
    const emPe = orientacoes(contorno.cantos).sort((a, b) => a[0].y + a[1].y - b[0].y - b[1].y)
    for (const cantos of emPe) {
      let sinais: Promise<Sinais> | null = null
      leitura.pedirSinais = () => (sinais ??= lerSinais(quadro, cantos))
      leitura.custo = lerCusto(quadro, cantos)
      leitura.custoDaCarta ??= leitura.custo
      for (const modo of MODOS_DE_RECORTE) {
        if (performance.now() - leitura.inicio > ORCAMENTO_MS) return { decisao: null, ocupacao: contornos[0].ocupacao }
        const { texto, confianca } = await lerLinha(recortarNome(quadro, cantos, modo))
        const decisao = await avaliarTexto(texto, confianca, leitura)
        if (decisao) return { decisao, ocupacao: contorno.ocupacao }
      }
    }
  }
  leitura.pedirSinais = null
  leitura.custo = null
  return { decisao: null, ocupacao: contornos[0].ocupacao }
}

async function lerNomes(origem: CanvasImageSource, largura: number, altura: number, leitura: Leitura) {
  if (performance.now() - leitura.inicio > ORCAMENTO_MS) return null
  const { tela: reta, graus } = endireitar(origem, largura, altura)
  leitura.inclinacao = graus
  const faixas = encontrarFaixas(reta, largura, altura)
  for (const tentativa of tentativas(faixas)) {
    if (performance.now() - leitura.inicio > ORCAMENTO_MS) break
    const decisao = await tentar(reta, tentativa, faixas, leitura)
    if (decisao) return decisao
  }
  return null
}

const buscadosOnline = new Set<string>()

export function prepararIdentificacao() {
  return Promise.allSettled([carregarCatalogo(), carregarFichas()])
}

export async function identificarCarta(
  origem: CanvasImageSource,
  largura: number,
  altura: number,
  idioma: Idioma,
  { diagnostico, rapido = false, anteriores = [] }: Opcoes = {},
): Promise<CartaIdentificada | null> {
  const catalogo = await carregarCatalogo()
  const leitura: Leitura = {
    pedirSinais: null,
    custo: null,
    custoDaCarta: null,
    fichas: await carregarFichas().catch(() => null),
    melhor: { texto: '', confianca: 0 },
    provaveis: [],
    anteriores,
    inicio: performance.now(),
    inclinacao: 0,
    catalogo,
  }

  const { decisao: pelaBarra, ocupacao } = await lerBarraDoNome(origem, largura, altura, leitura)
  if (pelaBarra) return pelaBarra
  if (!rapido) {
    const pelasLinhas = await lerNomes(origem, largura, altura, leitura)
    if (pelasLinhas) return pelasLinhas
  }
  if (diagnostico) {
    diagnostico.provaveis = leitura.provaveis
    diagnostico.dica = ocupacao > 0 && ocupacao < CARTA_PEQUENA ? 'aproxime'
      : Math.abs(leitura.inclinacao) >= CARTA_TORTA_GRAUS ? 'endireite' : null
  }
  const { melhor: melhorLeitura } = leitura

  const chaveOnline = chaveDoNome(melhorLeitura.texto)
  if (melhorLeitura.confianca >= CONFIANCA_PARA_BUSCAR_ONLINE && chaveOnline.length >= 4 && !buscadosOnline.has(chaveOnline)) {
    buscadosOnline.add(chaveOnline)
    try {
      const { nomes, certeza } = await identificarCandidatos([melhorLeitura.texto], idioma, 'camera')
      if (certeza && nomes[0] && custoConfere(nomes[0], 0, leitura.custoDaCarta, leitura.fichas)) return { nome: nomes[0], porDesempate: false }
    } catch {
      return null
    }
  }
  return null
}
