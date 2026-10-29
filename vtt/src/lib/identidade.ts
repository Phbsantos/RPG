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

/** Códigos das salas em que este navegador é o mestre (para retomar o combate e o mapa salvos). */
export function salasDoMestre(): string[] {
  const codigos: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const m = localStorage.key(i)?.match(/^vtt:mestre:([A-Z0-9]{6})$/)
      if (m && localStorage.getItem(m[0]) === '1') codigos.push(m[1])
    }
  } catch {
    // sem armazenamento: nenhuma sala para retomar
  }
  return codigos
}

/** Apaga deste navegador tudo o que a sala tem: papel de mestre, chaves, combate e mapa. Não dá para desfazer. */
export function esquecerSala(codigo: string) {
  try {
    for (const prefixo of ['vtt:mestre:', 'vtt:mestre-chave:', 'vtt:chave-mestre:', 'vtt:combate:', 'vtt:mapa:']) {
      localStorage.removeItem(prefixo + codigo)
    }
  } catch {
    // sem armazenamento: nada a apagar
  }
}

export const marcarComoMestre =(codigo: string) => gravar(prefixoMestre(codigo), '1')
export const papelNaSala = (codigo: string): Papel =>
  ler(prefixoMestre(codigo)) === '1' ? 'mestre' : 'jogador'
