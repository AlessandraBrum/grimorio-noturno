import { useEffect, useRef, useState } from 'react'
import { usePreferencias } from '../contexto/usePreferencias'

export type EstadoLeitura = 'parado' | 'lendo' | 'pausado'

export const VELOCIDADE_MINIMA = 0.5
export const VELOCIDADE_MAXIMA = 10

interface Trecho {
  inicio: number
  texto: string
}

function dividirEmTrechos(texto: string): Trecho[] {
  const trechos: Trecho[] = []
  const padrao = /[^.!?;:\n]+[.!?;:\n]*\s*/g
  let encontrado: RegExpExecArray | null
  while ((encontrado = padrao.exec(texto)) !== null) {
    if (encontrado[0].trim()) trechos.push({ inicio: encontrado.index, texto: encontrado[0] })
  }
  return trechos
}

function limitar(velocidade: number) {
  if (!Number.isFinite(velocidade)) return 1
  return Math.min(VELOCIDADE_MAXIMA, Math.max(VELOCIDADE_MINIMA, velocidade))
}

export function useLeitura() {
  const disponivel = typeof window !== 'undefined' && 'speechSynthesis' in window
  const { preferencias, mudar } = usePreferencias()
  const velocidade = limitar(preferencias.velocidade)
  const [estado, setEstado] = useState<EstadoLeitura>('parado')

  const textoRef = useRef('')
  const idiomaRef = useRef('')
  const posicaoRef = useRef(0)
  const geracaoRef = useRef(0)
  const velocidadeRef = useRef(velocidade)
  const estadoRef = useRef<EstadoLeitura>('parado')

  useEffect(() => {
    velocidadeRef.current = velocidade
  }, [velocidade])

  function mudarEstado(novo: EstadoLeitura) {
    estadoRef.current = novo
    setEstado(novo)
  }

  useEffect(() => {
    return () => {
      geracaoRef.current += 1
      if (disponivel) window.speechSynthesis.cancel()
    }
  }, [disponivel])

  function falarAPartirDe(posicao: number) {
    const geracao = ++geracaoRef.current
    window.speechSynthesis.cancel()

    const restante = textoRef.current.slice(posicao)
    const trechos = dividirEmTrechos(restante).map((trecho) => ({
      inicio: posicao + trecho.inicio,
      texto: trecho.texto,
    }))

    if (trechos.length === 0) {
      posicaoRef.current = 0
      mudarEstado('parado')
      return
    }

    trechos.forEach((trecho, indice) => {
      const fala = new SpeechSynthesisUtterance(trecho.texto)
      fala.lang = idiomaRef.current
      fala.rate = velocidadeRef.current
      fala.onstart = () => {
        if (geracao === geracaoRef.current) posicaoRef.current = trecho.inicio
      }
      fala.onboundary = (evento) => {
        if (geracao === geracaoRef.current) posicaoRef.current = trecho.inicio + evento.charIndex
      }
      fala.onend = () => {
        if (geracao !== geracaoRef.current) return
        if (indice === trechos.length - 1) {
          posicaoRef.current = 0
          mudarEstado('parado')
        }
      }
      fala.onerror = () => {
        if (geracao !== geracaoRef.current) return
        posicaoRef.current = 0
        mudarEstado('parado')
      }
      window.speechSynthesis.speak(fala)
    })

    mudarEstado('lendo')
  }

  function ler(texto: string, idioma: string) {
    if (!disponivel) return
    textoRef.current = texto
    idiomaRef.current = idioma
    posicaoRef.current = 0
    falarAPartirDe(0)
  }

  function pausar() {
    if (!disponivel || estadoRef.current !== 'lendo') return
    geracaoRef.current += 1
    window.speechSynthesis.cancel()
    mudarEstado('pausado')
  }

  function continuar() {
    if (!disponivel || estadoRef.current !== 'pausado') return
    falarAPartirDe(posicaoRef.current)
  }

  function parar() {
    if (!disponivel) return
    geracaoRef.current += 1
    window.speechSynthesis.cancel()
    posicaoRef.current = 0
    mudarEstado('parado')
  }

  function setVelocidade(nova: number) {
    const valor = limitar(nova)
    velocidadeRef.current = valor
    mudar('velocidade', valor)
    if (disponivel && estadoRef.current === 'lendo') falarAPartirDe(posicaoRef.current)
  }

  return { disponivel, estado, velocidade, setVelocidade, ler, pausar, continuar, parar }
}
