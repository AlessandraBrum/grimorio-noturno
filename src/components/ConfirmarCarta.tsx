import { useEffect, useRef, useState } from 'react'
import { buscarCarta, SemConexao, ServicoDeCartasIndisponivel } from '../api/scryfall'
import { usePreferencias } from '../contexto/usePreferencias'
import type { Card } from '../types/card'
import { Icone } from './Icone'

interface Props {
  candidatos: string[]
  aoAbrir: (carta: Card) => void
  aoRecomecar: () => void
}

export function ConfirmarCarta({ candidatos, aoAbrir, aoRecomecar }: Props) {
  const { t, preferencias } = usePreferencias()
  const [escolhido, setEscolhido] = useState(candidatos[0])
  const [carta, setCarta] = useState<Card | null>(null)
  const [erroBusca, setErroBusca] = useState('')
  const tituloRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    let ativo = true
    buscarCarta(escolhido, preferencias.idioma)
      .then((encontrada) => {
        if (!ativo) return
        setCarta(encontrada)
        setErroBusca('')
      })
      .catch((erro) => {
        if (ativo) setErroBusca(erro instanceof SemConexao ? t.buscar.semInternet
          : erro instanceof ServicoDeCartasIndisponivel ? t.buscar.servicoIndisponivel : t.entrada.naoAchei)
      })
    return () => {
      ativo = false
    }
  }, [escolhido, preferencias.idioma, t])

  useEffect(() => {
    tituloRef.current?.focus()
  }, [escolhido])

  const outros = candidatos.filter((nome) => nome !== escolhido)
  const nome = carta ? carta.printedName ?? carta.name : escolhido

  return (
    <section className="painel confirmar" aria-labelledby="titulo-confirmar">
      <h2 id="titulo-confirmar" ref={tituloRef} tabIndex={-1} className="confirmar__titulo">
        {t.entrada.confirmar}
      </h2>
      {erroBusca && <p className="aviso erro" role="status">{erroBusca}</p>}
      {!erroBusca && (
        <div className="confirmar__carta">
          {carta?.imageUrl ? (
            <img className="confirmar__imagem" src={carta.imageUrl} alt={t.carta.imagem(nome)} width={146} height={204} />
          ) : (
            <div className="confirmar__imagem confirmar__imagem--vazia" aria-hidden="true" />
          )}
          <p className="confirmar__nome" lang={carta?.lang === 'pt' ? 'pt-BR' : 'en'} aria-live="polite">
            {carta ? nome : t.entrada.procurando}
          </p>
        </div>
      )}
      <div className="confirmar__acoes">
        <button type="button" className="botao-principal" disabled={!carta || !!erroBusca} onClick={() => carta && aoAbrir(carta)}>
          <Icone nome="check" tamanho={20} />
          {t.entrada.sim}
        </button>
        <button type="button" className="botao-secundario" onClick={aoRecomecar}>
          {t.entrada.outra}
        </button>
      </div>
      {outros.length > 0 && (
        <div className="confirmar__outros">
          <p className="legenda">{t.entrada.talvez}</p>
          <ul className="lista-chips">
            {outros.map((outro) => (
              <li key={outro}>
                <button type="button" className="chip" lang="en" onClick={() => {
                  setCarta(null)
                  setErroBusca('')
                  setEscolhido(outro)
                }}>
                  {outro}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
