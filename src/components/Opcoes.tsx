import { Icone } from './Icone'

interface Props<T extends string> {
  legenda: string
  nome: string
  valor: T
  opcoes: Array<{ valor: T; rotulo: string; lang?: string }>
  aoMudar: (valor: T) => void
}

export function Opcoes<T extends string>({ legenda, nome, valor, opcoes, aoMudar }: Props<T>) {
  return (
    <fieldset className="opcoes">
      <legend className="opcoes__legenda">{legenda}</legend>
      <div className="opcoes__grade">
        {opcoes.map((opcao) => (
          <label key={opcao.valor} className="opcao">
            <input
              type="radio"
              name={nome}
              value={opcao.valor}
              checked={valor === opcao.valor}
              onChange={() => aoMudar(opcao.valor)}
            />
            <span className="opcao__caixa" lang={opcao.lang}>
              <span className="opcao__marca">
                <Icone nome="check" tamanho={16} />
              </span>
              {opcao.rotulo}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
