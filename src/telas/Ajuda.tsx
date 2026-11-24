import { Icone } from '../components/Icone'
import { FimDeSecao } from '../components/SetaTopo'
import { usePreferencias } from '../contexto/usePreferencias'

export function Ajuda() {
  const { t } = usePreferencias()

  return (
    <div className="tela">
      <div className="tela__topo">
        <h1 id="titulo-tela" tabIndex={-1} className="titulo-tela">
          {t.ajuda.titulo}
        </h1>
        <p className="texto-apoio">{t.ajuda.apoio}</p>
      </div>

      <div className="sanfona">
        {t.ajuda.itens.map(([titulo, texto], indice) => (
          <details name="topicos-da-ajuda" key={titulo} open={indice === 0}>
            <summary>
              <h2 className="titulo-secao">{titulo}</h2>
              <Icone nome="baixo" tamanho={20} className="sanfona__seta" />
            </summary>
            <p className="sanfona__conteudo">{texto}</p>
          </details>
        ))}
      </div>

      <ul className="lista-links ajuda__links">
        <li><a className="botao-principal ajuda__contato" href="#contato">{t.abas.contato}</a></li>
        <li><a href="#sobre">{t.ajuda.sobreLink}</a></li>
      </ul>
      <FimDeSecao />
    </div>
  )
}
