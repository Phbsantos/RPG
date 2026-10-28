import { z } from 'zod'
import { gravarLocal, lerLocal } from './identidade'
import { MapaSchema } from './mapa'

// ---------- Estado completo (só existe no navegador do mestre) ----------

const Pv = z.object({
  atual: z.number().int().min(0).max(9999),
  max: z.number().int().min(1).max(9999),
  temp: z.number().int().min(0).max(9999),
})

export const CombatenteSchema = z.object({
  id: z.string().min(1).max(64),
  nome: z.string().min(1).max(60),
  tipo: z.enum(['pc', 'npc']),
  donoId: z.string().max(64).optional(), // id do jogador dono (só PCs)
  iniciativa: z.number().int().min(-20).max(60).nullable(),
  bonusIniciativa: z.number().int().min(-20).max(20),
  ordem: z.number().int(), // ordem de criação, desempata a iniciativa
  pv: Pv,
  ca: z.number().int().min(0).max(40),
  condicoes: z.array(z.string().min(1).max(40)).max(30),
  oculto: z.boolean(),
})

export const CombateSchema = z.object({
  ativo: z.boolean(),
  rodada: z.number().int().min(0),
  turnoId: z.string().max(64).nullable(),
  combatentes: z.array(CombatenteSchema).max(60),
})

export type Combatente = z.infer<typeof CombatenteSchema>
export type Combate = z.infer<typeof CombateSchema>

// ---------- Versão pública (o que vai para os jogadores) ----------

export const PublicoSchema = z.object({
  ativo: z.boolean(),
  rodada: z.number().int().min(0),
  turnoId: z.string().max(64).nullable(),
  combatentes: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        nome: z.string().min(1).max(60),
        tipo: z.enum(['pc', 'npc']),
        donoId: z.string().max(64).optional(),
        iniciativa: z.number().int().min(-20).max(60).nullable(),
        condicoes: z.array(z.string().max(40)).max(30),
        estado: z.string().max(30).optional(), // só NPCs: "Ferido", "Caído"…
      }),
    )
    .max(60),
})
export type Publico = z.infer<typeof PublicoSchema>

// ---------- Mensagens do mestre (assinadas) ----------

const Acao = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('dano'), valor: z.number().int().min(1).max(9999) }),
  z.object({ tipo: z.literal('cura'), valor: z.number().int().min(1).max(9999) }),
  z.object({ tipo: z.literal('condicao'), nome: z.string().min(1).max(40), adicionar: z.boolean() }),
])

export const ComandoSchema = z.object({
  tipo: z.literal('aplicar'),
  id: z.string().min(1).max(64),
  seq: z.number(),
  alvoId: z.string().min(1).max(64),
  acao: Acao,
})
export type Comando = z.infer<typeof ComandoSchema>

export const MensagemMestreSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('combate'), seq: z.number(), combate: PublicoSchema }),
  z.object({ tipo: z.literal('mapa'), seq: z.number(), mapa: MapaSchema }),
  ComandoSchema,
])

export const EnvelopeSchema = z.object({
  payload: z.string().max(100_000),
  assinatura: z.string().max(200),
  chave: z.string().max(200),
})

export const IniciativaSchema = z.object({
  autorId: z.string().min(1).max(64),
  valor: z.number().int().min(-20).max(60),
})

// ---------- Regras ----------

export const novoCombate = (): Combate => ({ ativo: false, rodada: 0, turnoId: null, combatentes: [] })

export function ordenados(c: Combate): Combatente[] {
  return [...c.combatentes].sort((a, b) => {
    if (a.iniciativa === null || b.iniciativa === null) {
      if (a.iniciativa === b.iniciativa) return a.ordem - b.ordem
      return a.iniciativa === null ? 1 : -1 // quem ainda não tem iniciativa vai para o fim
    }
    return b.iniciativa - a.iniciativa || b.bonusIniciativa - a.bonusIniciativa || a.ordem - b.ordem
  })
}

const naOrdemDeTurno = (c: Combate) => ordenados(c).filter((x) => x.iniciativa !== null)

export function iniciar(c: Combate): Combate {
  return { ...c, ativo: true, rodada: 1, turnoId: naOrdemDeTurno(c)[0]?.id ?? null }
}

export function proximoTurno(c: Combate): Combate {
  const lista = naOrdemDeTurno(c)
  if (lista.length === 0) return c
  const i = lista.findIndex((x) => x.id === c.turnoId)
  if (i === -1) return { ...c, turnoId: lista[0].id }
  if (i + 1 >= lista.length) return { ...c, rodada: c.rodada + 1, turnoId: lista[0].id }
  return { ...c, turnoId: lista[i + 1].id }
}

export const encerrar = (c: Combate): Combate => ({ ...c, ativo: false, rodada: 0, turnoId: null })

export function remover(c: Combate, id: string): Combate {
  // Se era a vez de quem sai, passa a vez antes de removê-lo.
  const base = c.turnoId === id ? proximoTurno(c) : c
  const restantes = base.combatentes.filter((x) => x.id !== id)
  return { ...base, combatentes: restantes, turnoId: base.turnoId === id ? null : base.turnoId }
}

export function atualizar(c: Combate, id: string, mudanca: Partial<Combatente>): Combate {
  return { ...c, combatentes: c.combatentes.map((x) => (x.id === id ? { ...x, ...mudanca } : x)) }
}

export function danoPv(pv: Combatente['pv'], dano: number): Combatente['pv'] {
  const absorvido = Math.min(pv.temp, dano)
  return { ...pv, temp: pv.temp - absorvido, atual: Math.max(0, pv.atual - (dano - absorvido)) }
}

export const curaPv = (pv: Combatente['pv'], cura: number): Combatente['pv'] => ({
  ...pv,
  atual: Math.min(pv.max, pv.atual + cura),
})

// Jogadores não veem o PV exato dos monstros, só uma descrição.
export function estadoNpc(pv: Combatente['pv']): string {
  if (pv.atual <= 0) return 'Caído'
  const fracao = pv.atual / pv.max
  if (fracao >= 1) return 'Ileso'
  if (fracao > 0.5) return 'Levemente ferido'
  if (fracao > 0.25) return 'Ferido'
  return 'Gravemente ferido'
}

export function publico(c: Combate): Publico {
  return {
    ativo: c.ativo,
    rodada: c.rodada,
    turnoId: c.turnoId,
    combatentes: ordenados(c)
      .filter((x) => !x.oculto) // ocultos nunca saem do navegador do mestre
      .map((x) => ({
        id: x.id,
        nome: x.nome,
        tipo: x.tipo,
        donoId: x.donoId,
        iniciativa: x.iniciativa,
        // Condições de PCs vêm da ficha do jogador (presença); as de NPCs, do mestre.
        condicoes: x.tipo === 'npc' ? x.condicoes : [],
        estado: x.tipo === 'npc' ? estadoNpc(x.pv) : undefined,
      })),
  }
}

// ---------- Persistência local do mestre (sobrevive a recarregar a página) ----------

const chaveCombate = (codigo: string) => `vtt:combate:${codigo}`

export function salvarCombate(codigo: string, c: Combate) {
  gravarLocal(chaveCombate(codigo), JSON.stringify(c))
}

export function carregarCombate(codigo: string): Combate {
  try {
    const bruto = lerLocal(chaveCombate(codigo))
    const r = bruto ? CombateSchema.safeParse(JSON.parse(bruto)) : null
    return r?.success ? r.data : novoCombate()
  } catch {
    return novoCombate()
  }
}
