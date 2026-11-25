
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Seletor } from '../components/Seletor'
import { usePreferencias } from '../contexto/usePreferencias'
import { prepararImagem } from '../utils/imagemContato'
import { ASSUNTOS, CONTATO, type Assunto } from '../i18n/contato'

export interface ContextoContato {
  origem: string
  imagem?: File
}

const EMAIL_PUBLICO = 'ambuxedev@gmail.com'
const TELEFONE = /^\+[1-9]\d{7,14}$/
const EMAIL = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/

type Campo = 'nome' | 'assunto' | 'mensagem' | 'resposta'

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
  const [erros, setErros] = useState<Partial<Record<Campo, string>>>({})
  const fila = useRef<{ partes: FormData[]; proxima: number } | null>(null)
  const lista = useRef<HTMLUListElement>(null)
  const seletor = useRef<HTMLInputElement>(null)
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

  function limparErro(campo: Campo) {
    if (erros[campo]) setErros((atuais) => ({ ...atuais, [campo]: undefined }))
  }

  function descricao(...ids: Array<string | false | undefined>) {
    return ids.filter(Boolean).join(' ') || undefined
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (ocupado.current || adicionando) return
    const formulario = evento.currentTarget

    if (!fila.current) {
      const dados = new FormData(formulario)
      const nome = String(dados.get('nome') ?? '').trim()
      const resposta = String(dados.get('resposta') ?? '').trim()
      const numero = resposta.replace(/[\s().-]/g, '')
      const mensagem = String(dados.get('mensagem') ?? '').trim()
      const encontrados: Partial<Record<Campo, string>> = {}
      if (!nome) encontrados.nome = c.faltaNome
      if (!assunto) encontrados.assunto = c.faltaAssunto
      if (!mensagem) encontrados.mensagem = c.faltaMensagem
      if (canal === 'email' && !EMAIL.test(resposta)) encontrados.resposta = c.faltaEmail
      if (canal === 'whatsapp' && !TELEFONE.test(numero)) encontrados.resposta = c.telefoneInvalido
      setErros(encontrados)
      const primeiro = (['nome', 'assunto', 'mensagem', 'resposta'] as const).find((campo) => encontrados[campo])
      if (primeiro || !assunto) {
        if (primeiro) document.getElementById(`contato-${primeiro}`)?.focus()
        return
      }
      const textos = mensagem.match(/[\s\S]{1,50000}/gu) ?? []
      const id = crypto.randomUUID()
      const total = textos.length + imagens.length
      const partes = [...textos, ...imagens].map((conteudo, indice) => {
        const parte = new FormData()
        parte.set('nome', nome)
        parte.set('assunto', assunto)
        parte.set('canal', canal)
        parte.set('resposta', canal === 'whatsapp' ? numero : resposta)
        parte.set('origem', contexto?.origem ?? '')
        parte.set('id', id)
        parte.set('parte', String(indice + 1))
        parte.set('total', String(total))
        parte.set('site', String(dados.get('site') ?? ''))
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
        <p className="texto-apoio">{c.intro} <span className="quebra-livre">{EMAIL_PUBLICO}</span></p>
      </div>
      <form className="contato__form" noValidate onSubmit={enviar}>
        <p>{c.obrigatorios}</p>
        {contexto && <p>{c.origem}: {contexto.origem}</p>}
        <fieldset className="contato__campos" disabled={enviando || parcial}>
          <label className="campo">
            <span className="campo__rotulo">{c.nome}</span>
            <input id="contato-nome" className="campo__entrada" type="text" name="nome" autoComplete="name" maxLength={120} required
              aria-invalid={erros.nome ? true : undefined} aria-describedby={descricao(erros.nome && 'contato-nome-erro')}
              onChange={() => limparErro('nome')} />
            {erros.nome && <span id="contato-nome-erro" className="contato__erro">{erros.nome}</span>}
          </label>

          <Seletor<Assunto>
            id="contato-assunto"
            rotulo={c.assunto}
            vazio={c.escolher}
            valor={assunto}
            opcoes={ASSUNTOS.map((opcao) => ({ valor: opcao, rotulo: c.exemplos[opcao][0] }))}
            desativado={enviando || parcial}
            invalido={!!erros.assunto}
            descricao={descricao(erros.assunto && 'contato-assunto-erro')}
            aoMudar={(novo) => {
              setAssunto(novo)
              limparErro('assunto')
            }}
          />
          {erros.assunto && <p id="contato-assunto-erro" className="contato__erro">{erros.assunto}</p>}

          <div className="campo">
            <label className="campo__rotulo" htmlFor="contato-mensagem">{c.mensagem}</label>
            <div className="contato__mensagem">
              <textarea id="contato-mensagem" name="mensagem" className="campo__entrada" rows={6} required
                aria-invalid={erros.mensagem ? true : undefined}
                aria-describedby={descricao(exemplo && 'contato-exemplo', erros.mensagem && 'contato-mensagem-erro')}
                onChange={(e) => {
                  setTemMensagem(e.target.value.length > 0)
                  limparErro('mensagem')
                }} />
              {exemplo && <span id="contato-exemplo" className={temMensagem ? 'visualmente-oculto' : 'contato__exemplo'}>
                {exemplo}{assunto === 'agradecimento' && <span aria-hidden="true"> *****</span>}
              </span>}
            </div>
            {erros.mensagem && <p id="contato-mensagem-erro" className="contato__erro">{erros.mensagem}</p>}
          </div>

          <fieldset className="contato__canais">
            <legend className="campo__rotulo">{c.canal}</legend>
            <label><input type="radio" name="canal" checked={canal === 'email'} onChange={() => { setCanal('email'); limparErro('resposta') }} /> {c.email}</label>
            <label><input type="radio" name="canal" checked={canal === 'whatsapp'} onChange={() => { setCanal('whatsapp'); limparErro('resposta') }} /> {c.whatsapp}</label>
          </fieldset>

          {canal === 'email' ? (
            <label className="campo" key="email">
              <span className="campo__rotulo">{c.email}</span>
              <input id="contato-resposta" className="campo__entrada" type="email" name="resposta" autoComplete="email" maxLength={254} required
                aria-invalid={erros.resposta ? true : undefined} aria-describedby={descricao(erros.resposta && 'contato-resposta-erro')}
                onChange={() => limparErro('resposta')} />
              {erros.resposta && <span id="contato-resposta-erro" className="contato__erro">{erros.resposta}</span>}
            </label>
          ) : (
            <label className="campo" key="whatsapp">
              <span className="campo__rotulo">{c.numero}</span>
              <input id="contato-resposta" className="campo__entrada" type="tel" name="resposta" autoComplete="tel" required
                aria-invalid={erros.resposta ? true : undefined}
                aria-describedby={descricao('contato-ddd', erros.resposta && 'contato-resposta-erro')}
                onChange={() => limparErro('resposta')} />
              <span id="contato-ddd" className="legenda">{c.ddd}</span>
              {erros.resposta && <span id="contato-resposta-erro" className="contato__erro">{erros.resposta}</span>}
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
          <div className="contato__armadilha" aria-hidden="true">
            <label htmlFor="contato-site">{c.armadilha}</label>
            <input id="contato-site" name="site" type="text" tabIndex={-1} autoComplete="off" />
          </div>
        </fieldset>
        <button type="submit" className="botao-principal" aria-disabled={enviando || adicionando}>{parcial ? c.continuar : c.enviar}</button>
        <div role="status">{status}</div>
        <div role="alert">{erro}</div>
      </form>
    </div>
  )
}
