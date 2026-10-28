import { z } from 'zod'

// Fórmulas aceitas: "1d20+5", "2d6+1d4-1", "d8", "2d20kh1" (maior), "2d20kl1" (menor), "4d6kh3".

const MAX_FORMULA = 80
const MAX_TERMOS = 20
const MAX_DADOS_POR_TERMO = 100
const MAX_DADOS_TOTAL = 200
const MAX_LADOS = 1000

type TermoParseado =
  | { tipo: 'dados'; sinal: 1 | -1; qtd: number; lados: number; manter?: { modo: 'h' | 'l'; n: number } }
  | { tipo: 'fixo'; sinal: 1 | -1; valor: number }

export type ResultadoParse = { ok: true; termos: TermoParseado[] } | { ok: false; erro: string }

const TOKEN = /^([+-])?(?:(\d*)d(\d+)(?:k([hl])(\d*))?|(\d+))/

export function interpretar(texto: string): ResultadoParse {
  let resto = texto.toLowerCase().replace(/\s+/g, '')
  if (!resto) return { ok: false, erro: 'Digite uma fórmula, por exemplo 1d20+5.' }
  if (resto.length > MAX_FORMULA) return { ok: false, erro: 'Fórmula longa demais.' }

  const termos: TermoParseado[] = []
  let primeiro = true
  while (resto) {
    const m = TOKEN.exec(resto)
    if (!m || (!primeiro && !m[1])) return { ok: false, erro: `Não entendi "${resto}".` }
    const sinal = m[1] === '-' ? -1 : 1
    if (m[6] !== undefined) {
      termos.push({ tipo: 'fixo', sinal, valor: Number(m[6]) })
    } else {
      const qtd = m[2] === '' ? 1 : Number(m[2])
      const lados = Number(m[3])
      if (qtd < 1 || qtd > MAX_DADOS_POR_TERMO) return { ok: false, erro: `Use de 1 a ${MAX_DADOS_POR_TERMO} dados por termo.` }
      if (lados < 2 || lados > MAX_LADOS) return { ok: false, erro: `Dados precisam ter de 2 a ${MAX_LADOS} lados.` }
      let manter: { modo: 'h' | 'l'; n: number } | undefined
      if (m[4]) {
        const n = m[5] === '' ? 1 : Number(m[5])
        if (n < 1 || n > qtd) return { ok: false, erro: `Não dá para manter ${n} de ${qtd} dados.` }
        manter = { modo: m[4] as 'h' | 'l', n }
      }
      termos.push({ tipo: 'dados', sinal, qtd, lados, manter })
    }
    resto = resto.slice(m[0].length)
    primeiro = false
    if (termos.length > MAX_TERMOS) return { ok: false, erro: 'Termos demais na fórmula.' }
  }

  const totalDados = termos.reduce((s, t) => s + (t.tipo === 'dados' ? t.qtd : 0), 0)
  if (totalDados > MAX_DADOS_TOTAL) return { ok: false, erro: `Máximo de ${MAX_DADOS_TOTAL} dados por rolagem.` }
  return { ok: true, termos }
}

// Sorteio uniforme (sem viés de módulo) usando o gerador criptográfico do navegador.
function sortear(lados: number): number {
  const limite = Math.floor(0x1_0000_0000 / lados) * lados
  const buf = new Uint32Array(1)
  do crypto.getRandomValues(buf)
  while (buf[0] >= limite)
  return (buf[0] % lados) + 1
}

// --- Formato que trafega pela sala (e que validamos ao receber) ---

const Sinal = z.union([z.literal(1), z.literal(-1)])

