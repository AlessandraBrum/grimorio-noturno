import { useEffect, useRef, useState } from 'react'
import { usePreferencias, type Tema } from '../contexto/usePreferencias'
import type { Idioma } from '../types/card'
import { Icone } from './Icone'
import { Interruptor } from './Interruptor'
import { Opcoes } from './Opcoes'

export function PainelAjustes({ aoFechar }: { aoFechar: () => void }) {
  const { t, preferencias, mudar } = usePreferencias()
  const [idiomaEscolhido, setIdiomaEscolhido] = useState<Idioma>(preferencias.idioma)
  const botaoFecharRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    botaoFecharRef.current?.focus()
  }, [])

  useEffect(() => {
    function aoTeclar(evento: globalThis.KeyboardEvent) {
      if (evento.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoFechar])

  return (
    <>
      <button type="button" className="fundo-escuro" tabIndex={-1} aria-label={t.fecharAjustes} onClick={aoFechar} />
      <div
        id="painel-ajustes"
        className="gaveta"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-ajustes"
      >
        <div className="gaveta__topo">
          <h2 id="titulo-ajustes" className="gaveta__titulo">
            {t.ajustes}
          </h2>
          <button ref={botaoFecharRef} type="button" className="botao-icone" aria-label={t.fecharAjustes} onClick={aoFechar}>
            <Icone nome="fechar" />
          </button>
        </div>

        <div className="gaveta__corpo">
          <div className="opcoes">
            <Opcoes<Idioma>
              legenda={t.ajustesPainel.idioma}
              nome="idioma"
              valor={idiomaEscolhido}
              opcoes={[
                { valor: 'pt', rotulo: 'Português', lang: 'pt-BR' },
                { valor: 'en', rotulo: 'English', lang: 'en' },
              ]}
              aoMudar={setIdiomaEscolhido}
            />
            <button
              type="button"
              className="botao-principal"
              disabled={idiomaEscolhido === preferencias.idioma}
              onClick={() => mudar('idioma', idiomaEscolhido)}
            >
              {t.ajustesPainel.aplicarIdioma}
            </button>
          </div>

          <Opcoes<Tema>
            legenda={t.ajustesPainel.tema}
            nome="tema"
            valor={preferencias.tema}
            opcoes={[
              { valor: 'escuro', rotulo: t.ajustesPainel.temas.escuro },
              { valor: 'claro', rotulo: t.ajustesPainel.temas.claro },
              { valor: 'sistema', rotulo: t.ajustesPainel.temas.sistema },
            ]}
            aoMudar={(tema) => mudar('tema', tema)}
          />

          <div className="opcoes">
            <Interruptor
              rotulo={t.player.lerSozinho}
              ligado={preferencias.lerSozinho}
              textoLigado={t.player.lerSozinhoLigado}
              textoDesligado={t.player.lerSozinhoDesligado}
              aoMudar={(ligado) => mudar('lerSozinho', ligado)}
            />
          </div>

          <div className="opcoes">
            <Interruptor
              rotulo={t.ajustesPainel.animacoes}
              ligado={preferencias.animacoes}
              textoLigado={t.ajustesPainel.ligadas}
              textoDesligado={t.ajustesPainel.desligadas}
              aoMudar={(ligado) => mudar('animacoes', ligado)}
            />
            <p className="legenda">{t.ajustesPainel.animacoesAviso}</p>
          </div>

          <nav aria-label={t.ajustesPainel.paginas}>
            <ul className="lista-links lista-links--botoes">
              <li><a className="botao-secundario" href="#leitura" onClick={aoFechar}>{t.leitura.titulo}</a></li>
              <li><a className="botao-secundario" href="#ajuda" onClick={aoFechar}>{t.ajuda.titulo}</a></li>
              <li><a className="botao-secundario" href="#sobre" onClick={aoFechar}>{t.abas.sobre}</a></li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  )
}
