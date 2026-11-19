import { Interruptor } from '../components/Interruptor'
import { Opcoes } from '../components/Opcoes'
import { FimDeSecao } from '../components/SetaTopo'
import { usePreferencias, type Contraste, type Espacamento, type Tamanho } from '../contexto/usePreferencias'
import { custoEmPalavras } from '../utils/custoDeMana'

export function Leitura() {
  const { t, preferencias, mudar } = usePreferencias()
  const l = t.leitura

  return (
    <div className="tela">
      <div className="tela__topo">
        <h1 id="titulo-tela" tabIndex={-1} className="titulo-tela">
          {l.titulo}
        </h1>
        <p className="texto-apoio">{l.apoio}</p>
      </div>

      <div className="cartao" role="group" aria-label={l.previa}>
        <p className="legenda">{l.previa}</p>
        <p className="ficha__valor" lang="en">
          Flying, vigilance
        </p>
        <p className="ficha__valor">
          {t.carta.custo}: {custoEmPalavras('{3}{W}{W}', preferencias.idioma)}
        </p>
      </div>

      <Opcoes<Tamanho>
        legenda={l.tamanho}
        nome="tamanho"
        valor={preferencias.tamanho}
        opcoes={(['normal', 'grande', 'maior', 'enorme'] as const).map((valor) => ({ valor, rotulo: l.tamanhos[valor] }))}
        aoMudar={(valor) => mudar('tamanho', valor)}
      />

      <Opcoes<Espacamento>
        legenda={l.espacamento}
        nome="espacamento"
        valor={preferencias.espacamento}
        opcoes={(['normal', 'amplo', 'extra'] as const).map((valor) => ({ valor, rotulo: l.espacamentos[valor] }))}
        aoMudar={(valor) => mudar('espacamento', valor)}
      />

      <Opcoes<Contraste>
        legenda={l.contraste}
        nome="contraste"
        valor={preferencias.contraste}
        opcoes={(['padrao', 'extra'] as const).map((valor) => ({ valor, rotulo: l.contrastes[valor] }))}
        aoMudar={(valor) => mudar('contraste', valor)}
      />

      <div className="cartao">
        <Interruptor
          rotulo={t.ajustesPainel.animacoes}
          ligado={preferencias.animacoes}
          textoLigado={t.ajustesPainel.ligadas}
          textoDesligado={t.ajustesPainel.desligadas}
          aoMudar={(ligado) => mudar('animacoes', ligado)}
        />
      </div>

      <p className="legenda">{l.salvo}</p>
      <FimDeSecao />
    </div>
  )
}
