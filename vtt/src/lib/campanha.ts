import { z } from 'zod'
import { CombateSchema, type Combate } from './combate'
import { MapaSchema, type Mapa } from './mapa'

// Backup da campanha do mestre: combate e mapa (inclui tokens ocultos e PV dos NPCs).
// As fichas dos jogadores não entram: cada jogador guarda o próprio JSON.

const TAMANHO_MAXIMO = 5 * 1024 * 1024

const CampanhaSchema = z.object({
  tipo: z.literal('vtt-campanha'),
  versao: z.literal(1),
  exportadoEm: z.string().max(40),
  combate: CombateSchema,
  mapa: MapaSchema,
})

export function exportarCampanha(combate: Combate, mapa: Mapa): string {
  return JSON.stringify({ tipo: 'vtt-campanha', versao: 1, exportadoEm: new Date().toISOString(), combate, mapa }, null, 2)
}

export async function lerCampanha(
  arquivo: File,
): Promise<{ ok: true; combate: Combate; mapa: Mapa } | { ok: false; erro: string }> {
  if (arquivo.size > TAMANHO_MAXIMO) return { ok: false, erro: 'Arquivo grande demais (máximo 5 MB).' }
  let dados: unknown
  try {
    dados = JSON.parse(await arquivo.text())
  } catch {
    return { ok: false, erro: 'O arquivo não é um JSON válido.' }
  }
  const r = CampanhaSchema.safeParse(dados)
  if (!r.success) {
    const i = r.error.issues[0]
    return { ok: false, erro: `Não é um backup de campanha válido (${i.path.join('.') || 'raiz'}: ${i.message}).` }
  }
  return { ok: true, combate: r.data.combate, mapa: r.data.mapa }
}
