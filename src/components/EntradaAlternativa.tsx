import { useEffect, useRef, useState } from 'react'
import { buscarCarta, identificarCandidatos, SemConexao } from '../api/scryfall'
import { usePreferencias } from '../contexto/usePreferencias'
import type { Card } from '../types/card'
import { ConfirmarCarta } from './ConfirmarCarta'
import { Icone } from './Icone'

interface ResultadoDeVoz {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

interface Reconhecedor {
  lang: string
  maxAlternatives: number
  interimResults: boolean
  onresult: ((evento: ResultadoDeVoz) => void) | null
  onerror: ((evento: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type ConstrutorDeReconhecedor = new () => Reconhecedor

type Estado = 'parado' | 'ouvindo' | 'procurando' | 'confirmar' | 'erro'

function construtorDeVoz(): ConstrutorDeReconhecedor | undefined {
  const janela = window as unknown as Record<string, ConstrutorDeReconhecedor | undefined>
  return janela.SpeechRecognition ?? janela.webkitSpeechRecognition
}

export function EntradaAlternativa({ aoAbrir }: { aoAbrir: (carta: Card) => void }) {
  const { t, preferencias } = usePreferencias()
  const [estado, setEstado] = useState<Estado>('parado')
  const [mensagem, setMensagem] = useState('')
  const [candidatos, setCandidatos] = useState<string[]>([])
  const reconhecedorRef = useRef<Reconhecedor | null>(null)

  useEffect(() => () => reconhecedorRef.current?.stop(), [])

  async function procurar(textos: string[]) {
    setEstado('procurando')
    setMensagem(`${t.entrada.ouvi(textos[0])} ${t.entrada.procurando}.`)
    try {
      const { nomes, certeza } = await identificarCandidatos(textos)
      if (nomes.length === 0) {
        setEstado('erro')
        setMensagem(`${t.entrada.ouvi(textos[0])} ${t.entrada.naoAchei}`)
        return
      }
      if (certeza) {
        aoAbrir(await buscarCarta(nomes[0], preferencias.idioma))
        return
      }
      setCandidatos(nomes)
      setEstado('confirmar')
      setMensagem('')
    } catch (erro) {
      setEstado('erro')
      setMensagem(erro instanceof SemConexao ? t.buscar.semInternet : t.entrada.naoAchei)
    }
  }

  function ouvir() {
    if (estado === 'ouvindo') {
      reconhecedorRef.current?.stop()
      return
    }
    const Construtor = construtorDeVoz()
    if (!Construtor) {
      setEstado('erro')
      setMensagem(t.entrada.semVoz)
      return
    }
    const reconhecedor = new Construtor()
    reconhecedor.lang = preferencias.idioma === 'pt' ? 'pt-BR' : 'en-US'
    reconhecedor.maxAlternatives = 3
    reconhecedor.interimResults = false
    let ouviuAlgo = false
    reconhecedor.onresult = (evento) => {
      const alternativas = Array.from(evento.results[0] ?? [], (alternativa) => alternativa.transcript.trim())
      const textos = alternativas.filter(Boolean)
      if (textos.length === 0) return
      ouviuAlgo = true
      procurar(textos)
    }
    reconhecedor.onerror = (evento) => {
      ouviuAlgo = true
      setEstado('erro')
      setMensagem(evento.error === 'not-allowed' || evento.error === 'service-not-allowed' ? t.entrada.vozNegada : t.entrada.naoEntendi)
    }
    reconhecedor.onend = () => {
      reconhecedorRef.current = null
      if (!ouviuAlgo) {
        setEstado('erro')
        setMensagem(t.entrada.naoEntendi)
      }
    }
    reconhecedorRef.current = reconhecedor
    setCandidatos([])
    setEstado('ouvindo')
    setMensagem(t.entrada.ouvindo)
    reconhecedor.start()
  }

  function recomecar() {
    setCandidatos([])
    setEstado('parado')
    setMensagem('')
  }

  const ouvindo = estado === 'ouvindo'

  return (
    <div className="entrada">
      <div className="entrada__botoes">
        <button
          type="button"
          className={ouvindo ? 'botao-entrada botao-entrada--ativo' : 'botao-entrada'}
          onClick={ouvir}
        >
          <Icone nome="microfone" />
          <span>{ouvindo ? t.entrada.parar : t.entrada.falar}</span>
        </button>
        <a className="botao-entrada" href="#camera">
          <Icone nome="camera" />
          <span>{t.entrada.escanear}</span>
        </a>
      </div>
      <p role="status" aria-live="polite" className={estado === 'erro' ? 'aviso erro entrada__status' : 'legenda entrada__status'}>
        {mensagem}
      </p>
      {estado === 'confirmar' && (
        <ConfirmarCarta key={candidatos.join('|')} candidatos={candidatos} aoAbrir={aoAbrir} aoRecomecar={recomecar} />
      )}
    </div>
  )
}
