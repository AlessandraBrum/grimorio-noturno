import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { prepararLeitor } from '../api/ocr'
import { buscarCarta, SemConexao, ServicoDeCartasIndisponivel } from '../api/scryfall'
import { EntradaAlternativa } from '../components/EntradaAlternativa'
import { Icone } from '../components/Icone'
import { usePreferencias } from '../contexto/usePreferencias'
import { DetectorDeEstabilidade } from '../reconhecimento/estabilidade'
import { identificarCarta, prepararIdentificacao, type Diagnostico } from '../reconhecimento/identificar'
import type { Card } from '../types/card'

type Estado = 'abrindo' | 'procurando' | 'sem-camera' | 'lendo-foto' | 'erro'

const TEMPO_PARADO_MS = 250
const INTERVALO_DE_OBSERVACAO_MS = 60
const LEITURAS_ATE_A_DICA = 4
const BRILHO_ESCURO = 60
const INTERVALO_DO_AVISO_DE_ESCURO_MS = 10000

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function bipe(frequencia: number, duracao: number, volume: number) {
  try {
    const audio = new AudioContext()
    const tom = audio.createOscillator()
    const ganho = audio.createGain()
    tom.frequency.value = frequencia
    ganho.gain.setValueAtTime(volume, audio.currentTime)
    ganho.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duracao)
    tom.connect(ganho).connect(audio.destination)
    tom.start()
    tom.stop(audio.currentTime + duracao)
    tom.onended = () => void audio.close()
  } catch {
    return
  }
}

function avisarCaptura() {
  if ('vibrate' in navigator) navigator.vibrate(40)
  bipe(520, 0.07, 0.08)
}

function avisarDica() {
  if ('vibrate' in navigator) navigator.vibrate([60, 80, 60])
}

function avisarQueReconheceu() {
  if ('vibrate' in navigator) navigator.vibrate(150)
  bipe(880, 0.18, 0.15)
}

function trilhaDeVideo(fluxo: MediaStream | null) {
  return fluxo?.getVideoTracks()[0]
}

function temLuz(trilha: MediaStreamTrack | undefined) {
  const capacidades = trilha?.getCapabilities?.() as { torch?: boolean } | undefined
  return !!capacidades?.torch
}

function fotografar(video: HTMLVideoElement) {
  const quadro = document.createElement('canvas')
  quadro.width = video.videoWidth
  quadro.height = video.videoHeight
  quadro.getContext('2d')?.drawImage(video, 0, 0, quadro.width, quadro.height)
  return quadro
}

