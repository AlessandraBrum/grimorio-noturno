import { chromium } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

const CABECALHOS = { 'User-Agent': 'GrimorioNoturno/1.0', Accept: 'application/json' }
const LAYOUTS_FORA = new Set(['art_series', 'token', 'double_faced_token', 'emblem', 'planar', 'vanguard', 'scheme'])
const SIMULTANEAS = 24
const destino = new URL('../public/cartas/', import.meta.url)

async function baixarCatalogo() {
  const lista = await (await fetch('https://api.scryfall.com/bulk-data', { headers: CABECALHOS })).json()
  const artes = lista.data.find((item) => item.type === 'unique_artwork')
  const arquivo = await fetch(artes.jsonl_download_uri ?? artes.download_uri, { headers: CABECALHOS })
  const bruto = Buffer.from(await arquivo.arrayBuffer())
  const texto = (bruto[0] === 0x1f ? gunzipSync(bruto) : bruto).toString('utf-8').trim()
  return texto.startsWith('[') ? JSON.parse(texto) : texto.split('\n').map((linha) => JSON.parse(linha))
}

function listarImagens(cartas) {
  const imagens = []
  for (const carta of cartas) {
    if (LAYOUTS_FORA.has(carta.layout) || !carta.games?.includes('paper')) continue
    if (carta.image_uris?.small) {
      imagens.push({ nome: carta.name, url: carta.image_uris.small })
    } else {
      for (const face of carta.card_faces ?? []) {
        if (face.image_uris?.small) imagens.push({ nome: face.name, url: face.image_uris.small })
      }
    }
  }
  return imagens
}

const codigo = readFileSync(new URL('../src/reconhecimento/impressao.js', import.meta.url), 'utf-8').replace(/^export /gm, '')

const imagens = listarImagens(await baixarCatalogo())
console.log(`${imagens.length} artes para processar`)

const navegador = await chromium.launch()
const pagina = await navegador.newPage()
await pagina.addScriptTag({ content: codigo })

const nomes = []
const indiceDoNome = new Map()
const indices = []
const palavras = []
let falhas = 0

for (let inicio = 0; inicio < imagens.length; inicio += 600) {
  const lote = imagens.slice(inicio, inicio + 600)
  const resultado = await pagina.evaluate(async ({ lote, simultaneas }) => {
    const saida = new Array(lote.length).fill(null)
    let proximo = 0
    async function trabalhar() {
      while (proximo < lote.length) {
        const i = proximo++
        try {
          const resposta = await fetch(lote[i].url)
          if (!resposta.ok) continue
          const bitmap = await createImageBitmap(await resposta.blob())
          const tela = new OffscreenCanvas(bitmap.width, bitmap.height)
          const contexto = tela.getContext('2d')
          contexto.drawImage(bitmap, 0, 0)
          const { data } = contexto.getImageData(0, 0, bitmap.width, bitmap.height)
          const cinza = tonsDeCinza(data, bitmap.width, bitmap.height)
          const soma = imagemIntegral(cinza, bitmap.width, bitmap.height)
          const impressao = calcularImpressao(
            soma,
            bitmap.width,
            bitmap.width * ARTE.esquerda,
            bitmap.height * ARTE.topo,
            bitmap.width * ARTE.largura,
            bitmap.height * ARTE.altura,
          )
          saida[i] = Array.from(impressao)
          bitmap.close()
        } catch {
          saida[i] = null
        }
      }
    }
    await Promise.all(Array.from({ length: simultaneas }, trabalhar))
    return saida
  }, { lote, simultaneas: SIMULTANEAS })

  resultado.forEach((impressao, i) => {
    if (!impressao) {
      falhas++
      return
    }
    const nome = lote[i].nome
    if (!indiceDoNome.has(nome)) {
      indiceDoNome.set(nome, nomes.length)
      nomes.push(nome)
    }
    indices.push(indiceDoNome.get(nome))
    palavras.push(...impressao)
  })
  console.log(`${Math.min(inicio + 600, imagens.length)} de ${imagens.length}`)
}

await navegador.close()

mkdirSync(destino, { recursive: true })
const binario = Buffer.from(new Uint32Array(palavras).buffer)
writeFileSync(new URL('impressoes.json', destino), JSON.stringify({
  geradoEm: new Date().toISOString().slice(0, 10),
  nomes,
  indices,
  impressoes: binario.toString('base64'),
}))
console.log(`Pronto: ${indices.length} artes, ${nomes.length} nomes, ${falhas} falhas`)
