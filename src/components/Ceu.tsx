const ESTRELA = 'M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z'
const LUA = 'M15 3a9 9 0 1 0 6 15.6A7.5 7.5 0 0 1 15 3z'

const BRILHOS = [
  { lado: 'esquerda', topo: '14%', tamanho: 'p', cor: 'lua' },
  { lado: 'direita', topo: '34%', tamanho: 'm', cor: 'lua' },
  { lado: 'esquerda', topo: '52%', tamanho: 'm', cor: 'rosa' },
  { lado: 'direita', topo: '68%', tamanho: 'p', cor: 'rosa' },
  { lado: 'esquerda', topo: '84%', tamanho: 'p', cor: 'lua' },
]

const LUAS = [
  { lado: 'direita', topo: '20%' },
  { lado: 'esquerda', topo: '72%' },
]

export function Ceu() {
  return (
    <div className="ceu" aria-hidden="true">
      {LUAS.map((lua) => (
        <svg
          key={lua.topo}
          className={`ceu__lua ceu--${lua.lado}`}
          style={{ top: lua.topo }}
          viewBox="0 0 24 24"
          focusable="false"
        >
          <path d={LUA} />
        </svg>
      ))}
      {BRILHOS.map((brilho, indice) => (
        <svg
          key={brilho.topo}
          className={`ceu__brilho ceu__brilho--${brilho.tamanho} ceu__brilho--${brilho.cor} ceu--${brilho.lado}`}
          style={{ top: brilho.topo, animationDelay: `${indice * 1.3}s` }}
          viewBox="0 0 24 24"
          focusable="false"
        >
          <path d={ESTRELA} />
        </svg>
      ))}
      <span className="ceu__cadente ceu__cadente--1" />
      <span className="ceu__cadente ceu__cadente--2" />
    </div>
  )
}
