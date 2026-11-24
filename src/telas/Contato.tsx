
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { usePreferencias } from '../contexto/usePreferencias'
import { prepararImagem } from '../utils/imagemContato'
import { ASSUNTOS, CONTATO, type Assunto } from '../i18n/contato'

export interface ContextoContato {
  origem: string
  imagem?: File
}

const DESTINO = 'ambuxedev@gmail.com'
const TELEFONE = /^\+[1-9]\d{7,14}$/

export function Contato({ contexto }: { contexto?: ContextoContato }) {
  const { t, preferencias } = usePreferencias()
  const c = CONTATO[preferencias.idioma]
  const [assunto, setAssunto] = useState<Assunto | ''>(contexto ? 'erro' : '')
  const [canal, setCanal] = useState<'email' | 'whatsapp'>('email')
  const [imagens, setImagens] = useState<File[]>(() => contexto?.imagem ? [contexto.imagem] : [])
  const [adicionando, setAdicionando] = useState(false)
  const [errosArquivos, setErrosArquivos] = useState<string[]>([])
  const [status, setStatus] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [parcial, setParcial] = useState(false)
  const [temMensagem, setTemMensagem] = useState(false)
  const fila = useRef<{ partes: FormData[]; proxima: number } | null>(null)
  const lista = useRef<HTMLUListElement>(null)
  const seletor = useRef<HTMLInputElement>(null)
  const telefone = useRef<HTMLInputElement>(null)
  const ocupado = useRef(false)
  const exemplo = assunto ? c.exemplos[assunto][1] : ''

  async function adicionar(evento: ChangeEvent<HTMLInputElement>) {
    const novos = Array.from(evento.currentTarget.files ?? [])
    evento.currentTarget.value = ''
    if (!novos.length) return
    setAdicionando(true)
    const processados = await Promise.all(novos.map(prepararImagem))
    setImagens((atuais) => [...atuais, ...processados.filter((arquivo) => arquivo !== undefined)])
    setErrosArquivos(novos.filter((_, indice) => !processados[indice]).map((arquivo) => arquivo.name))
    setAdicionando(false)
  }

  function remover(indice: number) {
    const botoes = lista.current?.querySelectorAll('button')
    const vizinho = botoes?.[indice + 1] ?? botoes?.[indice - 1] ?? seletor.current
    vizinho?.focus()
    setImagens((atuais) => atuais.filter((_, posicao) => posicao !== indice))
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (ocupado.current || adicionando) return
    const formulario = evento.currentTarget

    if (!fila.current) {
      const dados = new FormData(formulario)
      const resposta = String(dados.get('resposta') ?? '').trim()
      const numero = resposta.replace(/[\s().-]/g, '')
      if (canal === 'whatsapp' && !TELEFONE.test(numero)) {
        telefone.current?.setCustomValidity(c.telefoneInvalido)
        telefone.current?.reportValidity()
        return
      }
      const mensagem = String(dados.get('mensagem') ?? '').trim()
      if (!mensagem || !assunto) return
      const textos = mensagem.match(/[\s\S]{1,50000}/gu) ?? []
      const id = crypto.randomUUID()
      const total = textos.length + imagens.length
      const partes = [...textos, ...imagens].map((conteudo, indice) => {
        const parte = new FormData()
        parte.set('assunto', assunto)
        parte.set('canal', canal)
        parte.set('resposta', canal === 'whatsapp' ? numero : resposta)
        parte.set('origem', contexto?.origem ?? '')
        parte.set('id', id)
        parte.set('parte', String(indice + 1))
        parte.set('total', String(total))
        if (typeof conteudo === 'string') parte.set('mensagem', conteudo)
        else parte.set('imagem', conteudo)
        return parte
      })
      fila.current = { partes, proxima: 0 }
    }

    const envio = fila.current
    ocupado.current = true
    setEnviando(true)
    setErro('')
    try {
      while (envio.proxima < envio.partes.length) {
        setStatus(c.enviando(envio.proxima + 1, envio.partes.length))
        const resultado = await fetch('/api/contato', {
          method: 'POST', body: envio.partes[envio.proxima], signal: AbortSignal.timeout(45_000),
        })
        if (!resultado.ok || (await resultado.json()).enviado !== true) throw new Error()
        envio.proxima += 1
      }
      fila.current = null
      formulario.reset()
      setAssunto('')
      setCanal('email')
      setImagens([])
      setErrosArquivos([])
      setTemMensagem(false)
      setParcial(false)
      setStatus(c.sucesso)
    } catch {
      const houveEnvio = envio.proxima > 0
      if (!houveEnvio) fila.current = null
      setParcial(houveEnvio)
      setStatus('')
      setErro(houveEnvio ? c.parcial : c.falha)
    } finally {
      ocupado.current = false
      setEnviando(false)
    }
  }

  return (
    <div className="tela contato">
      <div className="tela__topo">
        <h1 id="titulo-tela" className="titulo-tela" tabIndex={-1}>{t.abas.contato}</h1>
        <p className="texto-apoio">{c.intro} <a href={`mailto:${DESTINO}`}>{DESTINO}</a></p>
      </div>
      <form className="contato__form" onSubmit={enviar}>
        <p>{c.obrigatorios}</p>
        {contexto && <p>{c.origem}: {contexto.origem}</p>}
        <fieldset className="contato__campos" disabled={enviando || parcial}>
          <label className="campo contato__assunto">
            <span className="campo__rotulo">{c.assunto}</span>
            <select className="campo__entrada contato__select" value={assunto} required onChange={(e) => setAssunto(e.target.value as Assunto | '')}>
              <option value="" disabled>{c.escolher}</option>
              {ASSUNTOS.map((opcao) => <option key={opcao} value={opcao}>{c.exemplos[opcao][0]}</option>)}
            </select>
          </label>

          <div className="campo">
            <label className="campo__rotulo" htmlFor="contato-mensagem">{c.mensagem}</label>
            <div className="contato__mensagem">
              <textarea id="contato-mensagem" name="mensagem" className="campo__entrada" rows={6} required
                aria-describedby={exemplo ? 'contato-exemplo' : undefined}
                onChange={(e) => {
                  const valor = e.target.value
                  setTemMensagem(valor.length > 0)
                  e.target.setCustomValidity(valor && !valor.trim() ? c.mensagem : '')
                }} />
              {exemplo && <span id="contato-exemplo" className={temMensagem ? 'visualmente-oculto' : 'contato__exemplo'}>
                {exemplo}{assunto === 'agradecimento' && <span aria-hidden="true"> *****</span>}
              </span>}
            </div>
          </div>

          <fieldset className="contato__canais">
            <legend className="campo__rotulo">{c.canal}</legend>
            <label><input type="radio" name="canal" checked={canal === 'email'} onChange={() => setCanal('email')} /> {c.email}</label>
            <label><input type="radio" name="canal" checked={canal === 'whatsapp'} onChange={() => setCanal('whatsapp')} /> {c.whatsapp}</label>
          </fieldset>

          {canal === 'email' ? (
            <label className="campo" key="email">
              <span className="campo__rotulo">{c.email}</span>
              <input className="campo__entrada" type="email" name="resposta" autoComplete="email" maxLength={254} pattern="[^@]+@[^@]+\.[^@]+" required />
            </label>
          ) : (
            <label className="campo" key="whatsapp">
              <span className="campo__rotulo">{c.numero}</span>
              <input ref={telefone} className="campo__entrada" type="tel" name="resposta" autoComplete="tel" required
                aria-describedby="contato-ddd" onChange={(e) => e.target.setCustomValidity('')} />
              <span id="contato-ddd" className="legenda">{c.ddd}</span>
            </label>
          )}

          <div className="campo">
            <label htmlFor="contato-imagens" className="campo__rotulo">{c.imagens}</label>
            <p id="contato-imagens-dica" className="legenda">{c.dica}</p>
            <input ref={seletor} id="contato-imagens" className="campo__entrada" type="file"
              accept="image/*" multiple disabled={adicionando} aria-describedby="contato-imagens-dica" onChange={adicionar} />
            <p className="legenda" role="status">{adicionando ? c.preparando : c.anexadas(imagens.length)}</p>
            {errosArquivos.length > 0 && <div role="alert">{errosArquivos.map((nome, i) => <p key={i}>{c.arquivoInvalido(nome)}</p>)}</div>}
            {imagens.length > 0 && <ul ref={lista} className="contato__anexos">
              {imagens.map((imagem, i) => (
                <li key={i}>
                  <span>{imagem.name}</span>
                  <button type="button" className="botao-secundario" aria-label={`${c.remover} ${imagem.name}`} onClick={() => remover(i)}>{c.remover}</button>
                </li>
              ))}
            </ul>}
          </div>
        </fieldset>
        <button type="submit" className="botao-principal" aria-disabled={enviando || adicionando}>{parcial ? c.continuar : c.enviar}</button>
        <div role="status">{status}</div>
        <div role="alert">{erro}</div>
      </form>
    </div>
  )
}
