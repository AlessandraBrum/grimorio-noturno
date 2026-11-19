import { useEffect, useState } from 'react'

export type EstadoLeitura = 'parado' | 'lendo' | 'pausado'

export function useLeitura() {
  const disponivel = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [estado, setEstado] = useState<EstadoLeitura>('parado')
  const [velocidade, setVelocidade] = useState(1)

  useEffect(() => {
    return () => {
      if (disponivel) window.speechSynthesis.cancel()
    }
  }, [disponivel])

  function ler(texto: string, idioma: string) {
    if (!disponivel) return
    window.speechSynthesis.cancel()
    const fala = new SpeechSynthesisUtterance(texto)
    fala.lang = idioma
    fala.rate = velocidade
    fala.onend = () => setEstado('parado')
    fala.onerror = () => setEstado('parado')
    window.speechSynthesis.speak(fala)
    setEstado('lendo')
  }

  function pausar() {
    if (!disponivel) return
    window.speechSynthesis.pause()
    setEstado('pausado')
  }

  function continuar() {
    if (!disponivel) return
    window.speechSynthesis.resume()
    setEstado('lendo')
  }

  function parar() {
    if (!disponivel) return
    window.speechSynthesis.cancel()
    setEstado('parado')
  }

  return { disponivel, estado, velocidade, setVelocidade, ler, pausar, continuar, parar }
}
