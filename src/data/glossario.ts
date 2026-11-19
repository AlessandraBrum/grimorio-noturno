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
  {
    id: 'connive',
    original: 'Connive',
    nome: { pt: 'Acobertar', en: 'Connive' },
    definicao: {
      pt: 'Compre um card e depois descarte um card. Se houver um número após acobertar, compre e descarte essa quantidade. Para cada card descartado que não seja terreno, coloque um marcador +1/+1 na permanente que acobertou.',
      en: 'Draw a card, then discard a card. If connive specifies a number, draw and discard that many instead. For every nonland card discarded this way, add a +1/+1 counter to the permanent that connived.',
    },
  },
  {
    id: 'extort',
    original: 'Extort',
    nome: { pt: 'Extorquir', en: 'Extort' },
    definicao: {
      pt: 'Quando você conjura uma mágica, pode pagar um mana branco ou preto. Se pagar, cada oponente perde 1 ponto de vida e você ganha o total perdido dessa forma.',
      en: 'Whenever you cast a spell, you may spend one white or black mana. If you do, each opponent loses 1 life and you gain the total life they lost this way.',
    },
  },
  {
    id: 'swampwalk',
    original: 'Swampwalk',
    nome: { pt: 'Travessia de pântano', en: 'Swampwalk' },
    definicao: {
      pt: 'Esta criatura não pode ser bloqueada se o jogador defensor controlar um terreno do subtipo Pântano, mesmo que ele não seja básico.',
      en: 'The defending player cannot block this creature if they control a land with the Swamp subtype, even a nonbasic one.',
    },
  },
  {
    id: 'mill',
    original: 'Mill',
    nome: { pt: 'Triturar', en: 'Mill' },
    definicao: {
      pt: 'Coloque a quantidade indicada de cards do topo do seu grimório no seu cemitério. Se houver menos cards do que o efeito pediu, coloque todos os que restarem.',
      en: 'Move the indicated number of cards from the top of your library to your graveyard. If an effect asks for more than you have, move all the cards left.',
    },
  },
  {
    id: 'surveil',
    original: 'Surveil',
    nome: { pt: 'Vigiar', en: 'Surveil' },
    definicao: {
      pt: 'Olhe a quantidade indicada de cards do topo do seu grimório. Ponha quantos quiser no cemitério e devolva os demais ao topo na ordem que preferir.',
      en: 'Look at the indicated number of cards from the top of your library. Send any of them to your graveyard and arrange the rest back on top.',
    },
  },
  {
    id: 'scry',
    original: 'Scry',
    nome: { pt: 'Vidência', en: 'Scry' },
    definicao: {
      pt: 'Olhe a quantidade indicada de cards do topo do seu grimório. Divida-os como quiser entre o topo e o fundo, escolhendo a ordem de cada grupo.',
      en: 'Look at the indicated number of cards from the top of your library. Split them between the top and bottom however you like, choosing the order of each group.',
    },
  },
  {
    id: 'ward',
    original: 'Ward',
    nome: { pt: 'Salvaguarda', en: 'Ward' },
    definicao: {
      pt: 'Quando um oponente escolhe esta permanente como alvo de uma mágica ou habilidade, anule essa mágica ou habilidade, a menos que ele pague o custo de salvaguarda.',
      en: 'When an opponent targets this permanent with a spell or ability, counter that spell or ability unless they pay the ward cost.',
    },
  },
  {
    id: 'explore',
    original: 'Explore',
    nome: { pt: 'Explorar', en: 'Explore' },
    definicao: {
      pt: 'Revele o card do topo do seu grimório. Se for terreno, coloque-o na mão. Caso contrário, coloque um marcador +1/+1 na permanente que explorou e escolha deixar o card no topo ou colocá-lo no cemitério.',
      en: 'Reveal the top card of your library. If it is a land, put it in your hand. Otherwise, add a +1/+1 counter to the permanent that explored and choose whether to keep the card on top or move it to your graveyard.',
    },
  },
  {
    id: 'proliferate',
    original: 'Proliferate',
    nome: { pt: 'Proliferar', en: 'Proliferate' },
    definicao: {
      pt: 'Escolha quantas permanentes e jogadores quiser entre os que já têm marcadores. Dê a cada escolhido mais um marcador de cada tipo que ele já tem.',
      en: 'Choose any number of permanents and players that already have counters. Give each one another counter of every kind already there.',
    },
  },
  {
    id: 'flashback',
    original: 'Flashback',
    nome: { pt: 'Recapitular', en: 'Flashback' },
    definicao: {
      pt: 'Você pode conjurar a mágica do seu cemitério pagando o custo de recapitular. Se fizer isso, exile o card quando a mágica sair da pilha.',
      en: 'You may cast the spell from your graveyard for its flashback cost. If you do, exile the card when the spell leaves the stack.',
    },
  },
  {
    id: 'cascade',
    original: 'Cascade',
    nome: { pt: 'Cascata', en: 'Cascade' },
    definicao: {
      pt: 'Ao conjurar a mágica, exile cards do topo do grimório até encontrar um card que não seja terreno e tenha valor de mana menor. Você pode conjurá-lo sem pagar seu custo de mana se a mágica resultante também tiver valor de mana menor. Ponha os cards que continuarem exilados no fundo em ordem aleatória.',
      en: 'When you cast the spell, exile cards from the top of your library until you reach a nonland card with a lower mana value. You may cast it for free if the resulting spell also has a lower mana value. Put the cards still exiled on the bottom in random order.',
    },
  },
  {
    id: 'kicker',
    original: 'Kicker',
    nome: { pt: 'Reforçar', en: 'Kicker' },
    definicao: {
      pt: 'Ao conjurar a mágica, você pode pagar o custo extra de reforçar. O texto da carta diz o que acontece quando você paga esse custo.',
      en: 'As you cast the spell, you may pay its extra kicker cost. The card tells you what happens if you pay it.',
    },
  },
  {
    id: 'blitz',
    original: 'Blitz',
    nome: { pt: 'Blitz', en: 'Blitz' },
    definicao: {
      pt: 'Se conjurar a carta pelo custo de blitz, a criatura ganha ímpeto e faz você comprar um card quando ela morre. Sacrifique-a no início da próxima etapa final.',
      en: 'If you cast the card for its blitz cost, the creature gains haste and lets you draw a card when it dies. Sacrifice it at the beginning of the next end step.',
    },
  },
  {
    id: 'casualty',
    original: 'Casualty',
    nome: { pt: 'Baixa', en: 'Casualty' },
    definicao: {
      pt: 'Ao conjurar a mágica, você pode sacrificar uma criatura com poder pelo menos igual ao número indicado. Se fizer isso, copie a mágica e, se quiser, escolha novos alvos para a cópia.',
      en: 'As you cast the spell, you may sacrifice a creature whose power is at least the indicated number. If you do, copy the spell and choose new targets for the copy if you like.',
    },
  },
]

export function termosDaCarta(palavrasChave: string[]): Termo[] {
  const procuradas = palavrasChave.map((palavra) => palavra.toLowerCase())
  return GLOSSARIO.filter((termo) => procuradas.includes(termo.original.toLowerCase()))
}
