// Leitor de arquivos de classe em Markdown (um .md por classe, com as subclasses no mesmo arquivo).
// Não tem dependências de execução, para poder ser testado direto no Node. O conteúdo lido é do próprio usuário:
// fica só na memória do navegador até virar características da ficha.
import type { Ficha } from './esquema'

export type HabilidadeLida = { nivel: number; nome: string; texto: string }
export type SubclasseLida = { nome: string; resumo: string; habilidades: HabilidadeLida[] }
export type ClasseLida = { nome: string; habilidades: HabilidadeLida[]; subclasses: SubclasseLida[] }

type Caracteristica = Ficha['caracteristicas'][number]

// "#### Level 7: Flash of Genius" (habilidades da classe)
const TITULO_NIVEL = /^#{3,4}\s+(?:Level|Nível)\s+(\d{1,2})\s*[:\-–—]\s*(.+?)\s*$/i
// "***Level 3: Tools of the Trade.*** texto…" (habilidades de subclasse, no meio do texto)
const PARAGRAFO_NIVEL = /^\*{3}(?:Level|Nível)\s+(\d{1,2})\s*[:\-–—]\s*(.+?)\.?\*{3}\s*(.*)$/i

type Inicio = { nivel: number; nome: string; resto: string }

function inicioDe(linha: string): Inicio | null {
  const t = TITULO_NIVEL.exec(linha)
  if (t) return { nivel: Number(t[1]), nome: t[2], resto: '' }
  const p = PARAGRAFO_NIVEL.exec(linha)
  if (p) return { nivel: Number(p[1]), nome: p[2], resto: p[3] }
  return null
}

/** Separa o arquivo em classes e subclasses. Devolve lista vazia se não achar nenhuma habilidade. */
export function lerClasses(markdown: string): ClasseLida[] {
  const linhas = markdown.replace(/^﻿/, '').split(/\r?\n/)

  // Seções por "## Título".
  const secoes: { titulo: string; linhas: string[] }[] = []
  for (const linha of linhas) {
    const m = /^##\s+(.+?)\s*$/.exec(linha)
    if (m) secoes.push({ titulo: m[1], linhas: [] })
    else secoes.at(-1)?.linhas.push(linha)
  }

  const classes: ClasseLida[] = []
  for (const secao of secoes) {
    const habilidades: HabilidadeLida[] = []
    const resumo: string[] = []
    let atual: { nivel: number; nome: string; corpo: string[] } | null = null
    let ehClasse = false
    const fechar = () => {
      if (atual) habilidades.push({ nivel: atual.nivel, nome: atual.nome, texto: paraTexto(atual.corpo.join('\n')) })
      atual = null
    }
    for (const linha of secao.linhas) {
      const inicio = inicioDe(linha)
      if (inicio) {
        if (TITULO_NIVEL.test(linha)) ehClasse = true
        fechar()
        atual = { nivel: inicio.nivel, nome: inicio.nome.replace(/\.$/, ''), corpo: inicio.resto ? [inicio.resto] : [] }
      } else if (atual) {
        atual.corpo.push(linha)
      } else {
        resumo.push(linha)
      }
    }
    fechar()
    if (habilidades.length === 0) continue

    if (ehClasse || classes.length === 0) {
      classes.push({ nome: secao.titulo, habilidades, subclasses: [] })
    } else {
      classes.at(-1)!.subclasses.push({ nome: secao.titulo, resumo: paraTexto(resumo.join('\n')), habilidades })
    }
  }
  return classes
}

