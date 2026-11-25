export type Idioma = 'pt' | 'en'

export interface Card {
  id: string
  oracleId?: string
  name: string
  lang: Idioma
  printedName?: string
  typeLine: string
  printedTypeLine?: string
  manaCost: string
  oracleText: string
  printedText?: string
  keywords: string[]
  power?: string
  toughness?: string
  artist: string
  setName: string
  rarity: string
  imageUrl?: string
  adaptada?: boolean
}
