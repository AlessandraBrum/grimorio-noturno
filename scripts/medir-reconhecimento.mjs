import { chromium } from 'playwright'
import { readdirSync, readFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { createServer } from 'vite'

const argumentos = Object.fromEntries(
  process.argv.slice(2).map((item) => {
    const [chave, valor = 'sim'] = item.replace(/^--/, '').split('=')
    return [chave, valor]
  }),
)
const TOTAL = Number(argumentos.cartas ?? 30)
const LENTIDAO = Number(argumentos.lento ?? 4)
const PASTA = argumentos.pasta
const CABECALHOS = { 'User-Agent': 'GrimorioNoturno/1.0', Accept: 'application/json' }

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sortearCartas() {
  const cartas = []
  while (cartas.length < TOTAL) {
    const resposta = await fetch('https://api.scryfall.com/cards/random?q=' + encodeURIComponent('game:paper lang:en -is:digital -t:token -layout:art_series'), { headers: CABECALHOS })
    const carta = await resposta.json()
    const face = carta.image_uris ? carta : carta.card_faces?.[0]
    if (face?.image_uris?.large && !cartas.some((c) => c.nome === face.name)) {
      cartas.push({ nome: face.name, url: face.image_uris.large })
    }
    await esperar(120)
  }
  return cartas
}

function lerPasta(pasta) {
  return readdirSync(pasta)
    .filter((arquivo) => /\.(jpe?g|png|webp)$/i.test(arquivo))
    .map((arquivo) => ({
      nome: basename(arquivo, extname(arquivo)).replace(/_/g, ' '),
      url: 'data:image/' + extname(arquivo).slice(1).replace('jpg', 'jpeg') + ';base64,' + readFileSync(join(pasta, arquivo)).toString('base64'),
    }))
}

const cartas = PASTA ? lerPasta(PASTA) : await sortearCartas()
const servidor = await createServer({ server: { port: 5310, strictPort: true, open: false }, logLevel: 'error' })
await servidor.listen()
const navegador = await chromium.launch()
const pagina = await navegador.newPage()
await pagina.goto('http://localhost:5310/')
const cdp = await pagina.context().newCDPSession(pagina)

await pagina.evaluate(async () => {
  const { prepararIdentificacao } = await import('/src/reconhecimento/identificar.ts')
  const { prepararLeitor } = await import('/src/api/ocr.ts')
  await prepararIdentificacao()
  await prepararLeitor()
})
if (LENTIDAO > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: LENTIDAO })

