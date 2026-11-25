import { useEffect, useState } from 'react'

interface PedidoDeInstalacao extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let pedidoGuardado: PedidoDeInstalacao | null = null
const ouvintes = new Set<() => void>()

function avisar() {
  for (const ouvinte of ouvintes) ouvinte()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault()
    pedidoGuardado = evento as PedidoDeInstalacao
    avisar()
  })
  window.addEventListener('appinstalled', () => {
    pedidoGuardado = null
    avisar()
  })
}

function estaInstalado() {
  const naTelaInicial = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return naTelaInicial || window.matchMedia('(display-mode: standalone)').matches
}

function ehAparelhoApple() {
  const iPadNovo = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || iPadNovo
}

function ehAndroid() {
  return /android/i.test(navigator.userAgent)
}

function abrirNoChrome() {
  const { host, pathname, search, href } = window.location
  window.location.href = `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`
}

export function useInstalacao() {
  const [, atualizar] = useState(0)

  useEffect(() => {
    const ouvinte = () => atualizar((n) => n + 1)
    ouvintes.add(ouvinte)
    return () => {
      ouvintes.delete(ouvinte)
    }
  }, [])

  async function instalar() {
    if (!pedidoGuardado) return false
    const pedido = pedidoGuardado
    await pedido.prompt()
    const { outcome } = await pedido.userChoice
    if (outcome === 'accepted') pedidoGuardado = null
    avisar()
    return outcome === 'accepted'
  }

  const instalado = estaInstalado()
  return {
    instalado,
    podeInstalar: !instalado && !!pedidoGuardado,
    aparelhoApple: ehAparelhoApple(),
    android: ehAndroid(),
    abrirNoChrome,
    instalar,
  }
}
