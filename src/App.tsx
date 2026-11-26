import { useEffect, useRef, useState } from 'react'
import { prepararLeitor } from './api/ocr'
import { buscarCarta, CartaNaoEncontrada, SemConexao } from './api/scryfall'
import { Cabecalho } from './components/Cabecalho'
import { Ceu } from './components/Ceu'
import { PainelAjustes } from './components/PainelAjustes'
import { Rodape } from './components/Rodape'
import { SetaTopo } from './components/SetaTopo'
import { usePreferencias } from './contexto/usePreferencias'
import { CONTATO } from './i18n/contato'
import { Contato, type ContextoContato } from './telas/Contato'
import { useTela } from './navegacao'
import { carregarCatalogo } from './reconhecimento/catalogo'
import { Ajuda } from './telas/Ajuda'
import { Buscar, type EstadoBusca } from './telas/Buscar'
import { Camera } from './telas/Camera'
import { Carta } from './telas/Carta'
import { Glossario } from './telas/Glossario'
import { Leitura } from './telas/Leitura'
import { Sobre } from './telas/Sobre'
import type { Card, Idioma } from './types/card'
import { prepararImagem } from './utils/imagemContato'

const ESPERA_PARA_AQUECER_MS = 1500

export function App() {
  const { t, preferencias, lembrar } = usePreferencias()
  const { tela, irPara } = useTela()
  const [cartaAberta, setCartaAberta] = useState<{ carta: Card; idioma: Idioma } | null>(null)
  const carta = cartaAberta?.carta
  const [contextoContato, setContextoContato] = useState<ContextoContato>()
  const quadroDaCarta = useRef<HTMLCanvasElement | File | undefined>(undefined)
  const c = CONTATO[preferencias.idioma]
  const [estadoBusca, setEstadoBusca] = useState<EstadoBusca>('parado')
  const [ajustesAbertos, setAjustesAbertos] = useState(false)
  const botaoAjustesRef = useRef<HTMLButtonElement>(null)
  const primeiraTela = useRef(true)
  const focarBusca = useRef(false)

  const telaVisivel = tela === 'carta' && !carta ? 'buscar' : tela

  useEffect(() => {
    const espera = setTimeout(() => {
      prepararLeitor().catch(() => {})
      carregarCatalogo().catch(() => {})
    }, ESPERA_PARA_AQUECER_MS)
    return () => clearTimeout(espera)
  }, [])

  useEffect(() => {
    const titulo = telaVisivel === 'carta' && carta ? carta.printedName ?? carta.name : t.abas[telaVisivel as keyof typeof t.abas]
    document.title = telaVisivel === 'buscar' ? t.tituloPagina : `${titulo} · Grimório Noturno`
    if (primeiraTela.current) {
      primeiraTela.current = false
      return
    }
    window.scrollTo({ top: 0 })
    const destinoDoFoco = telaVisivel === 'buscar' && focarBusca.current ? 'nome-da-carta' : 'titulo-tela'
    focarBusca.current = false
    document.getElementById(destinoDoFoco)?.focus()
  }, [telaVisivel, carta, t])

  useEffect(() => {
    const idioma = preferencias.idioma
    if (telaVisivel !== 'carta' || !cartaAberta || cartaAberta.idioma === idioma) return
    let ativo = true
    buscarCarta(cartaAberta.carta.name, idioma).then((localizada) => {
      if (ativo) setCartaAberta({ carta: localizada, idioma })
    }).catch(() => {})
    return () => { ativo = false }
  }, [cartaAberta, preferencias.idioma, telaVisivel])

  async function abrirPorNome(nome: string) {
    setEstadoBusca('carregando')
    try {
      const encontrada = await buscarCarta(nome, preferencias.idioma)
      abrirCarta(encontrada)
      setEstadoBusca('parado')
    } catch (erro) {
      if (erro instanceof CartaNaoEncontrada) setEstadoBusca('nao-encontrada')
      else if (erro instanceof SemConexao) setEstadoBusca('sem-internet')
      else setEstadoBusca('servico-indisponivel')
    }
  }

  function abrirCarta(escolhida: Card, quadro?: HTMLCanvasElement | File) {
    quadroDaCarta.current = quadro
    setCartaAberta({ carta: escolhida, idioma: preferencias.idioma })
    lembrar(escolhida)
    irPara('carta')
  }

  async function reportar(origem: string, quadro?: HTMLCanvasElement | File) {
    let imagem: File | undefined
    if (quadro instanceof File) imagem = await prepararImagem(quadro)
    else if (quadro) {
      const blob = await new Promise<Blob | null>((resolve) => quadro.toBlob(resolve, 'image/jpeg', 0.82))
      if (blob) imagem = await prepararImagem(new File([blob], c.captura, { type: blob.type }))
    }
    setContextoContato({ origem, imagem })
    irPara('contato')
  }

  useEffect(() => {
    function limparContexto() {
      if (window.location.hash !== '#contato') setContextoContato(undefined)
    }
    window.addEventListener('hashchange', limparContexto)
    return () => window.removeEventListener('hashchange', limparContexto)
  }, [])

  const ajustesJaAbriram = useRef(false)

  useEffect(() => {
    if (ajustesAbertos) {
      ajustesJaAbriram.current = true
    } else if (ajustesJaAbriram.current) {
      botaoAjustesRef.current?.focus()
    }
  }, [ajustesAbertos])

  function digitarDaCamera() {
    focarBusca.current = true
    irPara('buscar')
  }

  function fecharAjustes() {
    setAjustesAbertos(false)
  }

  return (
    <>
      <Ceu />
      <div className="app" inert={ajustesAbertos}>
        {telaVisivel === 'contato' ? (
          <a className="pular-conteudo" href="#titulo-tela" onClick={(evento) => {
            evento.preventDefault()
            document.getElementById('titulo-tela')?.focus()
          }}>{c.pular}</a>
        ) : (
          <a className="pular-conteudo" href="#nome-da-carta" onClick={() => irPara('buscar')}>
            {t.pularParaBusca}
          </a>
        )}
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
          {telaVisivel === 'carta' && carta && <Carta key={carta.id + carta.lang} carta={carta} aoReportar={() => void reportar(`${c.carta} (${carta.printedName ?? carta.name})`, quadroDaCarta.current)} />}
          {telaVisivel === 'glossario' && <Glossario />}
          {telaVisivel === 'leitura' && <Leitura />}
          {telaVisivel === 'ajuda' && <Ajuda />}
          {telaVisivel === 'sobre' && <Sobre />}
          {telaVisivel === 'camera' && <Camera key={preferencias.idioma} aoAbrir={abrirCarta} aoDigitar={digitarDaCamera} aoReportar={(quadro) => void reportar(c.camera, quadro)} />}
          {telaVisivel === 'contato' && <Contato contexto={contextoContato} />}
        </main>
        <Rodape />
        <SetaTopo key={telaVisivel} />
      </div>
      {ajustesAbertos && <PainelAjustes aoFechar={fecharAjustes} />}
    </>
  )
}
