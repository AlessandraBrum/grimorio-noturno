import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/atkinson-hyperlegible-next/400.css'
import '@fontsource/atkinson-hyperlegible-next/600.css'
import '@fontsource/atkinson-hyperlegible-next/800.css'
import '@fontsource/cormorant-garamond/700.css'
import './styles/tokens.css'
import './styles/global.css'
import { App } from './App'
import { PreferenciasProvider } from './contexto/Preferencias'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreferenciasProvider>
      <App />
    </PreferenciasProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}
