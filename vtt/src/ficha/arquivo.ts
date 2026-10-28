import { z } from 'zod'
import pt from 'zod/v4/locales/pt.js'
import { FichaSchema, type Ficha } from './esquema'

z.config(pt()) // mensagens de validação em português

const TAMANHO_MAXIMO = 1024 * 1024 // 1 MB é muito mais do que uma ficha precisa
const CHAVE_RASCUNHO = 'vtt:ficha'

export type ResultadoValidacao = { ok: true; ficha: Ficha } | { ok: false; erros: string[] }

export function validarFicha(dados: unknown): ResultadoValidacao {
  const r = FichaSchema.safeParse(dados)
  if (r.success) return { ok: true, ficha: r.data }
  const erros = r.error.issues.map((i) => {
    const caminho = i.path.join('.')
    return caminho ? `${caminho}: ${i.message}` : i.message
  })
  return { ok: false, erros }
}

export async function lerArquivoFicha(arquivo: File): Promise<ResultadoValidacao> {
  if (arquivo.size > TAMANHO_MAXIMO) return { ok: false, erros: ['Arquivo grande demais (máximo 1 MB).'] }
  let dados: unknown
  try {
    dados = JSON.parse(await arquivo.text())
  } catch {
    return { ok: false, erros: ['O arquivo não é um JSON válido.'] }
  }
  return validarFicha(dados)
}

export function baixarJson(nomeArquivo: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  a.click()
  URL.revokeObjectURL(url)
}

export function baixarFicha(ficha: Ficha) {
  baixarJson(`${ficha.nome.replace(/[^\p{L}\p{N}]+/gu, '-')}-${ficha.edicao}.json`, JSON.stringify(ficha, null, 2))
}

// Cópia local para não perder a ficha ao recarregar a página.
export function salvarRascunho(ficha: Ficha) {
  try {
    localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(ficha))
  } catch {
    // sem armazenamento: segue sem rascunho
  }
}

export function carregarRascunho(): Ficha | null {
  try {
    const bruto = localStorage.getItem(CHAVE_RASCUNHO)
    if (!bruto) return null
    const r = validarFicha(JSON.parse(bruto))
    return r.ok ? r.ficha : null
  } catch {
    return null
  }
}

export function descartarRascunho() {
  try {
    localStorage.removeItem(CHAVE_RASCUNHO)
  } catch {
    // ignorado
  }
}
