import { usePreferencias } from '../contexto/usePreferencias'
import type { Tela } from '../navegacao'
import { Icone } from './Icone'

const ITENS = [
  { tela: 'buscar', icone: 'buscar', soDesktop: false },
  { tela: 'glossario', icone: 'glossario', soDesktop: false },
  { tela: 'leitura', icone: 'leitura', soDesktop: false },
  { tela: 'ajuda', icone: 'ajuda', soDesktop: false },
  { tela: 'sobre', icone: 'sobre', soDesktop: true },
  { tela: 'contato', icone: 'contato', soDesktop: true },
] as const

export function Navegacao({ tela }: { tela: Tela }) {
  const { t } = usePreferencias()
  const telaAtiva = tela === 'carta' ? 'buscar' : tela

  return (
    <nav className="navegacao" aria-label={t.navegacao}>
      <ul className="navegacao__lista">
        {ITENS.map((item) => (
          <li key={item.tela} className={item.soDesktop ? 'navegacao__item--so-desktop' : undefined}>
            <a
              className="navegacao__link"
              href={`#${item.tela}`}
              aria-current={telaAtiva === item.tela ? 'page' : undefined}
            >
              <Icone nome={item.icone} tamanho={24} className="navegacao__icone" />
              {t.abas[item.tela]}
              <span className="navegacao__ponto" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
