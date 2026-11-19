import { usePreferencias } from '../contexto/usePreferencias'

export function Rodape() {
  const { t } = usePreferencias()

  return (
    <footer className="rodape">
      <div className="limite rodape__conteudo">
        <p>
          {t.rodape.luna} <a href="#sobre">{t.abas.sobre}</a>
        </p>
        <p>{t.rodape.aviso}</p>
        <p className="rodape__versao">
          {t.rodape.versao} <code>{__VERSAO__}</code>
        </p>
      </div>
    </footer>
  )
}
