import type { RefObject } from 'react'
import { usePreferencias } from '../contexto/usePreferencias'
import type { Tela } from '../navegacao'
import { Icone } from './Icone'
import { Navegacao } from './Navegacao'

interface Props {
  tela: Tela
  ajustesAbertos: boolean
  aoAbrirAjustes: () => void
  botaoAjustesRef: RefObject<HTMLButtonElement | null>
}

export function Cabecalho({ tela, ajustesAbertos, aoAbrirAjustes, botaoAjustesRef }: Props) {
  const { t } = usePreferencias()
  const telaInicial = tela === 'buscar'
  const voltar =
    tela === 'carta'
      ? { href: '#buscar', rotulo: t.carta.voltar }
      : tela === 'sobre'
        ? { href: '#ajuda', rotulo: t.ajuda.voltarParaAjuda }
        : null
  const tituloCelular = tela === 'carta' ? t.carta.titulo : t.abas[tela]

  return (
    <header className="cabecalho">
      <div className="limite cabecalho__linha">
        <div className={telaInicial ? 'marca' : 'marca marca--so-desktop'}>
          <Icone nome="lua" tamanho={28} className="marca__lua" />
          <div>
            <p className="marca__nome">Grimório Noturno</p>
            <p className="marca__assinatura">{t.assinatura}</p>
          </div>
        </div>
        {!telaInicial && (
          <div className="cabecalho__celular">
            {voltar && (
              <a className="botao-icone" href={voltar.href} aria-label={voltar.rotulo}>
                <Icone nome="esquerda" />
              </a>
            )}
            <p className="cabecalho__titulo">{tituloCelular}</p>
          </div>
        )}
        <Navegacao tela={tela} />
        <button
          ref={botaoAjustesRef}
          type="button"
          className="botao-icone"
          aria-expanded={ajustesAbertos}
          aria-controls="painel-ajustes"
          aria-label={t.abrirAjustes}
          onClick={aoAbrirAjustes}
        >
          <Icone nome="menu" />
          <span className="botao-icone__rotulo" aria-hidden="true">
            {t.ajustes}
          </span>
        </button>
      </div>
    </header>
  )
}
