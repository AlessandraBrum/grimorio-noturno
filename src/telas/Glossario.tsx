import { useState } from 'react'
import { FimDeSecao } from '../components/SetaTopo'
import { usePreferencias } from '../contexto/usePreferencias'
import { GLOSSARIO } from '../data/glossario'

function semAcento(texto: string) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export function Glossario() {
  const { t, preferencias } = usePreferencias()
  const idioma = preferencias.idioma
  const [filtro, setFiltro] = useState('')

  const procurado = semAcento(filtro.trim())
  const termos = GLOSSARIO.filter(
    (termo) => !procurado || semAcento(termo.nome[idioma]).includes(procurado) || semAcento(termo.original).includes(procurado),
  ).sort((a, b) => a.nome[idioma].localeCompare(b.nome[idioma], idioma))

  return (
    <div className="tela">
      <div className="tela__topo">
        <h1 id="titulo-tela" tabIndex={-1} className="titulo-tela">
          {t.glossario.titulo}
        </h1>
        <p className="texto-apoio">{t.glossario.apoio}</p>
      </div>

      <div className="campo">
        <label htmlFor="filtro-glossario" className="campo__rotulo">
          {t.glossario.procurar}
        </label>
        <input
          id="filtro-glossario"
          className="campo__entrada"
          type="search"
          placeholder={t.glossario.exemplo}
          value={filtro}
          onChange={(evento) => setFiltro(evento.target.value)}
        />
      </div>

      <p role="status" className="visualmente-oculto">
        {termos.length === 0 ? t.glossario.nenhum : ''}
      </p>

      {termos.length === 0 ? (
        <p className="texto-apoio">{t.glossario.nenhum}</p>
      ) : (
        <dl className="lista-termos">
          {termos.map((termo) => (
            <div key={termo.id} className="cartao">
              <dt className="termo__nome">
                {termo.nome[idioma]}{' '}
                {idioma === 'pt' && (
                  <span lang="en" className="termo__original">
                    {termo.original}
                  </span>
                )}
              </dt>
              <dd className="termo__definicao">{termo.definicao[idioma]}</dd>
            </div>
          ))}
        </dl>
      )}
      <FimDeSecao />
    </div>
  )
}
