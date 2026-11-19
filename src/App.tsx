import { useEffect, useRef, useState } from 'react'
import { buscarCarta, CartaNaoEncontrada, SemConexao } from './api/scryfall'
import { Cabecalho } from './components/Cabecalho'
import { Ceu } from './components/Ceu'
import { PainelAjustes } from './components/PainelAjustes'
import { Rodape } from './components/Rodape'
import { SetaTopo } from './components/SetaTopo'
import { usePreferencias } from './contexto/usePreferencias'
import { useTela } from './navegacao'
import { Ajuda } from './telas/Ajuda'
import { Buscar, type EstadoBusca } from './telas/Buscar'
import { Camera } from './telas/Camera'
import { Carta } from './telas/Carta'
import { Glossario } from './telas/Glossario'
import { Leitura } from './telas/Leitura'
import { Sobre } from './telas/Sobre'
import type { Card } from './types/card'

export function App() {
  const { t, preferencias, lembrar } = usePreferencias()
  const { tela, irPara } = useTela()
  const [carta, setCarta] = useState<Card | null>(null)
  const [estadoBusca, setEstadoBusca] = useState<EstadoBusca>('parado')
  const [ajustesAbertos, setAjustesAbertos] = useState(false)
  const botaoAjustesRef = useRef<HTMLButtonElement>(null)
  const primeiraTela = useRef(true)

  const telaVisivel = tela === 'carta' && !carta ? 'buscar' : tela

  useEffect(() => {
    const titulo = telaVisivel === 'carta' && carta ? carta.printedName ?? carta.name : t.abas[telaVisivel as keyof typeof t.abas]
    document.title = `${titulo} · Grimório Noturno`
    if (primeiraTela.current) {
      primeiraTela.current = false
      return
    }
    window.scrollTo({ top: 0 })
    document.getElementById('titulo-tela')?.focus()
  }, [telaVisivel, carta, t])

  async function abrirPorNome(nome: string) {
    setEstadoBusca('carregando')
    try {
      const encontrada = await buscarCarta(nome, preferencias.idioma)
      abrirCarta(encontrada)
      setEstadoBusca('parado')
    } catch (erro) {
      if (erro instanceof CartaNaoEncontrada) setEstadoBusca('nao-encontrada')
      else if (erro instanceof SemConexao) setEstadoBusca('sem-internet')
      else setEstadoBusca('nao-encontrada')
    }
  }

  function abrirCarta(escolhida: Card) {
    setCarta(escolhida)
    lembrar(escolhida)
    irPara('carta')
  }

  const ajustesJaAbriram = useRef(false)

  useEffect(() => {
    if (ajustesAbertos) {
      ajustesJaAbriram.current = true
    } else if (ajustesJaAbriram.current) {
      botaoAjustesRef.current?.focus()
    }
  }, [ajustesAbertos])

  function fecharAjustes() {
    setAjustesAbertos(false)
  }

  return (
    <>
      <Ceu />
      <div className="app" inert={ajustesAbertos}>
        <a className="pular-conteudo" href="#nome-da-carta" onClick={() => irPara('buscar')}>
          {t.pularParaBusca}
        </a>
        <Cabecalho
          tela={telaVisivel}
          ajustesAbertos={ajustesAbertos}
          aoAbrirAjustes={() => setAjustesAbertos(true)}
          botaoAjustesRef={botaoAjustesRef}
        />
        <main className="principal limite" id="conteudo">
          {telaVisivel === 'buscar' && (
            <Buscar estado={estadoBusca} aoBuscar={abrirPorNome} aoAbrirRecente={abrirCarta} />
          )}
          {telaVisivel === 'carta' && carta && <Carta carta={carta} />}
          {telaVisivel === 'glossario' && <Glossario />}
          {telaVisivel === 'leitura' && <Leitura />}
          {telaVisivel === 'ajuda' && <Ajuda />}
          {telaVisivel === 'sobre' && <Sobre />}
          {telaVisivel === 'camera' && <Camera aoAbrir={abrirCarta} />}
        </main>
        <Rodape />
        <SetaTopo key={telaVisivel} />
      </div>
      {ajustesAbertos && <PainelAjustes aoFechar={fecharAjustes} />}
    </>
  )
}
