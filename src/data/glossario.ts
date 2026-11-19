import type { Idioma } from '../types/card'

export interface Termo {
  id: string
  original: string
  nome: Record<Idioma, string>
  definicao: Record<Idioma, string>
}

export const GLOSSARIO: Termo[] = [
  {
    id: 'reach',
    original: 'Reach',
    nome: { pt: 'Alcance', en: 'Reach' },
    definicao: { pt: 'Pode bloquear criaturas que voam.', en: 'Can block creatures with flying.' },
  },
  {
    id: 'trample',
    original: 'Trample',
    nome: { pt: 'Atropelar', en: 'Trample' },
    definicao: {
      pt: 'Se o dano passar do necessário para destruir quem bloqueou, o resto vai para o jogador.',
      en: 'Damage beyond what is needed to destroy the blockers goes to the player.',
    },
  },
  {
    id: 'defender',
    original: 'Defender',
    nome: { pt: 'Defensor', en: 'Defender' },
    definicao: { pt: 'Não pode atacar.', en: 'Can’t attack.' },
  },
  {
    id: 'haste',
    original: 'Haste',
    nome: { pt: 'Ímpeto', en: 'Haste' },
    definicao: {
      pt: 'Pode atacar no mesmo turno em que entrou no jogo.',
      en: 'Can attack the turn it comes into play.',
    },
  },
  {
    id: 'first-strike',
    original: 'First strike',
    nome: { pt: 'Iniciativa', en: 'First strike' },
    definicao: {
      pt: 'Causa dano em combate antes das criaturas sem iniciativa.',
      en: 'Deals combat damage before creatures without first strike.',
    },
  },
  {
    id: 'deathtouch',
    original: 'Deathtouch',
    nome: { pt: 'Toque mortífero', en: 'Deathtouch' },
    definicao: {
      pt: 'Qualquer dano que ela causa a uma criatura já destrói essa criatura.',
      en: 'Any damage it deals to a creature destroys that creature.',
    },
  },
  {
    id: 'vigilance',
    original: 'Vigilance',
    nome: { pt: 'Vigilância', en: 'Vigilance' },
    definicao: {
      pt: 'Atacar não faz esta criatura virar. Ela continua pronta para bloquear.',
      en: 'Attacking doesn’t cause it to tap. It stays ready to block.',
    },
  },
  {
    id: 'lifelink',
    original: 'Lifelink',
    nome: { pt: 'Vínculo com a vida', en: 'Lifelink' },
    definicao: {
      pt: 'O dano que ela causa também dá a você a mesma quantidade de vida.',
      en: 'Damage it deals also makes you gain that much life.',
    },
  },
  {
    id: 'flying',
    original: 'Flying',
    nome: { pt: 'Voar', en: 'Flying' },
    definicao: {
      pt: 'Só pode ser bloqueada por criaturas que também voam ou que têm alcance.',
      en: 'Can only be blocked by creatures with flying or reach.',
    },
  },
]

export function termosDaCarta(palavrasChave: string[]): Termo[] {
  const procuradas = palavrasChave.map((palavra) => palavra.toLowerCase())
  return GLOSSARIO.filter((termo) => procuradas.includes(termo.original.toLowerCase()))
}
