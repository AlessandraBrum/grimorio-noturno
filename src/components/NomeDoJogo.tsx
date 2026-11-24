import { Fragment } from 'react'

const JOGO = 'Magic: The Gathering'

export function NomeDoJogo({ texto }: { texto: string }) {
  const partes = texto.split(JOGO)
  return partes.map((parte, indice) => (
    <Fragment key={indice}>
      {parte}
      {indice < partes.length - 1 && <i lang="en">{JOGO}</i>}
    </Fragment>
  ))
}
