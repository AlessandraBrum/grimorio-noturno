import { useEffect, useState } from 'react'

export const TELAS = ['buscar', 'carta', 'glossario', 'leitura', 'ajuda', 'sobre'] as const

export type Tela = (typeof TELAS)[number]

function telaDoEndereco(): Tela {
  const hash = window.location.hash.replace('#', '')
  return (TELAS as readonly string[]).includes(hash) ? (hash as Tela) : 'buscar'
}

export function useTela() {
  const [tela, setTela] = useState<Tela>(telaDoEndereco)

  useEffect(() => {
    const aoMudar = () => setTela(telaDoEndereco())
    window.addEventListener('hashchange', aoMudar)
    return () => window.removeEventListener('hashchange', aoMudar)
  }, [])

  function irPara(destino: Tela) {
    if (window.location.hash === `#${destino}`) {
      setTela(destino)
    } else {
      window.location.hash = destino
    }
  }

  return { tela, irPara }
}