const TermoSchema = z.discriminatedUnion('tipo', [
  z
    .object({
      tipo: z.literal('dados'),
      sinal: Sinal,
      lados: z.number().int().min(2).max(MAX_LADOS),
      valores: z.array(z.number().int().min(1).max(MAX_LADOS)).min(1).max(MAX_DADOS_POR_TERMO),
      mantidos: z.array(z.boolean()).min(1).max(MAX_DADOS_POR_TERMO),
    })
    .refine((t) => t.valores.length === t.mantidos.length && t.valores.every((v) => v <= t.lados)),
  z.object({ tipo: z.literal('fixo'), sinal: Sinal, valor: z.number().int().min(0).max(100_000) }),
])

export const RegistroSchema = z.object({
  id: z.string().min(1).max(64),
  autorId: z.string().min(1).max(64),
  autor: z.string().min(1).max(30),
  rotulo: z.string().max(80),
  formula: z.string().max(MAX_FORMULA),
  termos: z.array(TermoSchema).min(1).max(MAX_TERMOS),
  em: z.number(),
  secreta: z.boolean().optional(),
})

export type Termo = z.infer<typeof TermoSchema>
export type Registro = z.infer<typeof RegistroSchema>

export function validarRegistro(dado: unknown): Registro | null {
  const r = RegistroSchema.safeParse(dado)
  return r.success ? r.data : null
}

// O total nunca viaja pela rede: é sempre recalculado a partir dos dados rolados.
export function totalDe(termos: Termo[]): number {
  return termos.reduce((soma, t) => {
    if (t.tipo === 'fixo') return soma + t.sinal * t.valor
    const v = t.valores.reduce((s, x, i) => s + (t.mantidos[i] ? x : 0), 0)
    return soma + t.sinal * v
  }, 0)
}

// Acerto crítico / falha crítica: só vale para um único d20 (com ou sem vantagem).
export function criticoDe(termos: Termo[]): 'max' | 'min' | null {
  const d20 = termos.filter((t) => t.tipo === 'dados' && t.lados === 20)
  const primeiro = termos[0]
  if (d20.length !== 1 || primeiro.tipo !== 'dados' || primeiro.lados !== 20 || primeiro.sinal !== 1) return null
  const mantidos = primeiro.valores.filter((_, i) => primeiro.mantidos[i])
  if (mantidos.length !== 1) return null
  return mantidos[0] === 20 ? 'max' : mantidos[0] === 1 ? 'min' : null
}

export function rolar(
  texto: string,
  autor: { id: string; nome: string },
  rotulo = '',
): { ok: true; registro: Registro } | { ok: false; erro: string } {
  const p = interpretar(texto)
  if (!p.ok) return p

  const termos: Termo[] = p.termos.map((t): Termo => {
    if (t.tipo === 'fixo') return t
    const valores = Array.from({ length: t.qtd }, () => sortear(t.lados))
    const mantidos = valores.map(() => true)
    if (t.manter) {
      const ordem = valores
        .map((v, i) => ({ v, i }))
        .sort((a, b) => (t.manter!.modo === 'h' ? b.v - a.v : a.v - b.v))
      ordem.slice(t.manter.n).forEach(({ i }) => (mantidos[i] = false))
    }
    return { tipo: 'dados', sinal: t.sinal, lados: t.lados, valores, mantidos }
  })

  return {
    ok: true,
    registro: {
      id: crypto.randomUUID(),
      autorId: autor.id,
      autor: autor.nome,
      rotulo,
      formula: texto.replace(/\s+/g, '').toLowerCase(),
      termos,
      em: Date.now(),
    },
  }
}

export type ModoD20 = 'normal' | 'vantagem' | 'desvantagem'

// Monta a fórmula de um teste de d20 com o bônus dado (ex.: vantagem, +5 → "2d20kh1+5").
export function formulaTeste(bonus: number, modo: ModoD20): string {
  const dado = modo === 'vantagem' ? '2d20kh1' : modo === 'desvantagem' ? '2d20kl1' : '1d20'
  return bonus === 0 ? dado : `${dado}${bonus > 0 ? '+' : '-'}${Math.abs(bonus)}`
}
