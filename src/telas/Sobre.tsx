import { useState } from 'react'
import { FimDeSecao } from '../components/SetaTopo'
import { usePreferencias } from '../contexto/usePreferencias'

const PORTFOLIO = 'https://alessandrabrum.com/'
const LUNA_SOFTWARES = ''

const LINKS_DA_AUTORA = [
  { chave: 'portfolio', href: PORTFOLIO },
  { chave: 'linkedin', href: 'https://linkedin.com/in/AlessandraBrum' },
  { chave: 'github', href: 'https://github.com/AlessandraBrum' },
  { chave: 'lunaSite', href: LUNA_SOFTWARES },
] as const

const EMAIL_DE_CONTATO = 'alessandrabrumcontato@gmail.com'

function LinkExterno({ href, texto, aviso, className }: { href: string; texto: string; aviso: string; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {texto}
      <span className="visualmente-oculto"> {aviso}</span>
    </a>
  )
}

export function Sobre() {
  const { t, apagarDados } = usePreferencias()
  const s = t.sobre
  const [apagado, setApagado] = useState(false)

  return (
    <div className="tela">
      <div className="tela__topo">
        <h1 id="titulo-tela" tabIndex={-1} className="titulo-tela">
          {s.titulo}
        </h1>
      </div>

      <section className="cartao" aria-labelledby="sobre-app">
        <h2 id="sobre-app" className="titulo-secao">{s.oQueE}</h2>
        <p>{s.oQueETexto}</p>
      </section>

      <section className="cartao" aria-labelledby="sobre-aparelhos">
        <h2 id="sobre-aparelhos" className="titulo-secao">{s.aparelhos}</h2>
        <p>{s.aparelhosTexto}</p>
        <ul>
          {s.aparelhosItens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="texto-apoio">{s.aparelhosTestes}</p>
      </section>

      <section className="cartao" aria-labelledby="sobre-luna">
        <h2 id="sobre-luna" className="titulo-secao">{s.luna}</h2>
        <p>{s.lunaTexto}</p>
        <ul className="lista-links">
          <li>
            <LinkExterno href="https://magicluna.alessandrabrum.com/" texto="Magic Luna" aviso={s.novaAba} />
          </li>
          <li>
            <span className="texto-apoio">{s.lunaLinktree}</span>
          </li>
        </ul>
      </section>
      <FimDeSecao />

      <section className="cartao" aria-labelledby="sobre-privacidade">
        <h2 id="sobre-privacidade" className="titulo-secao">{s.privacidade}</h2>
        <ul>
          {s.privacidadeItens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <LinkExterno href="https://scryfall.com/docs/privacy" texto={s.politicaScryfall} aviso={s.novaAba} />
        <p>
          {s.contato}: <span className="quebra-livre">{EMAIL_DE_CONTATO}</span>
        </p>
        <div>
          <button
            type="button"
            className="botao-secundario"
            onClick={() => {
              apagarDados()
              setApagado(true)
            }}
          >
            {s.apagar}
          </button>
        </div>
        <p role="status">{apagado ? s.apagado : ''}</p>
      </section>
      <FimDeSecao />

      <section className="cartao" aria-labelledby="sobre-autora">
        <h2 id="sobre-autora" className="titulo-secao">{s.autora}</h2>
        <p>
          <LinkExterno href={PORTFOLIO} texto={s.autoraNome} aviso={s.novaAba} />
          {s.autoraTexto}
        </p>
        <ul className="botoes-links">
          {LINKS_DA_AUTORA.filter((link) => link.href).map((link) => (
            <li key={link.chave}>
              <LinkExterno href={link.href} texto={s[link.chave]} aviso={s.novaAba} className="botao-link" />
            </li>
          ))}
        </ul>
      </section>

      <section className="cartao" aria-labelledby="sobre-aviso">
        <h2 id="sobre-aviso" className="titulo-secao">{s.aviso}</h2>
        <p>{t.rodape.aviso}</p>
      </section>
      <FimDeSecao />
    </div>
  )
}
