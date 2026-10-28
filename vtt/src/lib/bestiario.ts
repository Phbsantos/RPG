import { z } from 'zod'

// Bestiário do SRD (CC-BY 4.0), gerado a partir da Open5e: SRD 5.1 (2014) e SRD 5.2 (2024).
// Os arquivos ficam em public/bestiario/ e só são baixados quando o mestre abre o bestiário.

export type EdicaoBestiario = '2014' | '2024'

const MonstroSchema = z.object({
  n: z.string().min(1).max(60), // nome (original, em inglês)
  t: z.string().max(30), // tipo
  s: z.string().max(20), // tamanho
  nd: z.number().min(0).max(30), // nível de desafio
  ca: z.number().int().min(0).max(40),
  pv: z.number().int().min(1).max(9999),
  i: z.number().int().min(-20).max(20), // bônus de iniciativa
})
export type Monstro = z.infer<typeof MonstroSchema>

const cache = new Map<EdicaoBestiario, Monstro[]>()

export async function carregarBestiario(edicao: EdicaoBestiario): Promise<Monstro[]> {
  const guardado = cache.get(edicao)
  if (guardado) return guardado
  const r = await fetch(`${import.meta.env.BASE_URL}bestiario/srd-${edicao}.json`)
  if (!r.ok) throw new Error(`Não consegui carregar o bestiário (${r.status}).`)
  const lista = z.array(MonstroSchema).parse(await r.json())
  cache.set(edicao, lista)
  return lista
}

export function formatarND(nd: number): string {
  if (nd === 0.125) return '1/8'
  if (nd === 0.25) return '1/4'
  if (nd === 0.5) return '1/2'
  return String(nd)
}

const TIPOS: Record<string, string> = {
  Aberration: 'Aberração',
  Beast: 'Fera',
  Celestial: 'Celestial',
  Construct: 'Constructo',
  Dragon: 'Dragão',
  Elemental: 'Elemental',
  Fey: 'Fada',
  Fiend: 'Ínfero',
  Giant: 'Gigante',
  Humanoid: 'Humanoide',
  Monstrosity: 'Monstruosidade',
  Ooze: 'Gosma',
  Plant: 'Planta',
  Undead: 'Morto-vivo',
}

const TAMANHOS: Record<string, string> = {
  Tiny: 'Miúdo',
  Small: 'Pequeno',
  Medium: 'Médio',
  Large: 'Grande',
  Huge: 'Enorme',
  Gargantuan: 'Imenso',
}

export const traduzirTipo = (t: string) => TIPOS[t] ?? t
export const traduzirTamanho = (s: string) => TAMANHOS[s] ?? s
