// Leitor de .md de magias e de itens (textos exportados de sites de referência, com HTML no meio).
//
// Magia:                                   Item:
//   #### Blade Barrier                       #### Breastplate
//   *Level 6 Evocation*                      Medium Armor, 400 GP, 20 lb.
//   ___                                      AC 14 + Dex (max 2)
//   - **Casting Time:** Action               ---
//   - **Range:** 90 feet                     texto…
//   - **Components:** V, S
//   - **Duration:** Concentration…
//   ---
//   texto…
//   **Classes:** Cleric, Priest
//
// Sem dependências de execução além do texto-simples, para poder ser testado direto no Node. O conteúdo é do próprio
// usuário e só passa pela memória do navegador até virar magia/item da ficha.
import { paraTexto } from './importarClasse'

export type MagiaLida = {
  tipo: 'magia'
  nome: string
  nivel: number // 0 = truque
  escola: string
  ritual: boolean
  tempo: string
  alcance: string
  componentes: string
  duracao: string
  classes: string[]
  texto: string
}

export type ItemLido = {
  tipo: 'item'
  nome: string
  categoria: string // "Medium Armor", "Shield (Shield)", "Wondrous Item"…
  extras: string[] // "Spellcasting Focus"…
  valor: string // "400 GP"
  pesoLb: number | null
  raridade: string // "Rare", "Very Rare"…
  sintonizacao: string // "Requires Attunement", "Requires Attunement By a Wizard"
  estatisticas: string[] // "AC 14 + Dex (max 2)", "1d8 Slashing"…
  texto: string
}

export type EntradaLida = MagiaLida | ItemLido

const ESCOLAS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation']
const RARIDADES = /\b(Very Rare|Common|Uncommon|Rare|Legendary|Artifact|Varies|Unknown)\b/i
const PRECO = /^\d[\d,.]*\s*(?:CP|SP|EP|GP|PP)\.?$/i
const PESO = /^([\d.,]+)\s*lbs?\.?$/i

/** Lê todas as entradas (magias e itens) do texto. Cada uma começa num título "#### Nome". */
export function lerEntradas(markdown: string): EntradaLida[] {
  const linhas = markdown.replace(/^﻿/, '').split(/\r?\n/)
  const blocos: { nome: string; linhas: string[] }[] = []
  for (const linha of linhas) {
    const m = /^#{2,4}\s+(.+?)\s*$/.exec(linha)
    if (m) blocos.push({ nome: paraTexto(m[1]), linhas: [] })
    else blocos.at(-1)?.linhas.push(linha)
  }
  const entradas: EntradaLida[] = []
  for (const b of blocos) {
    const e = ehMagia(b.linhas) ? lerMagia(b.nome, b.linhas) : lerItem(b.nome, b.linhas)
    if (e) entradas.push(e)
  }
  return entradas
}

const primeiraLinha = (linhas: string[]) => linhas.find((l) => l.trim() !== '')?.trim() ?? ''

/** Magia = a primeira linha é "*Level N Escola*" / "*Escola Cantrip*" (em itálico). */
function ehMagia(linhas: string[]): boolean {
  const l = primeiraLinha(linhas)
  return /^\*[^*]+\*$/.test(l) && /\b(level\s+\d|cantrip)\b/i.test(l)
}

function lerMagia(nome: string, linhas: string[]): MagiaLida | null {
  const i0 = linhas.findIndex((l) => l.trim() !== '')
  const tipoLinha = paraTexto(linhas[i0])
  const nivelM = /level\s+(\d)/i.exec(tipoLinha)
  const nivel = nivelM ? Number(nivelM[1]) : 0
  const escola = ESCOLAS.find((e) => new RegExp(`\\b${e}\\b`, 'i').test(tipoLinha)) ?? ''

  const dados: Record<string, string> = {}
  const corpo: string[] = []
  const classes: string[] = []
  let emCorpo = false
  for (const linha of linhas.slice(i0 + 1)) {
    const t = linha.trim()
    if (!emCorpo) {
      const d = /^[-*]\s+\*\*(.+?):?\*\*:?\s*(.*)$/.exec(t)
      if (d) dados[d[1].trim().toLowerCase()] = paraTexto(d[2])
      else if (/^(-{3,}|_{3,})$/.test(t)) {
        // "___" abre a lista de dados e "---" a separa do texto: só o segundo (depois dos dados) inicia o corpo
        if (t.startsWith('-') && Object.keys(dados).length > 0) emCorpo = true
      }
      continue
    }
    const c = /^\*\*Classes?:?\*\*:?\s*(.*)$/i.exec(t)
    if (c) classes.push(...paraTexto(c[1]).split(',').map((x) => x.trim()).filter(Boolean))
    else corpo.push(linha)
  }
  const texto = paraTexto(corpo.join('\n'))
  if (!nome || (Object.keys(dados).length === 0 && !texto)) return null
  return {
    tipo: 'magia',
    nome,
    nivel,
    escola,
    ritual: /ritual/i.test(tipoLinha) || /ritual/i.test(dados['casting time'] ?? ''),
    tempo: dados['casting time'] ?? '',
    alcance: dados['range'] ?? '',
    componentes: dados['components'] ?? '',
    duracao: dados['duration'] ?? '',
    classes: [...new Set(classes)], // "Paladin, Paladin" aparece repetido em alguns arquivos
    texto,
  }
}

