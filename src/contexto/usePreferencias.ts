import { createContext, useContext } from 'react'
import type { Textos } from '../i18n/textos'
import type { Card, Idioma } from '../types/card'

export type Tema = 'escuro' | 'claro' | 'sistema'
export type Tamanho = 'normal' | 'grande' | 'maior' | 'enorme'
export type Espacamento = 'normal' | 'amplo' | 'extra'
export type Contraste = 'padrao' | 'extra'

export interface Preferencias {
  idioma: Idioma
  tema: Tema
  animacoes: boolean
  lerSozinho: boolean
  tamanho: Tamanho
  espacamento: Espacamento
  contraste: Contraste
}

export const TAMANHOS_EM_REM: Record<Tamanho, string> = {
  normal: '1.125rem',
  grande: '1.25rem',
  maior: '1.5rem',
  enorme: '1.75rem',
}

export const PADRAO: Preferencias = {
  idioma: 'pt',
  tema: 'escuro',
  animacoes: true,
  lerSozinho: false,
  tamanho: 'grande',
  espacamento: 'normal',
  contraste: 'padrao',
}

export interface ValorDoContexto {
  preferencias: Preferencias
  t: Textos
  mudar: <K extends keyof Preferencias>(chave: K, valor: Preferencias[K]) => void
  recentes: Card[]
  lembrar: (carta: Card) => void
  apagarDados: () => void
}

export const MAXIMO_RECENTES = 10

export const Contexto = createContext<ValorDoContexto | null>(null)

export function usePreferencias() {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('usePreferencias precisa estar dentro de PreferenciasProvider')
  return valor
}
