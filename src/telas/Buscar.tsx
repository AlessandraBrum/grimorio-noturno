import { useState } from 'react'
import { BuscaCarta } from '../components/BuscaCarta'
import { CarrosselRecentes } from '../components/CarrosselRecentes'
import { EntradaAlternativa } from '../components/EntradaAlternativa'
import { FimDeSecao } from '../components/SetaTopo'
import { usePreferencias } from '../contexto/usePreferencias'
import type { Card } from '../types/card'
import { Icone } from '../components/Icone'
import { InstalarApp } from '../components/InstalarApp'
import { gravar, ler } from '../contexto/armazenamento'

const INTERVALO_AVISO_FONE = 15

let acessoAtual: number | null = null

function contarAcesso() {
  if (acessoAtual === null) {
    const { total } = ler('acessos', { total: 0 })
    acessoAtual = (Number.isFinite(total) && total > 0 ? total : 0) + 1
    gravar('acessos', { total: acessoAtual })
  }
  return acessoAtual
}

function deveMostrarAvisoFone() {
  return (contarAcesso() - 1) % INTERVALO_AVISO_FONE === 0
}

function ehPrimeiroAcesso() {
  return contarAcesso() === 1
}

export type EstadoBusca = 'parado' | 'carregando' | 'nao-encontrada' | 'sem-internet' | 'servico-indisponivel'

interface Props {
  estado: EstadoBusca
  aoBuscar: (nome: string) => void
  aoAbrirRecente: (carta: Card) => void
}

export function Buscar({ estado, aoBuscar, aoAbrirRecente }: Props) {
  const { t } = usePreferencias()
  const [avisoFone] = useState(deveMostrarAvisoFone)
  const [primeiroAcesso] = useState(ehPrimeiroAcesso)

  return (
    <div className="tela tela--centro">
      <div className="tela__topo">
        <h1 id="titulo-tela" tabIndex={-1} className="titulo-tela">
          {t.buscar.titulo}
        </h1>
        <p className="texto-apoio">{t.buscar.apoio}</p>
      </div>

      {avisoFone && (
        <p className="aviso aviso-fone" role="note">
          <Icone nome="fone" tamanho={20} />
          {t.player.avisoFone}
        </p>
      )}

      <BuscaCarta aoEscolher={aoBuscar} />
      <EntradaAlternativa aoAbrir={aoAbrirRecente} />

      <div aria-live="polite">
        {estado === 'carregando' && <p className="texto-apoio">{t.buscar.carregando}</p>}
        {estado === 'nao-encontrada' && <p className="aviso erro">{t.buscar.naoEncontrada}</p>}
        {estado === 'sem-internet' && <p className="aviso erro">{t.buscar.semInternet}</p>}
        {estado === 'servico-indisponivel' && <p className="aviso erro">{t.buscar.servicoIndisponivel}</p>}
      </div>

      {primeiroAcesso && <InstalarApp />}

      <CarrosselRecentes aoAbrir={aoAbrirRecente} />
      <FimDeSecao />
    </div>
  )
}
