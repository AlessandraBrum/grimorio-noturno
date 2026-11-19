import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { lerLinhas, prepararImagem, prepararLeitor } from '../api/ocr'
import { buscarCarta, identificarCandidatos, SemConexao, ServicoDeCartasIndisponivel } from '../api/scryfall'
import { ConfirmarCarta } from '../components/ConfirmarCarta'
import { Icone } from '../components/Icone'
import { usePreferencias } from '../contexto/usePreferencias'
import type { Card } from '../types/card'

type Estado = 'abrindo' | 'procurando' | 'sem-camera' | 'lendo-foto' | 'confirmar' | 'erro'

const RODADAS_ATE_A_DICA = 4

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function vibrar() {
  if ('vibrate' in navigator) navigator.vibrate(150)
}

export function Camera({ aoAbrir }: { aoAbrir: (carta: Card) => void }) {
  const { t, preferencias } = usePreferencias()
  const [estado, setEstado] = useState<Estado>('abrindo')
  const [mensagem, setMensagem] = useState(t.camera.abrindo)
  const [candidatos, setCandidatos] = useState<string[]>([])
  const [temCamera, setTemCamera] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fotoRef = useRef<HTMLInputElement>(null)
  const fluxoRef = useRef<MediaStream | null>(null)
  const abrirRef = useRef(aoAbrir)
  const sessaoRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const sessao = new AbortController()
    sessaoRef.current = sessao
    return () => sessao.abort()
  }, [])

  useEffect(() => {
    abrirRef.current = aoAbrir
  })

  useEffect(() => {
    prepararLeitor(preferencias.idioma).catch(() => {})
  }, [preferencias.idioma])

  useEffect(() => {
    let ativo = true
    async function abrir() {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('sem câmera')
      const fluxo = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      if (!ativo) {
        fluxo.getTracks().forEach((faixa) => faixa.stop())
        return
      }
      fluxoRef.current = fluxo
      setTemCamera(true)
      if (videoRef.current) {
        videoRef.current.srcObject = fluxo
        await videoRef.current.play().catch(() => {})
      }
      setEstado('procurando')
      setMensagem(t.camera.procurandoNome)
    }
    abrir().catch(() => {
      if (!ativo) return
      setEstado('sem-camera')
      setMensagem(t.camera.semCamera)
    })
    return () => {
      ativo = false
      fluxoRef.current?.getTracks().forEach((faixa) => faixa.stop())
    }
  }, [t])

  useEffect(() => {
    if (estado !== 'procurando') return
    const video = videoRef.current
    if (video && fluxoRef.current && video.srcObject !== fluxoRef.current) {
      video.srcObject = fluxoRef.current
      void video.play().catch(() => {})
    }
    let ativo = true
    let rodadas = 0

    async function procurarSemParar() {
      while (ativo) {
        const video = videoRef.current
        if (document.hidden || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          await esperar(document.hidden ? 500 : 50)
          continue
        }
        try {
          const maisDetalhe = rodadas % 2 === 1
          const linhas = await lerLinhas(
            () => ativo && !document.hidden
              ? prepararImagem(video, video.videoWidth, video.videoHeight, maisDetalhe ? 1920 : undefined)
              : null,
            preferencias.idioma,
            (porcentagem) => {
              if (ativo && porcentagem < 100) setMensagem(t.camera.baixando(porcentagem))
            },
            maisDetalhe,
            true,
            !maisDetalhe,
          )
          if (!ativo) return
          if (linhas.length > 0) {
            const { nomes, certeza } = await identificarCandidatos(linhas.map((linha) => linha.texto), preferencias.idioma, 'camera', linhas[0]?.tituloIsolado)
            if (!ativo) return
            if (certeza) {
              const carta = await buscarCarta(nomes[0], preferencias.idioma)
              if (ativo) {
                vibrar()
                abrirRef.current(carta)
              }
              return
            }
            if (nomes.length > 0) {
              vibrar()
              setCandidatos(nomes)
              setEstado('confirmar')
              return
            }
          }
          rodadas += 1
          setMensagem(rodadas >= RODADAS_ATE_A_DICA ? t.camera.dica : t.camera.procurandoNome)
          await esperar(60)
        } catch (erro) {
          if (!ativo) return
          setMensagem(erro instanceof SemConexao ? t.buscar.semInternet
            : erro instanceof ServicoDeCartasIndisponivel ? t.buscar.servicoIndisponivel : t.camera.dica)
          await esperar(3000)
        }
      }
    }

    procurarSemParar()
    return () => {
      ativo = false
    }
  }, [estado, preferencias.idioma, t])

  async function lerDaFoto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    await lerImagem(async () => {
      const bitmap = await createImageBitmap(arquivo)
      try {
        return prepararImagem(bitmap, bitmap.width, bitmap.height, 1920)
      } finally {
        bitmap.close()
      }
    })
  }

  function capturar() {
    const video = videoRef.current
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
    void lerImagem(() => prepararImagem(video, video.videoWidth, video.videoHeight, 1920))
  }

  async function lerImagem(obterImagem: () => HTMLCanvasElement | Promise<HTMLCanvasElement>) {
    const sessao = sessaoRef.current?.signal
    const anterior = estado
    setEstado('lendo-foto')
    setMensagem(t.camera.lendo)
    try {
      const imagem = await obterImagem()
      if (sessao?.aborted) return
      const linhas = await lerLinhas(() => sessao?.aborted ? null : imagem, preferencias.idioma, (porcentagem) => {
        if (!sessao?.aborted && porcentagem < 100) setMensagem(t.camera.baixando(porcentagem))
      }, true)
      if (sessao?.aborted) return
      let resultado = await identificarCandidatos(linhas.map((linha) => linha.texto), preferencias.idioma, 'camera', linhas[0]?.tituloIsolado)
      if (!resultado.certeza && linhas[0]?.tituloIsolado && !sessao?.aborted) {
        const quadroInteiro = await lerLinhas(() => sessao?.aborted ? null : imagem, preferencias.idioma, () => {}, true, false, false)
        if (sessao?.aborted) return
        const segundaLeitura = await identificarCandidatos(quadroInteiro.map((linha) => linha.texto), preferencias.idioma, 'camera')
        if (segundaLeitura.certeza || !resultado.nomes.length) resultado = segundaLeitura
      }
      const { nomes, certeza } = resultado
      if (sessao?.aborted) return
      if (certeza) {
        const carta = await buscarCarta(nomes[0], preferencias.idioma)
        if (!sessao?.aborted) aoAbrir(carta)
        return
      }
      if (nomes.length > 0) {
        setCandidatos(nomes)
        setEstado('confirmar')
        setMensagem('')
        return
      }
      setEstado('erro')
      setMensagem(t.camera.naoLi)
    } catch (erro) {
      if (sessao?.aborted) return
      const falhaDeBusca = erro instanceof SemConexao || erro instanceof ServicoDeCartasIndisponivel
      setEstado(falhaDeBusca ? 'erro' : anterior)
      setMensagem(erro instanceof SemConexao ? t.buscar.semInternet
        : erro instanceof ServicoDeCartasIndisponivel ? t.buscar.servicoIndisponivel : t.camera.naoLi)
    }
  }

  function recomecar() {
    setCandidatos([])
    setEstado(temCamera ? 'procurando' : 'sem-camera')
    setMensagem(temCamera ? t.camera.procurandoNome : t.camera.semCamera)
  }

  const comAviso = estado === 'erro' || estado === 'sem-camera'

  return (
    <div className="tela">
      <div className="tela__topo">
        <h1 id="titulo-tela" tabIndex={-1} className="titulo-tela">
          {t.camera.titulo}
        </h1>
        <p className="texto-apoio">{t.camera.apoio}</p>
      </div>

      {estado === 'confirmar' ? (
        <ConfirmarCarta key={candidatos.join('|')} candidatos={candidatos} aoAbrir={aoAbrir} aoRecomecar={recomecar} />
      ) : (
        <section className="camera" aria-label={t.camera.titulo}>
          <div className={temCamera ? 'camera__moldura' : 'camera__moldura camera__moldura--vazia'}>
            <video ref={videoRef} className="camera__video" playsInline muted aria-label={t.camera.video} hidden={!temCamera} />
            {temCamera && <div className="camera__mira" aria-hidden="true" />}
            {!temCamera && <Icone nome="camera" tamanho={48} className="camera__icone" />}
          </div>

          <p role="status" aria-live="polite" className={comAviso ? 'aviso erro' : 'legenda camera__status'}>
            {mensagem}
          </p>

          <div className="camera__acoes">
            {temCamera && (
              <button type="button" className="botao-principal" disabled={estado !== 'procurando' && estado !== 'erro'} onClick={capturar}>
                <Icone nome="camera" tamanho={20} />
                {t.camera.capturar}
              </button>
            )}
            <button
              type="button"
              className={temCamera ? 'botao-secundario' : 'botao-principal'}
              disabled={estado === 'lendo-foto'}
              onClick={() => fotoRef.current?.click()}
            >
              {t.camera.foto}
            </button>
            <input ref={fotoRef} className="visualmente-oculto" type="file" accept="image/*" tabIndex={-1} aria-hidden="true" onChange={lerDaFoto} />
            <a className="link-acao" href="#buscar">
              {t.camera.digitar}
            </a>
          </div>
          <p className="legenda">{t.camera.privacidade}</p>
        </section>
      )}
    </div>
  )
}
