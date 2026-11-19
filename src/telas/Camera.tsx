import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { lerLinhas, prepararImagem, prepararLeitor } from '../api/ocr'
import { buscarCarta, identificarCandidatos, SemConexao, ServicoDeCartasIndisponivel } from '../api/scryfall'
import { EntradaAlternativa } from '../components/EntradaAlternativa'
import { Icone } from '../components/Icone'
import { usePreferencias } from '../contexto/usePreferencias'
import { carregarBase, reconhecerImagem, type Reconhecimento } from '../reconhecimento/reconhecer'
import type { Card, Idioma } from '../types/card'

type Estado = 'abrindo' | 'procurando' | 'sem-camera' | 'lendo-foto' | 'erro'

const RODADAS_ATE_A_DICA = 4
const RODADAS_DE_IMAGEM_ATE_A_DICA = 40
const CERTEZA_IMEDIATA = { distancia: 12, margem: 8 }
const CERTEZA_REPETIDA = { distancia: 22, margem: 4 }

function confiavel(resultado: Reconhecimento | null, limite: { distancia: number; margem: number }) {
  return !!resultado && resultado.distancia <= limite.distancia && resultado.margem >= limite.margem
}

async function baseDisponivel() {
  try {
    await carregarBase()
    return true
  } catch {
    return false
  }
}

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function avisarQueReconheceu() {
  if ('vibrate' in navigator) navigator.vibrate(150)
  try {
    const audio = new AudioContext()
    const tom = audio.createOscillator()
    const volume = audio.createGain()
    tom.frequency.value = 880
    volume.gain.setValueAtTime(0.15, audio.currentTime)
    volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18)
    tom.connect(volume).connect(audio.destination)
    tom.start()
    tom.stop(audio.currentTime + 0.18)
    tom.onended = () => void audio.close()
  } catch {
    return
  }
}

async function identificarImagem(
  imagem: HTMLCanvasElement,
  idioma: Idioma,
  aoProgredir: (porcentagem: number) => void,
) {
  const linhas = await lerLinhas(imagem, aoProgredir)
  if (!linhas.length) return { nomes: [], certeza: false }
  return identificarCandidatos(linhas.map((linha) => linha.texto), idioma, 'camera')
}

export function Camera({ aoAbrir, aoDigitar }: { aoAbrir: (carta: Card) => void; aoDigitar: () => void }) {
  const { t, preferencias } = usePreferencias()
  const [estado, setEstado] = useState<Estado>('abrindo')
  const [mensagem, setMensagem] = useState(t.camera.abrindo)
  const [temCamera, setTemCamera] = useState(false)
  const [lendoQuadros, setLendoQuadros] = useState(false)
  const [buscandoPorVoz, setBuscandoPorVoz] = useState(false)
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
    void baseDisponivel().then((pronta) => {
      if (!pronta) prepararLeitor().catch(() => {})
    })
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
    let rodadas = 0

    async function procurarPelaImagem() {
      let anterior: Reconhecimento | null = null
      while (ativo) {
        const video = videoRef.current
        if (document.hidden || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          await esperar(document.hidden ? 500 : 50)
          continue
        }
        if (!recebeuQuadro) {
          recebeuQuadro = true
          setLendoQuadros(true)
          setMensagem(t.camera.procurandoNome)
        }
        const resultado = await reconhecerImagem(video, video.videoWidth, video.videoHeight)
        if (!ativo) return
        const repetido = !!resultado && anterior?.nome === resultado.nome
          && confiavel(resultado, CERTEZA_REPETIDA) && confiavel(anterior, CERTEZA_REPETIDA)
        if (resultado && (confiavel(resultado, CERTEZA_IMEDIATA) || repetido)) {
          avisarQueReconheceu()
          setMensagem(t.camera.carregandoFicha)
          try {
            const carta = await buscarCarta(resultado.nome, preferencias.idioma)
            if (ativo) abrirRef.current(carta)
            return
          } catch (erro) {
            if (!ativo) return
            setMensagem(erro instanceof SemConexao ? t.buscar.semInternet
              : erro instanceof ServicoDeCartasIndisponivel ? t.buscar.servicoIndisponivel : t.camera.dica)
            await esperar(3000)
          }
        }
        anterior = resultado
        rodadas += 1
        if (rodadas === RODADAS_DE_IMAGEM_ATE_A_DICA) setMensagem(t.camera.dica)
        await esperar(30)
      }
    }

    async function procurarSemParar() {
      if (await baseDisponivel()) return procurarPelaImagem()
      while (ativo) {
        const video = videoRef.current
        if (document.hidden || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          await esperar(document.hidden ? 500 : 50)
          continue
        }
        try {
          if (!recebeuQuadro) {
            recebeuQuadro = true
            setLendoQuadros(true)
            setMensagem(t.camera.procurandoNome)
          }
          const imagem = prepararImagem(video, video.videoWidth, video.videoHeight)
          const resultado = await identificarImagem(imagem, preferencias.idioma, (porcentagem) => {
            if (ativo && porcentagem < 100) setMensagem(t.camera.baixando(porcentagem))
          })
          if (!ativo) return
          if (document.hidden) continue
          if (resultado.certeza) {
            avisarQueReconheceu()
            setMensagem(t.camera.carregandoFicha)
            const carta = await buscarCarta(resultado.nomes[0], preferencias.idioma)
            if (ativo) abrirRef.current(carta)
            return
          }
          rodadas += 1
          setMensagem(rodadas >= RODADAS_ATE_A_DICA ? t.camera.dica : t.camera.procurandoNome)
          await esperar(60)
        } catch (erro) {
          if (!ativo) return
          if (erro instanceof ServicoDeCartasIndisponivel) {
            const codigo = erro.status ? ' (HTTP ' + erro.status + ')' : ''
            setMensagem(t.buscar.servicoIndisponivel + codigo)
          } else {
            setMensagem(erro instanceof SemConexao ? t.buscar.semInternet : t.camera.dica)
          }
          await esperar(3000)
        }
      }
    }

    procurarSemParar()
    return () => {
      ativo = false
    }
  }, [buscandoPorVoz, estado, preferencias.idioma, t])

  async function lerDaFoto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    await lerImagem(async () => {
      const bitmap = await createImageBitmap(arquivo)
      try {
        return prepararImagem(bitmap, bitmap.width, bitmap.height)
      } finally {
        bitmap.close()
      }
    })
  }

  async function lerImagem(obterImagem: () => HTMLCanvasElement | Promise<HTMLCanvasElement>) {
    const sessao = sessaoRef.current?.signal
    const anterior = estado
    setLendoQuadros(false)
    setEstado('lendo-foto')
    setMensagem(t.camera.lendo)
    try {
      const imagem = await obterImagem()
      if (sessao?.aborted) return
      const pelaImagem = (await baseDisponivel()) ? await reconhecerImagem(imagem, imagem.width, imagem.height) : null
      if (sessao?.aborted) return
      if (pelaImagem && confiavel(pelaImagem, CERTEZA_REPETIDA)) {
        avisarQueReconheceu()
        const carta = await buscarCarta(pelaImagem.nome, preferencias.idioma)
        if (!sessao?.aborted) aoAbrir(carta)
        return
      }
      const { nomes, certeza } = await identificarImagem(imagem, preferencias.idioma, (porcentagem) => {
        if (!sessao?.aborted && porcentagem < 100) setMensagem(t.camera.baixando(porcentagem))
      })
      if (sessao?.aborted) return
      if (certeza) {
        avisarQueReconheceu()
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
