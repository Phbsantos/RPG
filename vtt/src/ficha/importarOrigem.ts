// Leitor de arquivos .md de espécie/raça e de talento (feat). Mesmo esqueleto nos dois:
//
//   ## Nome
//   - **Rótulo:** valor            (espécie: tipo, tamanho, deslocamento…)
//   Dark Gift Feat (Prerequisite: …)   (talento: linha de categoria e pré-requisito)
//   texto introdutório
//   ***Traço.*** texto…
//
// Sem dependências de execução, para poder ser testado direto no Node. O conteúdo é do próprio usuário
// e só passa pela memória do navegador até virar características da ficha.
import type { Ficha } from './esquema'
import { paraCaracteristica, paraTexto, type Contexto } from './importarClasse'

type Caracteristica = Ficha['caracteristicas'][number]

export type Traco = { nome: string; texto: string }
export type Origem = {
  nome: string
  dados: { rotulo: string; valor: string }[] // linhas "- **Rótulo:** valor"
  subtitulo: string // ex.: "Dark Gift Feat (Prerequisite: Ravenloft Campaign)"; vazio se não houver
  intro: string // texto antes do primeiro traço
  tracos: Traco[]
}

const DADO = /^\s*[-*]\s+\*\*(.+?):?\*\*:?\s*(.*)$/ // "- **Size:** Medium"
const TRACO = /^\*{3}(?!(?:Level|Nível)\s+\d)(.+?)\.?\*{3}\s*(.*)$/i // "***Flight.*** texto"
const SUBTITULO = /\bfeat\b|prerequisite/i

/** Lê as entradas do arquivo. `nomeDoArquivo` serve de nome se o arquivo não tiver nenhum "## Título". */
export function lerOrigens(markdown: string, nomeDoArquivo = 'Sem nome'): Origem[] {
  const linhas = markdown.replace(/^﻿/, '').split(/\r?\n/)

  const secoes: { titulo: string; linhas: string[] }[] = []
  for (const linha of linhas) {
    const m = /^##\s+(.+?)\s*$/.exec(linha)
    if (m) secoes.push({ titulo: m[1], linhas: [] })
    else if (secoes.length) secoes.at(-1)!.linhas.push(linha)
    else if (TRACO.test(linha)) secoes.push({ titulo: nomeDoArquivo.replace(/\.[^.]+$/, ''), linhas: [linha] })
  }

  const origens: Origem[] = []
  for (const secao of secoes) {
    const dados: Origem['dados'] = []
    const intro: string[] = []
    const tracos: { nome: string; corpo: string[] }[] = []
    let subtitulo = ''

    for (const linha of secao.linhas) {
      const traco = TRACO.exec(linha)
      if (traco) {
        tracos.push({ nome: traco[1].trim(), corpo: traco[2] ? [traco[2]] : [] })
      } else if (tracos.length) {
        tracos.at(-1)!.corpo.push(linha)
      } else {
        const dado = DADO.exec(linha)
        if (dado) dados.push({ rotulo: dado[1].trim(), valor: paraTexto(dado[2]) })
        else if (!subtitulo && !intro.some((l) => l.trim()) && linha.trim().length > 0 && linha.trim().length < 200 && SUBTITULO.test(linha)) subtitulo = paraTexto(linha)
        else intro.push(linha)
      }
    }
    const resultado: Origem = {
      nome: secao.titulo,
      dados,
      subtitulo,
      intro: paraTexto(intro.join('\n')),
      tracos: tracos.map((t) => ({ nome: t.nome, texto: paraTexto(t.corpo.join('\n')) })).filter((t) => t.nome),
    }
    if (resultado.dados.length || resultado.intro || resultado.tracos.length || resultado.subtitulo) origens.push(resultado)
  }
  return origens
}

/** Parece espécie (tem tamanho/tipo/deslocamento) ou talento (tem linha "… Feat (Prerequisite…)")? Nulo se não der para saber. */
export function tipoProvavel(o: Origem): 'especie' | 'talento' | null {
  if (/\bfeat\b/i.test(o.subtitulo)) return 'talento'
  if (o.dados.some((d) => /^(size|creature type|speed|ability scores?)$/i.test(d.rotulo))) return 'especie'
  return null
}

/** Deslocamento em metros a partir da linha "Speed" ("30 feet, Fly equal to your walking speed" → 9). */
export function deslocamentoEmMetros(o: Origem): number | null {
  const linha = o.dados.find((d) => /^speed$/i.test(d.rotulo))
  const pes = linha && /(\d+)\s*(?:feet|foot|ft)/i.exec(linha.valor)
  return pes ? Number((Number(pes[1]) * 0.3).toFixed(1)) : null
}

export type ItemOrigem = { id: string; caracteristica: Caracteristica; cortada: boolean }

/**
 * Transforma a entrada em características da ficha.
 * Espécie: um bloco "Traços de X" com as linhas de dados (tipo, tamanho…) e uma característica por traço.
 * Talento: uma característica com o nome do talento (categoria/pré-requisito + introdução) e uma por traço.
 */
export function itensDaOrigem(o: Origem, tipo: 'especie' | 'talento', ctx: Contexto, limite: number): ItemOrigem[] {
  const fonte = tipo === 'talento' ? `Talento: ${o.nome}` : o.nome
  const itens: ItemOrigem[] = []
  const adicionar = (nome: string, texto: string, id: string) => {
    const r = paraCaracteristica({ nivel: 0, nome, texto }, fonte, ctx, limite)
    itens.push({ id, caracteristica: r.caracteristica, cortada: r.cortada })
  }

  if (tipo === 'especie') {
    const linhasDados = o.dados.map((d) => `${d.rotulo}: ${d.valor}`)
    const texto = [...linhasDados, ...(o.intro ? ['', o.intro] : [])].join('\n').trim()
    if (texto) adicionar(`Traços de ${o.nome}`, texto, 'base')
  } else {
    const texto = [o.subtitulo, ...o.dados.map((d) => `${d.rotulo}: ${d.valor}`), o.intro].filter(Boolean).join('\n\n')
    if (texto || o.tracos.length === 0) adicionar(o.nome, texto, 'base')
  }
  o.tracos.forEach((t, i) => adicionar(t.nome, t.texto, `t${i}`))
  return itens
}
