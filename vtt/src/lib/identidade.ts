// Identidade do navegador: id estável (sobrevive a recarregar a página) e nome do jogador.
// Tudo fica no localStorage, sem conta.

export type Papel = 'mestre' | 'jogador'

const CHAVE_ID = 'vtt:id'
const CHAVE_NOME = 'vtt:nome'
const prefixoMestre = (codigo: string) => `vtt:mestre:${codigo}`

function ler(chave: string): string | null {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}

function gravar(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor)
  } catch {
    // Sem armazenamento (aba anônima, etc.): o app segue funcionando, só não lembra.
  }
}

export const lerLocal = ler
export const gravarLocal = gravar

export function obterId(): string {
  let id = ler(CHAVE_ID)
  if (!id) {
    id = crypto.randomUUID()
    gravar(CHAVE_ID, id)
  }
  return id
}

export const obterNome = () => ler(CHAVE_NOME) ?? ''
export const salvarNome = (nome: string) => gravar(CHAVE_NOME, nome.trim())

export const marcarComoMestre = (codigo: string) => gravar(prefixoMestre(codigo), '1')
export const papelNaSala = (codigo: string): Papel =>
  ler(prefixoMestre(codigo)) === '1' ? 'mestre' : 'jogador'
