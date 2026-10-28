import { z } from 'zod'
import { gravarLocal, lerLocal } from './identidade'

// Mapa: imagem de fundo + grade + tokens. Coordenadas em pixels da imagem original,
// com o centro do token como referência.

export const LIMITE_IMAGEM = 20_000

export const TokenSchema = z.object({
  id: z.string().min(1).max(64),
  nome: z.string().min(1).max(40),
  x: z.number().min(0).max(LIMITE_IMAGEM),
  y: z.number().min(0).max(LIMITE_IMAGEM),
  tamanho: z.number().int().min(1).max(6), // em quadrados (1 = médio, 2 = grande…)
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  donoId: z.string().max(64).optional(), // jogador que pode mover este token
  combatenteId: z.string().max(64).optional(), // liga o token ao combate (destaca o turno)
  oculto: z.boolean(),
})

export const MapaSchema = z.object({
  // Só http(s): nunca data:, javascript: etc.
  imagemUrl: z.string().max(2000).regex(/^https?:\/\//i).nullable(),
  largura: z.number().int().min(1).max(LIMITE_IMAGEM),
  altura: z.number().int().min(1).max(LIMITE_IMAGEM),
  grid: z.object({
    tamanho: z.number().min(10).max(500), // pixels por quadrado
    offsetX: z.number().min(-1000).max(1000),
    offsetY: z.number().min(-1000).max(1000),
    visivel: z.boolean(),
  }),
  metrosPorQuadrado: z.number().min(0.1).max(30),
  tokens: z.array(TokenSchema).max(100),
})

export type Token = z.infer<typeof TokenSchema>
export type Mapa = z.infer<typeof MapaSchema>

export const MoverSchema = z.object({
  autorId: z.string().min(1).max(64),
  tokenId: z.string().min(1).max(64),
  x: z.number().min(0).max(LIMITE_IMAGEM),
  y: z.number().min(0).max(LIMITE_IMAGEM),
})

export const novoMapa = (): Mapa => ({
  imagemUrl: null,
  largura: 1400,
  altura: 1000,
  grid: { tamanho: 70, offsetX: 0, offsetY: 0, visivel: true },
  metrosPorQuadrado: 1.5, // 5 pés, como as velocidades das fichas (9 m = 6 quadrados)
  tokens: [],
})

// Tokens ocultos nunca saem do navegador do mestre.
export const publicoMapa = (m: Mapa): Mapa => ({ ...m, tokens: m.tokens.filter((t) => !t.oculto) })

/** Alinha o centro do token à grade: tokens de tamanho ímpar ficam no meio do quadrado, os pares nos cruzamentos. */
export function alinharNaGrade(x: number, y: number, tamanho: number, grid: Mapa['grid']) {
  const alinhar = (v: number, offset: number) => {
    const g = grid.tamanho
    return tamanho % 2 === 1 ? (Math.floor((v - offset) / g) + 0.5) * g + offset : Math.round((v - offset) / g) * g + offset
  }
  return { x: alinhar(x, grid.offsetX), y: alinhar(y, grid.offsetY) }
}

export const limitar = (v: number, max: number) => Math.min(max, Math.max(0, v))

/** Primeiro ponto livre da grade, em espiral a partir do centro (evita empilhar tokens novos). */
export function posicaoLivre(m: Mapa, tamanho: number) {
  const g = m.grid.tamanho
  for (let r = 0; r <= 15; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
        const p = alinharNaGrade(m.largura / 2 + dx * g, m.altura / 2 + dy * g, tamanho, m.grid)
        if (p.x > m.largura || p.y > m.altura || p.x < 0 || p.y < 0) continue
        const ocupado = m.tokens.some((t) => Math.max(Math.abs(t.x - p.x), Math.abs(t.y - p.y)) < g * 0.9)
        if (!ocupado) return p
      }
    }
  }
  return alinharNaGrade(m.largura / 2, m.altura / 2, tamanho, m.grid)
}

/** Distância em quadrados pela regra padrão (diagonal conta como 1). */
export function distanciaEmQuadrados(a: { x: number; y: number }, b: { x: number; y: number }, grid: Mapa['grid']) {
  return Math.round(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / grid.tamanho)
}

const PALETA = ['#d9534f', '#f0ad4e', '#5cb85c', '#5bc0de', '#7b6cf6', '#e83e8c', '#20c997', '#a0522d']
export const corDoIndice = (i: number) => PALETA[i % PALETA.length]

// ---------- Persistência local do mestre ----------

const chaveMapa = (codigo: string) => `vtt:mapa:${codigo}`

export function salvarMapa(codigo: string, m: Mapa) {
  gravarLocal(chaveMapa(codigo), JSON.stringify(m))
}

export function carregarMapa(codigo: string): Mapa {
  try {
    const bruto = lerLocal(chaveMapa(codigo))
    const r = bruto ? MapaSchema.safeParse(JSON.parse(bruto)) : null
    return r?.success ? r.data : novoMapa()
  } catch {
    return novoMapa()
  }
}
