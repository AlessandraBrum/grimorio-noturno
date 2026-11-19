import { useEffect, useState } from 'react'
import { usePreferencias } from '../contexto/usePreferencias'
import { Icone } from './Icone'

export function FimDeSecao() {
  return <div data-fim-secao aria-hidden="true" />
}

export function SetaTopo() {
  const { t } = usePreferencias()
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const marcadores = document.querySelectorAll('[data-fim-secao]')
    const observador = new IntersectionObserver((entradas) => {
      if (entradas.some((entrada) => entrada.isIntersecting) && window.scrollY > 200) {
        setVisivel(true)
      }
    })
    marcadores.forEach((marcador) => observador.observe(marcador))

    const aoRolar = () => {
      if (window.scrollY < 80) setVisivel(false)
    }
    window.addEventListener('scroll', aoRolar, { passive: true })

    return () => {
      observador.disconnect()
      window.removeEventListener('scroll', aoRolar)
    }
  }, [])

  function voltar() {
    window.scrollTo({ top: 0 })
    document.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
  }

  return (
    <button type="button" className="seta-topo" hidden={!visivel} aria-label={t.voltarAoTopo} onClick={voltar}>
      <Icone nome="cima" tamanho={26} />
    </button>
  )
}
