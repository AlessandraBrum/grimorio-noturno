import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { sugerirNomes } from '../api/scryfall'
import { usePreferencias } from '../contexto/usePreferencias'
import { Icone } from './Icone'

const ESPERA_DIGITACAO_MS = 300

export function BuscaCarta({ aoEscolher }: { aoEscolher: (nome: string) => void }) {
  const { t } = usePreferencias()
  const id = useId()
  const [texto, setTexto] = useState('')
  const [sugestoes, setSugestoes] = useState<string[]>([])
  const [aberta, setAberta] = useState(false)
  const [ativa, setAtiva] = useState(-1)

  useEffect(() => {
    if (texto.trim().length < 2) return
    const controle = new AbortController()
    const espera = setTimeout(() => {
      sugerirNomes(texto, controle.signal)
        .then((nomes) => {
          if (controle.signal.aborted) return
          setSugestoes(nomes)
          setAberta(true)
          setAtiva(-1)
        })
        .catch(() => {
          if (!controle.signal.aborted) setSugestoes([])
        })
    }, ESPERA_DIGITACAO_MS)
    return () => {
      clearTimeout(espera)
      controle.abort()
    }
  }, [texto])

  function alterarTexto(valor: string) {
    setTexto(valor)
    setSugestoes([])
    setAberta(false)
    setAtiva(-1)
  }

  function escolher(nome: string) {
    setTexto(nome)
    setAberta(false)
    aoEscolher(nome)
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      setAberta(true)
      setAtiva((atual) => Math.min(atual + 1, sugestoes.length - 1))
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      setAtiva((atual) => Math.max(atual - 1, 0))
    } else if (evento.key === 'Enter') {
      evento.preventDefault()
      const nome = mostrarLista && ativa >= 0 ? sugestoes[ativa] : texto.trim()
      if (nome) escolher(nome)
    } else if (evento.key === 'Escape') {
      setAberta(false)
      setAtiva(-1)
    }
  }

  const textoCurto = texto.trim().length < 2
  const sugestoesVisiveis = textoCurto ? [] : sugestoes
  const mostrarLista = aberta && sugestoesVisiveis.length > 0
  const idLista = `${id}-lista`

  return (
    <form role="search" className="painel" onSubmit={(evento) => evento.preventDefault()}>
      <label htmlFor="nome-da-carta" className="campo__rotulo">
        {t.buscar.rotulo}
      </label>
      <div className="busca__linha">
        <input
          id="nome-da-carta"
          className="busca__entrada"
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-expanded={mostrarLista}
          aria-controls={idLista}
          aria-activedescendant={mostrarLista && ativa >= 0 ? `${id}-opcao-${ativa}` : undefined}
          value={texto}
          onChange={(evento) => alterarTexto(evento.target.value)}
          onKeyDown={aoTeclar}
        />
        {texto && (
          <button
            type="button"
            className="botao-redondo"
            aria-label={t.buscar.limpar}
            onClick={() => {
              alterarTexto('')
              document.getElementById('nome-da-carta')?.focus()
            }}
          >
            <Icone nome="fechar" tamanho={20} />
          </button>
        )}
      </div>
      <ul id={idLista} role="listbox" aria-label={t.buscar.sugestoes} className="busca__sugestoes" hidden={!mostrarLista}>
        {sugestoesVisiveis.map((nome, indice) => (
          <li
            key={nome}
            id={`${id}-opcao-${indice}`}
            role="option"
            lang="en"
            aria-selected={indice === ativa}
            className="busca__opcao"
            onMouseDown={(evento) => evento.preventDefault()}
            onClick={() => escolher(nome)}
          >
            {indice === ativa && <Icone nome="estrela" tamanho={16} className="busca__estrela" />}
            {nome}
          </li>
        ))}
      </ul>
      <p role="status" aria-live="polite" className="legenda">
        {textoCurto ? '' : t.buscar.quantas(sugestoesVisiveis.length)}
      </p>
      {mostrarLista && ativa >= 0 && (
        <button type="button" className="botao-principal botao-abrir" onClick={() => escolher(sugestoesVisiveis[ativa])}>
          <Icone nome="estrela" tamanho={20} />
          <span>{t.buscar.abrirNome(sugestoesVisiveis[ativa])}</span>
          <span aria-hidden="true">→</span>
        </button>
      )}
    </form>
  )
}