/** Divide por vírgulas que não estão dentro de parênteses. */
function partes(linha: string): string[] {
  const saida: string[] = []
  let atual = ''
  let prof = 0
  for (const ch of linha) {
    if (ch === '(') prof++
    if (ch === ')') prof = Math.max(0, prof - 1)
    if (ch === ',' && prof === 0) {
      saida.push(atual.trim())
      atual = ''
    } else atual += ch
  }
  if (atual.trim()) saida.push(atual.trim())
  return saida
}

function lerItem(nome: string, linhas: string[]): ItemLido | null {
  // Antes do "---": linha de tipo/raridade/preço/peso e, opcionalmente, linhas de estatística (AC, dano…).
  const iSep = linhas.findIndex((l) => /^-{3,}$/.test(l.trim()))
  const cabecalho = (iSep >= 0 ? linhas.slice(0, iSep) : linhas).map((l) => l.trim()).filter(Boolean)
  const texto = iSep >= 0 ? paraTexto(linhas.slice(iSep + 1).join('\n')) : ''
  if (cabecalho.length === 0 && !texto) return null

  const tipoLinha = paraTexto(cabecalho[0] ?? '')
  let categoria = ''
  let valor = ''
  let pesoLb: number | null = null
  let raridade = ''
  let sintonizacao = ''
  const extras: string[] = []
  for (const p of partes(tipoLinha)) {
    const peso = PESO.exec(p)
    if (peso) pesoLb = Number(peso[1].replace(',', '.'))
    else if (PRECO.test(p)) valor = p.replace(/\.$/, '')
    else if (RARIDADES.test(p) && !categoria.includes(p)) {
      const sem = /^(.*?)\s*\((.*)\)\s*$/.exec(p)
      raridade = (sem ? sem[1] : p).trim()
      sintonizacao = sem ? sem[2].trim() : ''
    } else if (!categoria) categoria = p
    else extras.push(p)
  }
  return {
    tipo: 'item',
    nome,
    categoria,
    extras,
    valor,
    pesoLb: pesoLb !== null && Number.isFinite(pesoLb) ? pesoLb : null,
    raridade,
    sintonizacao,
    estatisticas: cabecalho.slice(1).map((l) => paraTexto(l)),
    texto,
  }
}

// ---------- Texto para a ficha ----------

const LIMITE_RESUMO = 300 // tamanho de "notas" nas magias e nos itens da ficha

const cortar = (t: string, max: number) => (t.length > max ? `${t.slice(0, max - 1)}…` : t)

export const libraParaKg = (lb: number) => Number((lb * 0.4536).toFixed(2))

export const rotuloNivel = (m: MagiaLida) => (m.nivel === 0 ? `${m.escola ? `${m.escola} ` : ''}Cantrip`.trim() : `Level ${m.nivel}${m.escola ? ` ${m.escola}` : ''}${m.ritual ? ' (Ritual)' : ''}`)

/** Uma linha curta para o campo "notas" da magia. */
export function resumoMagia(m: MagiaLida): string {
  return cortar([m.tempo, m.alcance, m.componentes, m.duracao].filter(Boolean).join(' · '), LIMITE_RESUMO)
}

/** Texto completo da magia (guardado em `conjuracao.descricoes`). */
export function textoMagia(m: MagiaLida, limite: number): { texto: string; cortado: boolean } {
  const cab = [
    rotuloNivel(m),
    m.tempo && `Casting Time: ${m.tempo}`,
    m.alcance && `Range: ${m.alcance}`,
    m.componentes && `Components: ${m.componentes}`,
    m.duracao && `Duration: ${m.duracao}`,
  ].filter(Boolean)
  const partesTexto = [cab.join('\n'), m.texto, m.classes.length ? `Classes: ${m.classes.join(', ')}` : ''].filter(Boolean)
  const t = partesTexto.join('\n\n')
  return { texto: cortar(t, limite), cortado: t.length > limite }
}

/** Uma linha curta para o campo "notas" do item. */
export function resumoItem(i: ItemLido): string {
  const raridade = [i.raridade, i.sintonizacao && `(${i.sintonizacao})`].filter(Boolean).join(' ')
  return cortar([i.categoria, raridade, ...i.estatisticas, i.valor].filter(Boolean).join(' · '), LIMITE_RESUMO)
}

/** Texto completo do item (guardado em `descricao`). */
export function textoItem(i: ItemLido, limite: number): { texto: string; cortado: boolean } {
  const tipo = [i.categoria, ...i.extras, [i.raridade, i.sintonizacao && `(${i.sintonizacao})`].filter(Boolean).join(' '), i.valor, i.pesoLb !== null && `${i.pesoLb} lb`]
    .filter(Boolean)
    .join(', ')
  const t = [tipo, ...i.estatisticas, ...(i.texto ? ['', i.texto] : [])].filter((x, k) => x !== '' || k > 0).join('\n')
  return { texto: cortar(t.trim(), limite), cortado: t.trim().length > limite }
}
