import { mkdirSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

const CABECALHOS = { 'User-Agent': 'GrimorioNoturno/1.0', Accept: 'application/json' }
const LAYOUTS_FORA = new Set(['art_series', 'token', 'double_faced_token', 'emblem', 'planar', 'vanguard', 'scheme', 'front_card'])
const TIPOS = [
  ['creature', 'C'], ['sorcery', 'S'], ['instant', 'I'], ['artifact', 'A'], ['enchantment', 'E'],
  ['land', 'L'], ['planeswalker', 'P'], ['battle', 'B'], ['kindred', 'K'], ['tribal', 'K'],
]
const destino = new URL('../public/cartas/', import.meta.url)

async function baixarCartas() {
  const lista = await (await fetch('https://api.scryfall.com/bulk-data', { headers: CABECALHOS })).json()
  const oraculo = lista.data.find((item) => item.type === 'oracle_cards')
  const arquivo = await fetch(oraculo.jsonl_download_uri ?? oraculo.download_uri, { headers: CABECALHOS })
  const bruto = Buffer.from(await arquivo.arrayBuffer())
  const texto = (bruto[0] === 0x1f ? gunzipSync(bruto) : bruto).toString('utf-8').trim()
  return texto.startsWith('[') ? JSON.parse(texto) : texto.split('\n').map((linha) => JSON.parse(linha))
}

function codigoDosTipos(linha = '') {
  const tipos = linha.toLowerCase().split('—')[0]
  return [...new Set(TIPOS.filter(([palavra]) => tipos.includes(palavra)).map(([, letra]) => letra))].join('')
}

function simbolo(texto) {
  if (/^(\d+|X|Y|Z)$/.test(texto)) return 'N'
  if (/^[WUBRGC]$/.test(texto)) return texto
  if (/^[WUBRG]\/P$/.test(texto)) return texto[0]
  return 'H'
}

function simbolos(custo = '') {
  return (custo.match(/\{[^}]+\}/g) ?? []).map((parte) => simbolo(parte.slice(1, -1))).join('')
}

function resumo(face) {
  const forca = face.power !== undefined && face.toughness !== undefined ? `${face.power}/${face.toughness}` : ''
  return `${codigoDosTipos(face.type_line)}|${simbolos(face.mana_cost)}|${forca}`
}

const nomes = []
const faces = {}
for (const carta of await baixarCartas()) {
  if (LAYOUTS_FORA.has(carta.layout) || !carta.games?.includes('paper')) continue
  nomes.push(carta.name)
  const partes = carta.card_faces?.length ? carta.card_faces : [carta]
  for (const face of partes) {
    const dados = face.type_line ? face : { ...carta, ...face }
    faces[face.name] ??= resumo(dados)
  }
}

mkdirSync(destino, { recursive: true })
writeFileSync(new URL('cartas.json', destino), JSON.stringify({
  geradoEm: new Date().toISOString().slice(0, 10),
  nomes,
  faces,
}))
console.log(`${nomes.length} cartas, ${Object.keys(faces).length} faces`)
