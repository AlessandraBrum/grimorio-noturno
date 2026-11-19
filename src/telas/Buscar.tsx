import { BuscaCarta } from '../components/BuscaCarta'
import { CarrosselRecentes } from '../components/CarrosselRecentes'
import { EntradaAlternativa } from '../components/EntradaAlternativa'
import { FimDeSecao } from '../components/SetaTopo'
import { usePreferencias } from '../contexto/usePreferencias'
import type { Card } from '../types/card'
import { Icone } from '../components/Icone'

export type EstadoBusca = 'parado' | 'carregando' | 'nao-encontrada' | 'sem-internet'

interface Props {
  estado: EstadoBusca
  aoBuscar: (nome: string) => void
  aoAbrirRecente: (carta: Card) => void
}

export function Buscar({ estado, aoBuscar, aoAbrirRecente }: Props) {
  const { t } = usePreferencias()

  return (
    <div className="tela tela--centro">
      <div className="tela__topo">
        <h1 id="titulo-tela" tabIndex={-1} className="titulo-tela">
          {t.buscar.titulo}
        </h1>
        <p className="texto-apoio">{t.buscar.apoio}</p>
      </div>

      <p className="aviso aviso-fone" role="note">
        <Icone nome="fone" tamanho={20} />
        {t.player.avisoFone}
      </p>

      <BuscaCarta aoEscolher={aoBuscar} />
      <EntradaAlternativa aoAbrir={aoAbrirRecente} />

      <div aria-live="polite">
        {estado === 'carregando' && <p className="texto-apoio">{t.buscar.carregando}</p>}
        {estado === 'nao-encontrada' && <p className="aviso erro">{t.buscar.naoEncontrada}</p>}
        {estado === 'sem-internet' && <p className="aviso erro">{t.buscar.semInternet}</p>}
      </div>

      <CarrosselRecentes aoAbrir={aoAbrirRecente} />
      <FimDeSecao />
    </div>
  )
}
