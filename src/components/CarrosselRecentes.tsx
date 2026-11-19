import { useRef } from 'react'
import { usePreferencias } from '../contexto/usePreferencias'
import type { Card } from '../types/card'
import { Icone } from './Icone'

export function CarrosselRecentes({ aoAbrir }: { aoAbrir: (carta: Card) => void }) {
  const { t, recentes } = usePreferencias()
  const trilhoRef = useRef<HTMLUListElement>(null)

  function rolar(direcao: 1 | -1) {
    const trilho = trilhoRef.current
    if (trilho) trilho.scrollBy({ left: direcao * trilho.clientWidth * 0.8 })
  }

  return (
    <section className="painel carrossel" aria-labelledby="titulo-recentes">
      <div className="carrossel__topo">
        <div>
          <h2 id="titulo-recentes" className="titulo-secao">
            {t.buscar.recentes}
          </h2>
          <p className="legenda">{t.buscar.recentesApoio}</p>
        </div>
        {recentes.length > 2 && (
          <div className="carrossel__controles">
            <button type="button" className="botao-redondo" aria-label={t.buscar.anteriores} onClick={() => rolar(-1)}>
              <Icone nome="esquerda" tamanho={20} />
            </button>
            <button type="button" className="botao-redondo" aria-label={t.buscar.proximas} onClick={() => rolar(1)}>
              <Icone nome="direita" tamanho={20} />
            </button>
          </div>
        )}
      </div>
      {recentes.length === 0 ? (
        <p className="texto-apoio">{t.buscar.semRecentes}</p>
      ) : (
        <ul ref={trilhoRef} className="carrossel__trilho">
          {recentes.map((carta) => (
            <li key={carta.id} className="carrossel__item">
              <a
                className="carrossel__link"
                href="#carta"
                onClick={(evento) => {
                  evento.preventDefault()
                  aoAbrir(carta)
                }}
              >
                {carta.imageUrl ? (
                  <img className="carrossel__imagem" src={carta.imageUrl} alt="" loading="lazy" />
                ) : (
                  <span className="carrossel__imagem" />
                )}
                <span lang={carta.lang === 'pt' ? 'pt-BR' : 'en'}>{carta.printedName ?? carta.name}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
