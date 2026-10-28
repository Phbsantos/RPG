import { gravarLocal, lerLocal } from './identidade'

// Autenticação do mestre: ele assina as mensagens de combate com uma chave ECDSA (P-256)
// criada junto com a sala. A chave pública viaja no link de convite; os jogadores só
// aceitam mensagens assinadas por ela. A chave privada nunca sai do navegador do mestre.

const ALG = { name: 'ECDSA', namedCurve: 'P-256' } as const
const ASSINATURA = { name: 'ECDSA', hash: 'SHA-256' } as const

const chavePrivadaLocal = (codigo: string) => `vtt:mestre-chave:${codigo}`
const chavePublicaLocal = (codigo: string) => `vtt:chave-mestre:${codigo}`

function paraB64(bytes: ArrayBuffer): string {
  let s = ''
  new Uint8Array(bytes).forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function deB64(texto: string): Uint8Array<ArrayBuffer> {
  const base = texto.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base + '='.repeat((4 - (base.length % 4)) % 4)), (c) => c.charCodeAt(0))
}

const codificar = (texto: string) => new TextEncoder().encode(texto)

export type Envelope = { payload: string; assinatura: string; chave: string }

/** Cria o par de chaves do mestre para a sala. Devolve a chave pública (para o link). */
export async function criarChavesDeMestre(codigo: string): Promise<string> {
  const par = await crypto.subtle.generateKey(ALG, true, ['sign', 'verify'])
  const privada = await crypto.subtle.exportKey('jwk', par.privateKey)
  const publica = paraB64(await crypto.subtle.exportKey('raw', par.publicKey))
  gravarLocal(chavePrivadaLocal(codigo), JSON.stringify(privada))
  gravarLocal(chavePublicaLocal(codigo), publica)
  return publica
}

export const chavePublicaDaSala = (codigo: string) => lerLocal(chavePublicaLocal(codigo))
export const fixarChave = (codigo: string, chave: string) => gravarLocal(chavePublicaLocal(codigo), chave)

const cachePrivadas = new Map<string, CryptoKey>()

async function chavePrivada(codigo: string): Promise<CryptoKey | null> {
  const cache = cachePrivadas.get(codigo)
  if (cache) return cache
  const bruto = lerLocal(chavePrivadaLocal(codigo))
  if (!bruto) return null
  try {
    const chave = await crypto.subtle.importKey('jwk', JSON.parse(bruto), ALG, false, ['sign'])
    cachePrivadas.set(codigo, chave)
    return chave
  } catch {
    return null
  }
}

export async function assinar(codigo: string, payload: string): Promise<Envelope | null> {
  const [privada, publica] = [await chavePrivada(codigo), chavePublicaDaSala(codigo)]
  if (!privada || !publica) return null
  const assinatura = await crypto.subtle.sign(ASSINATURA, privada, codificar(payload))
  return { payload, assinatura: paraB64(assinatura), chave: publica }
}

/**
 * Confere a assinatura. Se o jogador já tem uma chave fixada (pelo link de convite), só essa vale.
 * Sem chave fixada (entrou só pelo código), a primeira chave válida vista é fixada.
 */
export async function verificar(codigo: string, env: Envelope): Promise<boolean> {
  const fixada = chavePublicaDaSala(codigo)
  if (fixada && fixada !== env.chave) return false
  try {
    const publica = await crypto.subtle.importKey('raw', deB64(env.chave), ALG, false, ['verify'])
    const ok = await crypto.subtle.verify(ASSINATURA, publica, deB64(env.assinatura), codificar(env.payload))
    if (ok && !fixada) fixarChave(codigo, env.chave)
    return ok
  } catch {
    return false
  }
}