const resultados = await pagina.evaluate(async (cartas) => {
  const { identificarCarta } = await import('/src/reconhecimento/identificar.ts')
  const carregar = (url) => new Promise((resolve, reject) => {
    const imagem = new Image()
    imagem.crossOrigin = 'anonymous'
    imagem.onload = () => resolve(imagem)
    imagem.onerror = reject
    imagem.src = url
  })
  const ARTE = { x: 0.081, y: 0.112, w: 0.838, h: 0.442 }
  const variantes = [
    { escala: 0.9, giro: -4, desfoque: 0.6 },
    { escala: 0.75, giro: 6, desfoque: 1 },
    { escala: 0.8, giro: 90, desfoque: 0.8 },
    { escala: 0.85, giro: 180, desfoque: 0.7 },
    { escala: 0.8, giro: 2, desfoque: 0.8, alterada: true },
  ]
  let semente = 7
  const sorte = () => {
    semente = (semente * 16807) % 2147483647
    return semente / 2147483647
  }
  function quadro(imagem, outra, variante) {
    const tela = document.createElement('canvas')
    tela.width = 1920
    tela.height = 1080
    const c = tela.getContext('2d')
    c.fillStyle = `rgb(${40 + sorte() * 40}, ${32 + sorte() * 30}, ${28 + sorte() * 30})`
    c.fillRect(0, 0, 1920, 1080)
    const deitada = Math.abs(variante.giro) % 180 > 45
    const altura = deitada ? 1080 * variante.escala * (imagem.height / imagem.width) : 1080 * variante.escala
    const largura = altura * (imagem.width / imagem.height)
    const carta = document.createElement('canvas')
    carta.width = imagem.width
    carta.height = imagem.height
    const cc = carta.getContext('2d')
    cc.drawImage(imagem, 0, 0)
    if (variante.alterada) {
      cc.save()
      cc.filter = 'hue-rotate(140deg) saturate(1.4)'
      cc.translate(imagem.width * (ARTE.x + ARTE.w), imagem.height * ARTE.y)
      cc.scale(-1, 1)
      cc.drawImage(outra, outra.width * ARTE.x, outra.height * ARTE.y, outra.width * ARTE.w, outra.height * ARTE.h, 0, 0, imagem.width * ARTE.w, imagem.height * ARTE.h)
      cc.restore()
    }
    c.save()
    c.translate(960 + (sorte() - 0.5) * 200, 540 + (sorte() - 0.5) * 60)
    c.rotate((variante.giro * Math.PI) / 180)
    c.filter = `blur(${variante.desfoque}px) brightness(${0.8 + sorte() * 0.3})`
    c.drawImage(carta, -largura / 2, -altura / 2, largura, altura)
    c.restore()
    const ruido = c.getImageData(0, 0, 1920, 1080)
    for (let i = 0; i < ruido.data.length; i += 4) {
      const n = (sorte() - 0.5) * 18
      ruido.data[i] += n
      ruido.data[i + 1] += n
      ruido.data[i + 2] += n
    }
    c.putImageData(ruido, 0, 0)
    return tela
  }
  const imagens = []
  for (const carta of cartas) imagens.push(await carregar(carta.url))
  const saida = []
  for (const [indice, carta] of cartas.entries()) {
    const outra = imagens[(indice + 1) % imagens.length]
    for (const variante of variantes) {
      const tela = quadro(imagens[indice], outra, variante)
      const inicio = performance.now()
      const resultado = await identificarCarta(tela, tela.width, tela.height, 'en')
      saida.push({
        nome: carta.nome,
        variante: variante.alterada ? 'arte alterada' : `giro ${variante.giro}°`,
        lido: resultado?.nome ?? null,
        ms: Math.round(performance.now() - inicio),
      })
    }
  }
  return saida
}, cartas)

const tempoDaFicha = []
if (!PASTA) {
  for (const carta of cartas.slice(0, 10)) {
    const inicio = performance.now()
    await fetch('https://api.scryfall.com/cards/named?exact=' + encodeURIComponent(carta.nome), { headers: CABECALHOS })
    tempoDaFicha.push(performance.now() - inicio)
    await esperar(120)
  }
}

await navegador.close()
await servidor.close()

const mesmoNome = (a, b) => !!a && !!b && a.toLowerCase().split(' // ')[0] === b.toLowerCase().split(' // ')[0]
const certas = resultados.filter((r) => mesmoNome(r.lido, r.nome))
const erradas = resultados.filter((r) => r.lido && !mesmoNome(r.lido, r.nome))
const tempos = certas.map((r) => r.ms).sort((a, b) => a - b)
const media = (lista) => (lista.length ? Math.round(lista.reduce((s, v) => s + v, 0) / lista.length) : 0)
const percentil = (lista, p) => lista[Math.min(lista.length - 1, Math.floor(lista.length * p))] ?? 0

console.log(`Cartas: ${cartas.length}  Quadros: ${resultados.length}  Processador ${LENTIDAO}x mais lento`)
console.log(`Reconhecidas: ${certas.length} (${Math.round((certas.length / resultados.length) * 100)}%)`)
console.log(`Abriram a carta errada: ${erradas.length}`)
console.log(`Tempo de leitura, média ${media(tempos)} ms, mediana ${percentil(tempos, 0.5)} ms, 90% abaixo de ${percentil(tempos, 0.9)} ms`)
if (tempoDaFicha.length) console.log(`Busca da ficha no Scryfall, média ${media(tempoDaFicha)} ms`)
for (const variante of [...new Set(resultados.map((r) => r.variante))]) {
  const grupo = resultados.filter((r) => r.variante === variante)
  console.log(`  ${variante}: ${grupo.filter((r) => mesmoNome(r.lido, r.nome)).length} de ${grupo.length}`)
}
for (const r of erradas) console.log(`  ERRO: ${r.nome} (${r.variante}) virou ${r.lido}`)
for (const r of resultados.filter((r) => !r.lido)) console.log(`  não leu: ${r.nome} (${r.variante})`)
