import { useEffect, useRef } from 'react'
import { usePreferencias } from '../contexto/usePreferencias'
import { useLeitura } from '../hooks/useLeitura'
import { Icone } from './Icone'

export function PlayerDeVoz({ texto, idiomaDaFala }: { texto: string; idiomaDaFala: string }) {
  const { t, preferencias, mudar } = usePreferencias()
  const leitura = useLeitura()

  function lerAgora() {
    if (!leitura.disponivel) return
    leitura.ler(texto, idiomaDaFala)
  }

  const lerAgoraRef = useRef(lerAgora)

  useEffect(() => {
    lerAgoraRef.current = lerAgora
  })

  useEffect(() => {
    if (preferencias.lerSozinho) lerAgoraRef.current()
  }, [texto, preferencias.lerSozinho])

  if (!leitura.disponivel) {
    return <p className="aviso">{t.player.indisponivel}</p>
  }

  const lendo = leitura.estado === 'lendo'
  const pausado = leitura.estado === 'pausado'

  function aoApertar() {
    if (lendo) leitura.pausar()
    else if (pausado) leitura.continuar()
    else lerAgora()
  }

  function alternarSom() {
    if (preferencias.lerSozinho) leitura.parar()
    mudar('lerSozinho', !preferencias.lerSozinho)
  }

  const rotuloPrincipal = lendo ? t.player.pausar : pausado ? t.player.continuar : t.player.ler
  const estadoFalado = lendo ? t.player.lendo : pausado ? t.player.pausado : t.player.ler

  return (
    <section className="player" aria-label={t.player.regiao}>
      <button type="button" className="player__principal" aria-label={rotuloPrincipal} onClick={aoApertar}>
        <Icone nome={lendo ? 'pausar' : 'tocar'} tamanho={24} />
      </button>
      <p className="player__estado" role="status">
        {estadoFalado}
      </p>
      <div className="player__velocidade">
        <label htmlFor="velocidade">{t.player.velocidade}</label>
        <input
          id="velocidade"
          type="range"
          min={0.5}
          max={2}
          step={0.25}
          value={leitura.velocidade}
          aria-valuetext={t.player.velocidadeFalada(leitura.velocidade)}
          onChange={(evento) => leitura.setVelocidade(Number(evento.target.value))}
        />
        <output htmlFor="velocidade">{leitura.velocidade}x</output>
      </div>
      <button
        type="button"
        className="botao-redondo player__som"
        aria-label={t.player.lerSozinho}
        aria-pressed={preferencias.lerSozinho}
        title={t.player.lerSozinho}
        onClick={alternarSom}
      >
        <Icone nome={preferencias.lerSozinho ? 'som' : 'mudo'} tamanho={20} />
      </button>
      <button
        type="button"
        className="botao-redondo player__parar"
        aria-label={t.player.parar}
        disabled={leitura.estado === 'parado'}
        onClick={leitura.parar}
      >
        <Icone nome="parar" tamanho={18} />
      </button>
    </section>
  )
}
