import { useEffect, useState, type ReactNode } from 'react'
import { TEXTOS } from '../i18n/textos'
import type { Card } from '../types/card'
import { apagarTudo, gravar, ler, lerLista } from './armazenamento'
import { Contexto, MAXIMO_RECENTES, PADRAO, TAMANHOS_EM_REM, type Preferencias } from './usePreferencias'

function temaDoSistema(): 'escuro' | 'claro' {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'escuro'
}

export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const [preferencias, setPreferencias] = useState<Preferencias>(() => ler('preferencias', PADRAO))
  const [recentes, setRecentes] = useState<Card[]>(() => lerLista<Card>('recentes'))

  useEffect(() => {
    const raiz = document.documentElement
    raiz.lang = preferencias.idioma === 'pt' ? 'pt-BR' : 'en'
    raiz.dataset.theme = preferencias.tema === 'sistema' ? temaDoSistema() : preferencias.tema
    raiz.dataset.movimento = preferencias.animacoes ? 'ligado' : 'desligado'
    raiz.dataset.espacamento = preferencias.espacamento
    raiz.dataset.contraste = preferencias.contraste
    raiz.style.setProperty('--tamanho-leitura', TAMANHOS_EM_REM[preferencias.tamanho])
    gravar('preferencias', preferencias)
  }, [preferencias])

  function mudar<K extends keyof Preferencias>(chave: K, valor: Preferencias[K]) {
    setPreferencias((atual) => ({ ...atual, [chave]: valor }))
  }

  function lembrar(carta: Card) {
    setRecentes((atual) => {
      const nova = [carta, ...atual.filter((c) => c.name !== carta.name)].slice(0, MAXIMO_RECENTES)
      gravar('recentes', nova)
      return nova
    })
  }

  function apagarDados() {
    apagarTudo()
    setRecentes([])
    setPreferencias({ ...PADRAO, idioma: preferencias.idioma })
  }

  return (
    <Contexto.Provider
      value={{ preferencias, t: TEXTOS[preferencias.idioma], mudar, recentes, lembrar, apagarDados }}
    >
      {children}
    </Contexto.Provider>
  )
}
