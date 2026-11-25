import { useId, useState } from 'react'
import { usePreferencias } from '../contexto/usePreferencias'
import { useInstalacao } from '../hooks/useInstalacao'

export function InstalarApp({ destaque = false }: { destaque?: boolean }) {
  const { t } = usePreferencias()
  const { instalado, podeInstalar, aparelhoApple, instalar } = useInstalacao()
  const [passosAbertos, setPassosAbertos] = useState(false)
  const idDosPassos = useId()

  if (instalado && !destaque) return null

  async function aoApertar() {
    if (podeInstalar && (await instalar())) return
    setPassosAbertos((aberto) => !aberto)
  }

  return (
    <div className="instalar">
      <button
        type="button"
        className={destaque ? 'botao-principal' : 'botao-secundario'}
        aria-expanded={podeInstalar ? undefined : passosAbertos}
        aria-controls={podeInstalar ? undefined : idDosPassos}
        onClick={() => void aoApertar()}
      >
        {t.instalar.botao}
      </button>
      <div id={idDosPassos} hidden={!passosAbertos}>
        <p className="instalar__passos">{aparelhoApple ? t.instalar.passosApple : t.instalar.passosNavegador}</p>
        <p className="legenda">{t.instalar.desinstalou}</p>
      </div>
    </div>
  )
}
