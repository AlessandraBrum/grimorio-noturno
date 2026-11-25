import { useId } from 'react'

interface Props {
  rotulo: string
  ligado: boolean
  textoLigado: string
  textoDesligado: string
  aoMudar: (ligado: boolean) => void
}

export function Interruptor({ rotulo, ligado, textoLigado, textoDesligado, aoMudar }: Props) {
  const id = useId()
  const idDoEstado = useId()

  return (
    <div className="interruptor">
      <div aria-hidden="true">
        <p id={id} className="titulo-secao">
          {rotulo}
        </p>
        <p id={idDoEstado} className="texto-apoio">{ligado ? textoLigado : textoDesligado}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={ligado}
        aria-labelledby={id}
        aria-describedby={idDoEstado}
        className="interruptor__botao"
        onClick={() => aoMudar(!ligado)}
      >
        <span className="interruptor__bolinha" />
      </button>
    </div>
  )
}
