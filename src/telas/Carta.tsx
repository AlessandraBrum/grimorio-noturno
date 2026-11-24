import { Icone } from '../components/Icone'
import { PlayerDeVoz } from '../components/PlayerDeVoz'
import { FimDeSecao } from '../components/SetaTopo'
import { usePreferencias } from '../contexto/usePreferencias'
import { termosDaCarta } from '../data/glossario'
import { CONTATO } from '../i18n/contato'
import { TEXTOS } from '../i18n/textos'
import type { Card } from '../types/card'
import { custoEmPalavras } from '../utils/custoDeMana'

export function Carta({ carta, aoReportar }: { carta: Card; aoReportar: () => void }) {
  const { t, preferencias } = usePreferencias()
  const idioma = preferencias.idioma
  const emPortugues = carta.lang === 'pt'
  const nome = carta.printedName ?? carta.name
  const tipo = carta.printedTypeLine ?? carta.typeLine
  const textosDaCarta = TEXTOS[carta.lang].carta
  const texto = (emPortugues ? carta.printedText : carta.oracleText) || textosDaCarta.semTexto
  const custo = custoEmPalavras(carta.manaCost, idioma)
  const temForca = carta.power !== undefined && carta.toughness !== undefined
  const termos = termosDaCarta(carta.keywords)
  const simbolos = carta.manaCost.match(/\{[^}]+\}/g)?.map((s) => s.slice(1, -1)) ?? []
  const langDaCarta = emPortugues ? 'pt-BR' : 'en'

  const textoParaLer = [
    nome,
    tipo,
    `${textosDaCarta.custo}: ${custoEmPalavras(carta.manaCost, carta.lang)}`,
    texto,
    temForca ? textosDaCarta.forca(carta.power!, carta.toughness!) : '',
  ]
    .filter(Boolean)
    .join('. ')

  return (
    <div className="tela">
      <a href="#buscar" className="link-voltar">
        <Icone nome="esquerda" tamanho={18} />
        {t.carta.voltar}
      </a>

      <div className="carta">
        <div className="carta__cabeca">
          <h1 id="titulo-tela" tabIndex={-1} className="carta__nome" lang={langDaCarta}>
            {nome}
          </h1>
          <p className="texto-apoio" lang={langDaCarta}>
            {tipo}
          </p>
        </div>

        <figure className="carta__figura">
          {carta.imageUrl && <img className="carta__imagem" src={carta.imageUrl} alt={t.carta.imagem(nome)} />}
          <figcaption className="legenda">
            {t.carta.ilustracao}: {carta.artist} · ™ &amp; © Wizards of the Coast
          </figcaption>
        </figure>

        <div className="carta__player">
          <PlayerDeVoz texto={textoParaLer} idiomaDaFala={langDaCarta} />
        </div>

        <div className="carta__texto">
          {idioma === 'pt' && !emPortugues && (
            <p className="aviso" role="note">
              <Icone nome="lua" tamanho={20} />
              <span>{t.carta.emIngles}</span>
            </p>
          )}

          <section className="ficha" aria-labelledby="titulo-versao-texto">
            <h2 id="titulo-versao-texto" className="ficha__titulo">
              {t.carta.versaoTexto}
            </h2>
            <dl className="ficha__lista">
              <div className="ficha__linha">
                <dt className="ficha__termo">{t.carta.custo}</dt>
                <dd className="ficha__valor ficha__custo">
                  <span>{custo}</span>
                  {simbolos.length > 0 && (
                    <span className="simbolos" aria-hidden="true">
                      {simbolos.map((simbolo, indice) => (
                        <img
                          key={indice}
                          className="simbolos__item"
                          src={`https://svgs.scryfall.io/card-symbols/${encodeURIComponent(simbolo.replace('/', ''))}.svg`}
                          alt=""
                          width={24}
                          height={24}
                        />
                      ))}
                    </span>
                  )}
                </dd>
              </div>
              <div className="ficha__linha">
                <dt className="ficha__termo">{t.carta.efeito}</dt>
                <dd className="ficha__valor" lang={langDaCarta}>
                  {texto}
                </dd>
                {termos.length > 0 && (
                  <dd className="ficha__chips">
                    <ul className="lista-chips">
                      {termos.map((termo) => (
                        <li key={termo.id}>
                          <a className="chip" href={`#glossario`}>
                            {t.carta.oQueE(termo.nome[idioma])}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </dd>
                )}
              </div>
              {temForca && (
                <div className="ficha__linha">
                  <dt className="ficha__termo">{t.carta.forcaRotulo}</dt>
                  <dd className="ficha__valor">
                    <span aria-hidden="true">{carta.power}/{carta.toughness}</span>
                    <span className="visualmente-oculto">{t.carta.forca(carta.power!, carta.toughness!)}</span>
                  </dd>
                </div>
              )}
              <div className="ficha__linha">
                <dt className="ficha__termo">{t.carta.colecao}</dt>
                <dd className="ficha__valor">
                  {carta.setName} · {carta.rarity}
                </dd>
              </div>
            </dl>
          </section>

          <button type="button" className="botao-secundario" onClick={aoReportar}>{CONTATO[idioma].relatar}</button>
          <a href="#leitura">{t.carta.ajustarLeitura}</a>
          <a href="#camera" className="botao-principal">
            <Icone nome="camera" tamanho={20} />
            {t.carta.escanearOutra}
          </a>
        </div>
      </div>
      <FimDeSecao />
    </div>
  )
}
