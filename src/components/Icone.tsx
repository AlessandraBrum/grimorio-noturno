const CAMINHOS = {
  buscar: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  glossario: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5" /><path d="M9 8h6" /></>,
  leitura: <><circle cx="6.5" cy="14.5" r="3.5" /><circle cx="17.5" cy="14.5" r="3.5" /><path d="M10 14.5c1.2-1 2.8-1 4 0" /><path d="M3 14.5l1.6-7.2A2 2 0 0 1 6.5 6H7" /><path d="M21 14.5l-1.6-7.2A2 2 0 0 0 17.5 6H17" /></>,
  ajuda: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14" /><path d="M12 17.5v.01" /></>,
  sobre: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><path d="M12 7.5v.01" /></>,
  contato: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 6.5l8.5 6.5 8.5-6.5" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  microfone: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></>,
  fone: <><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /></>,
  som: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19 6a8.5 8.5 0 0 1 0 12" /></>,
  mudo: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M17 9l5 6M22 9l-5 6" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  fechar: <path d="M6 6l12 12M18 6L6 18" />,
  esquerda: <path d="M15 6l-6 6 6 6" />,
  direita: <path d="M9 6l6 6-6 6" />,
  baixo: <path d="M6 9l6 6 6-6" />,
  cima: <><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></>,
  check: <path d="M5 12l5 5 9-10" />,
}

const PREENCHIDOS = {
  tocar: <path d="M8 5v14l11-7z" />,
  pausar: <path d="M7 5h4v14H7zM13 5h4v14h-4z" />,
  parar: <path d="M6 6h12v12H6z" />,
  lua: <path d="M15 3a9 9 0 1 0 6 15.6A7.5 7.5 0 0 1 15 3z" />,
  estrela: <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" />,
}

export type NomeIcone = keyof typeof CAMINHOS | keyof typeof PREENCHIDOS

export function Icone({ nome, tamanho = 22, className }: { nome: NomeIcone; tamanho?: number; className?: string }) {
  const preenchido = nome in PREENCHIDOS
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill={preenchido ? 'currentColor' : 'none'}
      stroke={preenchido ? 'none' : 'currentColor'}
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {preenchido ? PREENCHIDOS[nome as keyof typeof PREENCHIDOS] : CAMINHOS[nome as keyof typeof CAMINHOS]}
    </svg>
  )
}
