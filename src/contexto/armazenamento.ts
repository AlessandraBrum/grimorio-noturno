const PREFIXO = 'grimorio-noturno:'

export function ler<T>(chave: string, padrao: T): T {
  try {
    const valor = localStorage.getItem(PREFIXO + chave)
    return valor ? { ...padrao, ...JSON.parse(valor) } : padrao
  } catch {
    return padrao
  }
}

export function lerLista<T>(chave: string): T[] {
  try {
    const valor = localStorage.getItem(PREFIXO + chave)
    const lista: unknown = valor ? JSON.parse(valor) : []
    return Array.isArray(lista) ? (lista as T[]) : []
  } catch {
    return []
  }
}

export function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(PREFIXO + chave, JSON.stringify(valor))
  } catch {
    return
  }
}

export function apagarTudo() {
  try {
    Object.keys(localStorage)
      .filter((chave) => chave.startsWith(PREFIXO))
      .forEach((chave) => localStorage.removeItem(chave))
  } catch {
    return
  }
}
