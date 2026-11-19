import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { lerLinhas, prepararImagem, prepararLeitor } from '../api/ocr'
import { consultarOcrNuvem } from '../api/ocrNuvem'
import { buscarCarta, identificarCandidatos, SemConexao, ServicoDeCartasIndisponivel } from '../api/scryfall'
import { EntradaAlternativa } from '../components/EntradaAlternativa'
import { Icone } from '../components/Icone'
import { usePreferencias } from '../contexto/usePreferencias'
import type { Card, Idioma } from '../types/card'

type Estado = 'abrindo' | 'procurando' | 'sem-camera' | 'lendo-foto' | 'erro'

const RODADAS_ATE_A_DICA = 4
const LADO_DO_QUADRO = 1920

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function vibrar() {
  if ('vibrate' in navigator) navigator.vibrate(150)
}

async function identificarImagem(
  obterImagem: () => HTMLCanvasElement,
  idioma: Idioma,
  aoProgredir: (porcentagem: number) => void,
  estaAtivo: () => boolean,
  usarNuvem: boolean,
  semCorrecaoDeInclinacao = false,
) {
  let imagem: HTMLCanvasElement | undefined
  const quadro = () => estaAtivo() ? (imagem ??= obterImagem()) : null
  const linhas = await lerLinhas(quadro, idioma, aoProgredir, !semCorrecaoDeInclinacao, true, usarNuvem)
  if (!estaAtivo()) return
  const resultado = await identificarCandidatos(linhas.map((linha) => linha.texto), idioma, 'camera', linhas[0]?.tituloIsolado)
  if (!estaAtivo() || resultado.certeza || !linhas[0]?.tituloIsolado) return resultado

  const quadroInteiro = await lerLinhas(quadro, idioma, aoProgredir, false, false)
  if (!estaAtivo()) return
  const segundaLeitura = await identificarCandidatos(quadroInteiro.map((linha) => linha.texto), idioma, 'camera')
  return segundaLeitura.certeza || !resultado.nomes.length ? segundaLeitura : resultado
}

