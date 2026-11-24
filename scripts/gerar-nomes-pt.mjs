import { writeFile } from 'node:fs/promises'

const DESTINO = new URL('../public/cartas/nomes-pt.json', import.meta.url)
const PAUSA_MS = 200

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function pedir(endereco, tentativa = 1) {
  const resposta = await fetch(endereco, { headers: { Accept: 'application/json', 'User-Agent': 'GrimorioNoturno/1.0' } })
  if (resposta.status === 429 && tentativa <= 5) {
    await esperar(2000 * tentativa)
    return pedir(endereco, tentativa + 1)
  }
  if (!resposta.ok) throw new Error(`Scryfall respondeu ${resposta.status}`)
  return resposta.json()
}

const pares = new Map()
let endereco = 'https://api.scryfall.com/cards/search?q=lang%3Apt&unique=prints&order=name'
while (endereco) {
  const pagina = await pedir(endereco)
  for (const carta of pagina.data) {
    const faces = carta.card_faces ?? [carta]
    const nomesEmIngles = carta.name.split(' // ')
    faces.forEach((face, indice) => {
      const impresso = face.printed_name?.trim()
      const ingles = nomesEmIngles[indice] ?? carta.name
      if (impresso && impresso.toLowerCase() !== ingles.toLowerCase()) pares.set(impresso, ingles)
    })
  }
  endereco = pagina.has_more ? pagina.next_page : null
  await esperar(PAUSA_MS)
}

const ordenados = Object.fromEntries([...pares].sort(([a], [b]) => a.localeCompare(b, 'pt')))
await writeFile(DESTINO, JSON.stringify(ordenados))
console.log(`${pares.size} nomes em português salvos.`)