/** Markdown → texto simples: tira ênfase e cabeçalhos, e transforma tabelas em linhas "a | b | c". */
export function paraTexto(md: string): string {
  const saida: string[] = []
  // Texto copiado de sites traz HTML no meio (<a href=… onmouseover=…>Unarmed Strike</a>): fica só o texto.
  md = md.replace(/<\/?[a-z][^>]*>/gi, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  for (const bruta of md.split('\n')) {
    let linha = bruta.replace(/\s+$/, '')
    linha = linha.replace(/^\s*>\s?/, '') // citação
    if (/^\|[\s:|-]+\|?\s*$/.test(linha) && linha.includes('-')) continue // separador de tabela
    if (linha.trimStart().startsWith('|')) {
      linha = linha
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => semEnfase(c.trim()))
        .join(' | ')
      saida.push(linha)
      continue
    }
    linha = linha.replace(/^#{1,6}\s+/, '')
    saida.push(semEnfase(linha))
  }
  return saida.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function semEnfase(t: string): string {
  // *itálico*, **negrito** e ***ambos***; um "*" solto (nota de rodapé) fica como está.
  return t.replace(/(\*{1,3})(?=\S)([^*\n]+?)(?<=\S)\1/g, '$2')
}

// ---------- Ligação com a ficha ----------

const NOMES_PT: Record<string, string> = {
  artificer: 'Artífice',
  barbarian: 'Bárbaro',
  bard: 'Bardo',
  cleric: 'Clérigo',
  druid: 'Druida',
  fighter: 'Guerreiro',
  monk: 'Monge',
  paladin: 'Paladino',
  ranger: 'Patrulheiro',
  rogue: 'Ladino',
  sorcerer: 'Feiticeiro',
  warlock: 'Bruxo',
  wizard: 'Mago',
}

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Nome da classe como aparece nas fichas em português (Artificer → Artífice); outros nomes ficam como estão. */
export const nomeDaClasse = (nomeNoArquivo: string) => NOMES_PT[normalizar(nomeNoArquivo)] ?? nomeNoArquivo

/** A ficha tem essa classe? Devolve a entrada (para achar nível e subclasse), comparando em inglês ou português. */
export function classeDaFicha(ficha: Ficha, nomeNoArquivo: string) {
  const alvo = normalizar(nomeDaClasse(nomeNoArquivo))
  return ficha.classes.find((c) => normalizar(c.nome) === alvo || normalizar(c.nome) === normalizar(nomeNoArquivo))
}

/** Entradas genéricas ("Subclass feature", "Ability Score Improvement") não têm texto próprio: não valem a pena. */
export const ehGenerica = (h: HabilidadeLida) => /^(.+\s)?subclass(\sfeature)?$|^ability score improvement$/i.test(h.nome.trim())

const ATRIBUTO_POR_NOME: Record<string, 'for' | 'des' | 'con' | 'int' | 'sab' | 'car'> = {
  strength: 'for',
  dexterity: 'des',
  constitution: 'con',
  intelligence: 'int',
  wisdom: 'sab',
  charisma: 'car',
}

export type Contexto = { modificador: (a: 'for' | 'des' | 'con' | 'int' | 'sab' | 'car') => number; bonusProficiencia: number }

// "…you can't use it again until…", "…you can't do so again until…", "…you can't cast it again until…"
const NAO_PODE_DE_NOVO = /can't (?:use (?:it|this feature|that feature|[\w' ]{1,40}?)|do so|do it|cast (?:it|the spell|[\w' ]{1,40}?)) again until/

/** Descobre usos e recarga quando o texto os diz com clareza; senão devolve vazio (o usuário ajusta no editor). */
export function detectarUsos(texto: string, ctx: Contexto): Pick<Caracteristica, 'usosMax' | 'recarga'> {
  // O descanso que vale é o da frase que limita os usos ("…regain all expended uses when you finish a Long Rest").
  const limitaUsos = new RegExp(`regain (?:all )?(?:your )?(?:expended )?uses?|${NAO_PODE_DE_NOVO.source}`, 'i')
  const frase = texto.split(/(?<=[.!?])\s+/).find((f) => limitaUsos.test(f))
  if (!frase) return {}
  const descanso = /(Short or Long|Long or Short|Short|Long) Rest/i.exec(frase)
  if (!descanso) return {}
  const recarga = /short/i.test(descanso[1]) ? 'curto' : 'longo'

  const porAtributo = /number of times equal to your (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) modifier/i.exec(texto)
  if (porAtributo) return { usosMax: Math.max(1, ctx.modificador(ATRIBUTO_POR_NOME[porAtributo[1].toLowerCase()])), recarga }
  if (/number of times equal to your Proficiency Bonus/i.test(texto)) return { usosMax: ctx.bonusProficiencia, recarga }
  if (new RegExp(`${NAO_PODE_DE_NOVO.source}|once you use|once you cast`, 'i').test(texto)) return { usosMax: 1, recarga }
  return {}
}

/** Monta a característica da ficha. Texto maior que o limite é cortado (e avisado em `cortada`). */
export function paraCaracteristica(
  h: HabilidadeLida,
  fonte: string,
  ctx: Contexto,
  limite: number,
): { caracteristica: Caracteristica; cortada: boolean } {
  const cortada = h.texto.length > limite
  const descricao = cortada ? `${h.texto.slice(0, limite - 1)}…` : h.texto
  const usos = detectarUsos(h.texto, ctx)
  const caracteristica: Caracteristica = { nome: h.nome.slice(0, 80), fonte: fonte.slice(0, 80), descricao }
  if (usos.usosMax !== undefined) {
    caracteristica.usosMax = usos.usosMax
    caracteristica.usosAtuais = usos.usosMax
    caracteristica.recarga = usos.recarga
  }
  return { caracteristica, cortada }
}