export function Camera({ aoAbrir, aoDigitar }: { aoAbrir: (carta: Card) => void; aoDigitar: () => void }) {
  const { t, preferencias } = usePreferencias()
  const [estado, setEstado] = useState<Estado>('abrindo')
  const [mensagem, setMensagem] = useState(t.camera.abrindo)
  const [temCamera, setTemCamera] = useState(false)
  const [lendoQuadros, setLendoQuadros] = useState(false)
  const [buscandoPorVoz, setBuscandoPorVoz] = useState(false)
  const [temLanterna, setTemLanterna] = useState(false)
  const [lanterna, setLanterna] = useState(false)
  const [sugerirLuz, setSugerirLuz] = useState(false)
  const lanternaRef = useRef({ existe: false, acesa: false })
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
    void prepararIdentificacao()
  }, [])

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
      const trilha = trilhaDeVideo(fluxo)
      const existe = temLuz(trilha)
      lanternaRef.current = { existe, acesa: false }
      setTemLanterna(existe)
      void trilha?.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }).catch(() => {})
      if (videoRef.current) {
        videoRef.current.srcObject = fluxo
        void videoRef.current.play().catch(() => {})
      }
      setEstado('procurando')
      setMensagem(t.camera.esperandoImagem)
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
    let recebeuQuadro = false
    let leituras = 0
    const detector = new DetectorDeEstabilidade(TEMPO_PARADO_MS)
    let ultimoAvisoDeEscuro = -Infinity
    let avisouNestaParada = false
    let anteriores: string[] = []

    async function procurarSemParar() {
      await prepararIdentificacao()
      await prepararLeitor((porcentagem) => {
        if (ativo && porcentagem < 100) setMensagem(t.camera.baixando(porcentagem))
      }).catch(() => {})
      while (ativo) {
        const video = videoRef.current
        if (document.hidden || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          detector.reiniciar()
          await esperar(document.hidden ? 500 : 50)
          continue
        }
        if (!recebeuQuadro) {
          recebeuQuadro = true
          setLendoQuadros(true)
          setMensagem(t.camera.procurandoNome)
        }
        await esperar(INTERVALO_DE_OBSERVACAO_MS)
        if (!ativo) return
        const parada = detector.observar(video, performance.now())
        const agora = performance.now()
        if (detector.brilho < BRILHO_ESCURO && !lanternaRef.current.acesa && agora - ultimoAvisoDeEscuro > INTERVALO_DO_AVISO_DE_ESCURO_MS) {
          ultimoAvisoDeEscuro = agora
          avisarDica()
          setMensagem(lanternaRef.current.existe ? t.camera.escuro : t.camera.escuroSemLuz)
          setSugerirLuz(lanternaRef.current.existe)
        }
        if (!parada) {
          avisouNestaParada = false
          anteriores = []
          continue
        }
        const primeiraLeitura = !avisouNestaParada
        avisouNestaParada = true
        if (primeiraLeitura) {
          avisarCaptura()
          setMensagem(t.camera.lendo)
        }
        const quadro = fotografar(video)
        try {
          const diagnostico: Diagnostico = { dica: null }
          const carta = await identificarCarta(quadro, quadro.width, quadro.height, preferencias.idioma, { diagnostico, rapido: true, anteriores })
          if (!ativo) return
          anteriores = diagnostico.provaveis ?? []
          if (carta) {
            avisarQueReconheceu()
            setMensagem(t.camera.carregandoFicha)
            const ficha = await buscarCarta(carta.nome, preferencias.idioma)
            if (ativo) abrirRef.current(ficha)
            return
          }
          if (diagnostico.dica) {
            if (primeiraLeitura) avisarDica()
            setMensagem(diagnostico.dica === 'aproxime' ? t.camera.aproxime : t.camera.endireite)
          } else {
            leituras += 1
            setMensagem(leituras >= LEITURAS_ATE_A_DICA ? t.camera.dica : t.camera.procurandoNome)
          }
        } catch (erro) {
          if (!ativo) return
          if (erro instanceof ServicoDeCartasIndisponivel) {
            const codigo = erro.status ? ' (HTTP ' + erro.status + ')' : ''
            setMensagem(t.buscar.servicoIndisponivel + codigo)
          } else {
            setMensagem(erro instanceof SemConexao ? t.buscar.semInternet : t.camera.dica)
          }
        }
      }
    }

    procurarSemParar()
    return () => {
      ativo = false
    }
  }, [buscandoPorVoz, estado, preferencias.idioma, t])

  async function alternarLanterna() {
    const acesa = !lanterna
    try {
      await trilhaDeVideo(fluxoRef.current)?.applyConstraints({ advanced: [{ torch: acesa } as MediaTrackConstraintSet] })
      lanternaRef.current.acesa = acesa
      setLanterna(acesa)
      setSugerirLuz(false)
    } catch {
      lanternaRef.current = { existe: false, acesa: false }
      setTemLanterna(false)
    }
  }

  async function lerDaFoto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    const sessao = sessaoRef.current?.signal
    const anterior = estado
    setLendoQuadros(false)
    setEstado('lendo-foto')
    setMensagem(t.camera.lendo)
    try {
      const bitmap = await createImageBitmap(arquivo)
      let carta
      try {
        carta = await identificarCarta(bitmap, bitmap.width, bitmap.height, preferencias.idioma)
      } finally {
        bitmap.close()
      }
      if (sessao?.aborted) return
      if (carta) {
        avisarQueReconheceu()
        const ficha = await buscarCarta(carta.nome, preferencias.idioma)
        if (!sessao?.aborted) aoAbrir(ficha)
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

  const indicadorAtivo = !buscandoPorVoz && (estado === 'abrindo' || estado === 'procurando' || estado === 'lendo-foto')
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
        <div className={comAviso ? 'aviso erro' : 'camera__status'} role="status">
          {indicadorAtivo && <span className="camera__indicador" aria-hidden="true" />}
          <div>
            {estado === 'procurando' && lendoQuadros && !buscandoPorVoz && (
              <strong>{t.camera.leituraAtiva}</strong>
            )}
            <p>{buscandoPorVoz ? t.camera.pausadaPorVoz : mensagem}</p>
          </div>
        </div>
        <div className={temCamera ? 'camera__moldura' : 'camera__moldura camera__moldura--vazia'}>
          <video ref={videoRef} className="camera__video" autoPlay playsInline muted aria-label={t.camera.video} hidden={!temCamera} />
          {temCamera && <div className="camera__mira" aria-hidden="true" />}
          {!temCamera && <Icone nome="camera" tamanho={48} className="camera__icone" />}
        </div>

        <div className="camera__acoes">
          {temLanterna && (
            <button type="button" className={sugerirLuz ? 'botao-principal' : 'botao-secundario'} aria-pressed={lanterna} onClick={alternarLanterna}>
              {lanterna ? t.camera.apagarLuz : t.camera.acenderLuz}
            </button>
          )}
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
        <p className="legenda">{t.camera.privacidade}</p>
      </section>
    </div>
  )
}
