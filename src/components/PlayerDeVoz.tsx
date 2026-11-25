import { useEffect, useRef, useState } from 'react'
import { usePreferencias } from '../contexto/usePreferencias'
import { useLeitura, VELOCIDADE_MAXIMA, VELOCIDADE_MINIMA } from '../hooks/useLeitura'
import { Icone } from './Icone'

const VELOCIDADES = [0.5, 1, 1.5, 2, 3, 5, 10]

export function PlayerDeVoz({ texto, idiomaDaFala }: { texto: string; idiomaDaFala: string }) {
  const { t, preferencias, mudar } = usePreferencias()
  const leitura = useLeitura()
  const [velocidadeAnunciada, setVelocidadeAnunciada] = useState('')

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

  function mudarVelocidade(sentido: 1 | -1) {
    const proxima = sentido > 0
      ? VELOCIDADES.find((opcao) => opcao > leitura.velocidade)
      : [...VELOCIDADES].reverse().find((opcao) => opcao < leitura.velocidade)
    if (proxima === undefined) {
      setVelocidadeAnunciada(sentido > 0 ? t.player.velocidadeNoMaximo : t.player.velocidadeNoMinimo)
      return
    }
    leitura.setVelocidade(proxima)
    setVelocidadeAnunciada(t.player.velocidadeFalada(proxima))
  }

  function alternarSom() {
    if (preferencias.lerSozinho) leitura.parar()
    mudar('lerSozinho', !preferencias.lerSozinho)
  }

  const rotuloPrincipal = lendo ? t.player.pausar : pausado ? t.player.continuar : t.player.ler
  const estadoFalado = lendo ? t.player.lendo : pausado ? t.player.pausado : t.player.ler

  return (
    <section className="player" aria-label={t.player.regiao}>
      <button
        type="button"
        className="botao-redondo player__mais-lento"
        aria-label={t.player.maisLento}
        title={t.player.maisLento}
        onClick={() => mudarVelocidade(-1)}
      >
        <Icone nome="maisLento" tamanho={22} />
      </button>
      <div className="player__painel">
        <p className="player__estado" role="status">
          {estadoFalado}
        </p>
        <p className="player__velocidade">
          {t.player.velocidade} <strong>{t.player.velocidadeCurta(leitura.velocidade)}</strong>
        </p>
      </div>
      <button
        type="button"
        className="botao-redondo player__mais-rapido"
        aria-label={t.player.maisRapido}
        title={t.player.maisRapido}
        onClick={() => mudarVelocidade(1)}
      >
        <Icone nome="maisRapido" tamanho={22} />
      </button>
      <input
        className="player__deslize"
        type="range"
        min={VELOCIDADE_MINIMA}
        max={VELOCIDADE_MAXIMA}
        step={0.5}
        value={leitura.velocidade}
        aria-label={t.player.velocidade}
        aria-valuetext={t.player.velocidadeFalada(leitura.velocidade)}
        onChange={(evento) => leitura.setVelocidade(Number(evento.target.value))}
      />
      <span className="visualmente-oculto" role="status">
        {velocidadeAnunciada}
      </span>
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
      <button type="button" className="player__principal" aria-label={rotuloPrincipal} onClick={aoApertar}>
        <Icone nome={lendo ? 'pausar' : 'tocar'} tamanho={24} />
      </button>
    </section>
  )
}
