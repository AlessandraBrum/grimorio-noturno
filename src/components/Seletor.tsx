import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Icone } from './Icone'

interface Props<T extends string> {
  id: string
  rotulo: string
  vazio: string
  valor: T | ''
  opcoes: Array<{ valor: T; rotulo: string }>
  desativado?: boolean
  invalido?: boolean
  descricao?: string
  aoMudar: (valor: T) => void
}

export function Seletor<T extends string>({ id, rotulo, vazio, valor, opcoes, desativado, invalido, descricao, aoMudar }: Props<T>) {
  const base = useId()
  const idRotulo = `${base}-rotulo`
  const idLista = `${base}-lista`
  const [aberto, setAberto] = useState(false)
  const [ativa, setAtiva] = useState(0)
  const caixaRef = useRef<HTMLDivElement>(null)
  const busca = useRef({ texto: '', ate: 0 })
  const escolhida = opcoes.findIndex((opcao) => opcao.valor === valor)

  useEffect(() => {
    if (!aberto) return
    function aoTocarFora(evento: PointerEvent) {
      if (!caixaRef.current?.contains(evento.target as Node)) setAberto(false)
    }
    document.addEventListener('pointerdown', aoTocarFora)
    return () => document.removeEventListener('pointerdown', aoTocarFora)
  }, [aberto])

  useEffect(() => {
    if (aberto) document.getElementById(`${base}-opcao-${ativa}`)?.scrollIntoView({ block: 'nearest' })
  }, [aberto, ativa, base])

  function abrir(posicao = Math.max(escolhida, 0)) {
    if (desativado) return
    setAtiva(posicao)
    setAberto(true)
  }

  function escolher(posicao: number) {
    aoMudar(opcoes[posicao].valor)
    setAberto(false)
    document.getElementById(id)?.focus()
  }

  function procurar(letra: string) {
    const agora = Date.now()
    busca.current = { texto: (agora < busca.current.ate ? busca.current.texto : '') + letra.toLowerCase(), ate: agora + 600 }
    const inicio = aberto ? ativa + (busca.current.texto.length === 1 ? 1 : 0) : 0
    const ordem = [...opcoes.slice(inicio), ...opcoes.slice(0, inicio)]
    const achada = ordem.find((opcao) => opcao.rotulo.toLowerCase().startsWith(busca.current.texto))
    if (achada) abrir(opcoes.indexOf(achada))
  }

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    const { key, altKey } = evento
    if (!aberto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
        evento.preventDefault()
        abrir()
      } else if (key === 'Home' || key === 'End') {
        evento.preventDefault()
        abrir(key === 'Home' ? 0 : opcoes.length - 1)
      } else if (key.length === 1 && !evento.ctrlKey && !evento.metaKey) {
        procurar(key)
      }
      return
    }
    if (key === 'ArrowDown' && !altKey) {
      evento.preventDefault()
      setAtiva((atual) => Math.min(atual + 1, opcoes.length - 1))
    } else if (key === 'ArrowUp' && !altKey) {
      evento.preventDefault()
      setAtiva((atual) => Math.max(atual - 1, 0))
    } else if (key === 'Home' || key === 'End') {
      evento.preventDefault()
      setAtiva(key === 'Home' ? 0 : opcoes.length - 1)
    } else if (key === 'Enter' || key === ' ' || (key === 'ArrowUp' && altKey)) {
      evento.preventDefault()
      escolher(ativa)
    } else if (key === 'Tab') {
      aoMudar(opcoes[ativa].valor)
      setAberto(false)
    } else if (key === 'Escape') {
      evento.preventDefault()
      setAberto(false)
    } else if (key.length === 1 && !evento.ctrlKey && !evento.metaKey) {
      procurar(key)
    }
  }

  return (
    <div className="seletor" ref={caixaRef}>
      <span id={idRotulo} className="campo__rotulo" onClick={() => document.getElementById(id)?.focus()}>
        {rotulo}
      </span>
      <div
        id={id}
        role="combobox"
        tabIndex={desativado ? -1 : 0}
        className="campo__entrada seletor__caixa"
        aria-labelledby={`${idRotulo} ${id}`}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={idLista}
        aria-activedescendant={aberto ? `${base}-opcao-${ativa}` : undefined}
        aria-disabled={desativado || undefined}
        aria-invalid={invalido || undefined}
        aria-required="true"
        aria-describedby={descricao}
        onClick={() => (aberto ? setAberto(false) : abrir())}
        onKeyDown={aoTeclar}
        onBlur={(evento) => {
          if (!caixaRef.current?.contains(evento.relatedTarget as Node)) setAberto(false)
        }}
      >
        <span className={escolhida < 0 ? 'seletor__vazio' : undefined}>
          {escolhida < 0 ? vazio : opcoes[escolhida].rotulo}
        </span>
        <Icone nome="baixo" tamanho={20} className="seletor__seta" />
      </div>
      <ul id={idLista} role="listbox" aria-labelledby={idRotulo} tabIndex={-1} className="seletor__lista" hidden={!aberto}>
        {opcoes.map((opcao, posicao) => (
          <li
            key={opcao.valor}
            id={`${base}-opcao-${posicao}`}
            role="option"
            aria-selected={posicao === escolhida}
            className={posicao === ativa ? 'seletor__opcao seletor__opcao--ativa' : 'seletor__opcao'}
            onPointerDown={(evento) => evento.preventDefault()}
            onPointerEnter={() => setAtiva(posicao)}
            onClick={() => escolher(posicao)}
          >
            <span>{opcao.rotulo}</span>
            {posicao === escolhida && <Icone nome="check" tamanho={18} />}
          </li>
        ))}
      </ul>
    </div>
  )
}