export function Camera({ aoAbrir, aoDigitar }: { aoAbrir: (carta: Card) => void; aoDigitar: () => void }) {
  const { t, preferencias, mudar } = usePreferencias()
  const [estado, setEstado] = useState<Estado>('abrindo')
  const [mensagem, setMensagem] = useState(t.camera.abrindo)
  const [temCamera, setTemCamera] = useState(false)
  const [buscandoPorVoz, setBuscandoPorVoz] = useState(false)
  const [nuvemDisponivel, setNuvemDisponivel] = useState(false)
  const usarNuvem = nuvemDisponivel && preferencias.ocrNuvem === true
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
    let ativo = true
    void consultarOcrNuvem().then((disponivel) => {
      if (ativo) setNuvemDisponivel(disponivel)
    })
    return () => { ativo = false }
  }, [])

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
        void videoRef.current.play().catch(() => {})
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
    if (estado !== 'procurando' || buscandoPorVoz) return
    const video = videoRef.current
    if (video && fluxoRef.current && video.srcObject !== fluxoRef.current) {
      video.srcObject = fluxoRef.current
      void video.play().catch(() => {})
    }
    let ativo = true
    let rodadas = 0
    let tituloAnterior: string | undefined

    async function procurarSemParar() {
      while (ativo) {
        const video = videoRef.current
        if (document.hidden || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          await esperar(document.hidden ? 500 : 50)
          continue
        }
        try {
          const resultado = await identificarImagem(
            () => prepararImagem(video, video.videoWidth, video.videoHeight, LADO_DO_QUADRO),
            preferencias.idioma,
            (porcentagem) => {
              if (ativo && porcentagem < 100) setMensagem(t.camera.baixando(porcentagem))
            },
            () => ativo && !document.hidden,
            usarNuvem,
            rodadas % 2 === 1,
          )
          if (!ativo) return
          if (!resultado || document.hidden) continue
          const tituloRepetido = resultado.tituloProvavel && resultado.tituloProvavel === tituloAnterior
          const nome = resultado.certeza ? resultado.nomes[0] : tituloRepetido ? resultado.tituloProvavel : undefined
          tituloAnterior = resultado.tituloProvavel
          if (nome) {
            const carta = await buscarCarta(nome, preferencias.idioma)
            if (ativo) {
              vibrar()
              abrirRef.current(carta)
            }
            return
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
  }, [buscandoPorVoz, estado, preferencias.idioma, t, usarNuvem])

  async function lerDaFoto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    await lerImagem(async () => {
      const bitmap = await createImageBitmap(arquivo)
      try {
        return prepararImagem(bitmap, bitmap.width, bitmap.height, LADO_DO_QUADRO)
      } finally {
        bitmap.close()
      }
    })
  }

  async function lerImagem(obterImagem: () => HTMLCanvasElement | Promise<HTMLCanvasElement>) {
    const sessao = sessaoRef.current?.signal
    const anterior = estado
    setEstado('lendo-foto')
    setMensagem(t.camera.lendo)
    try {
      const imagem = await obterImagem()
      if (sessao?.aborted) return
      const resultado = await identificarImagem(
        () => imagem,
        preferencias.idioma,
        (porcentagem) => {
          if (!sessao?.aborted && porcentagem < 100) setMensagem(t.camera.baixando(porcentagem))
        },
        () => !sessao?.aborted,
        usarNuvem,
      )
      if (!resultado || sessao?.aborted) return
      const { nomes, certeza } = resultado
      if (certeza) {
        const carta = await buscarCarta(nomes[0], preferencias.idioma)
        if (!sessao?.aborted) aoAbrir(carta)
        return
      }
      setEstado(temCamera ? 'procurando' : 'erro')
      setMensagem(t.camera.naoLi)
    } catch (erro) {
      if (sessao?.aborted) return
      const falhaDeBusca = erro instanceof SemConexao || erro instanceof ServicoDeCartasIndisponivel
      setEstado(temCamera ? 'procurando' : falhaDeBusca ? 'erro' : anterior)
      setMensagem(erro instanceof SemConexao ? t.buscar.semInternet
        : erro instanceof ServicoDeCartasIndisponivel ? t.buscar.servicoIndisponivel : t.camera.naoLi)
    }
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

      <section className="camera" aria-label={t.camera.titulo}>
        <div className={temCamera ? 'camera__moldura' : 'camera__moldura camera__moldura--vazia'}>
          <video ref={videoRef} className="camera__video" playsInline muted aria-label={t.camera.video} hidden={!temCamera} />
          {temCamera && <div className="camera__mira" aria-hidden="true" />}
          {!temCamera && <Icone nome="camera" tamanho={48} className="camera__icone" />}
        </div>

        <p role="status" aria-live="polite" className={comAviso ? 'aviso erro' : 'legenda camera__status'}>
          {buscandoPorVoz ? '' : mensagem}
        </p>

        <div className="camera__acoes">
          <button
            type="button"
            className={temCamera ? 'botao-secundario' : 'botao-principal'}
            disabled={estado === 'lendo-foto' || buscandoPorVoz}
            onClick={() => fotoRef.current?.click()}
          >
            {t.camera.foto}
          </button>
          <input ref={fotoRef} className="visualmente-oculto" type="file" accept="image/*" tabIndex={-1} aria-hidden="true" onChange={lerDaFoto} />
        </div>
        {estado !== 'lendo-foto' && (
          <EntradaAlternativa
            aoAbrir={aoAbrir}
            aoMudarBuscaPorVoz={setBuscandoPorVoz}
            acaoAoLado={(
              <button type="button" className="botao-entrada" onClick={aoDigitar}>
                {t.camera.digitar}
              </button>
            )}
          />
        )}
        {nuvemDisponivel && (
          <label className="legenda">
            <input
              type="checkbox"
              checked={usarNuvem}
              disabled={estado === 'lendo-foto'}
              onChange={(evento) => mudar('ocrNuvem', evento.target.checked)}
            />
            {t.camera.usarNuvem}
          </label>
        )}
        <p className="legenda">{usarNuvem ? t.camera.privacidadeNuvem : t.camera.privacidade}</p>
      </section>
    </div>
  )
}
