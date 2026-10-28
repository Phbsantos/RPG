import { ATRIBUTOS, type Atributo, type Ficha } from './esquema'
import { modificador, nivelTotal } from './regras'

// Ficha em branco e ajudas de regras do editor. Tudo aqui é sugestão: o usuário pode sobrescrever qualquer valor.

export function fichaNova(edicao: Ficha['edicao'] = '2014'): Ficha {
  return {
    schemaVersion: 1,
    edicao,
    nome: '',
    classes: [{ nome: '', nivel: 1 }],
    especie: '',
    antecedente: '',
    experiencia: 0,
    atributos: { for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10 },
    proficiencias: { salvaguardas: [], pericias: {}, ferramentas: [], idiomas: [], armas: [], armaduras: [] },
    combate: {
      ca: 10,
      iniciativaBonus: 0,
      deslocamento: 9,
      pv: { atual: 1, max: 1, temporario: 0 },
      dadosVida: [],
      salvaguardasContraMorte: { sucessos: 0, falhas: 0 },
      condicoes: [],
      exaustao: 0,
      inspiracao: false,
    },
    ataques: [],
    caracteristicas: [],
    talentos: [],
    inventario: [],
    moedas: { pc: 0, pp: 0, pe: 0, po: 0, pl: 0 },
    notas: { aparencia: '', personalidade: '', historia: '', anotacoes: '' },
  }
}

// ---------- Atributos ----------

export const CONJUNTO_PADRAO = [15, 14, 13, 12, 10, 8]

const CUSTO_COMPRA: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }
export const PONTOS_COMPRA = 27

/** Custo em pontos da distribuição atual, ou null se algum valor está fora de 8–15 (não é compra de pontos). */
export function custoCompra(atributos: Ficha['atributos']): number | null {
  let total = 0
  for (const a of ATRIBUTOS) {
    const custo = CUSTO_COMPRA[atributos[a]]
    if (custo === undefined) return null
    total += custo
  }
  return total
}

// ---------- Classes e PV ----------

type Dado = 6 | 8 | 10 | 12

const sem = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

// Dado de vida por classe (nomes em português e inglês; inclui o Artífice).
const DADO_DA_CLASSE: Record<string, Dado> = {
  barbaro: 12, barbarian: 12,
  bardo: 8, bard: 8,
  bruxo: 8, warlock: 8,
  clerigo: 8, cleric: 8,
  druida: 8, druid: 8,
  feiticeiro: 6, sorcerer: 6,
  guerreiro: 10, fighter: 10,
  ladino: 8, rogue: 8,
  mago: 6, wizard: 6,
  monge: 8, monk: 8,
  paladino: 10, paladin: 10,
  patrulheiro: 10, ranger: 10,
  artifice: 8, artificer: 8,
}

export const CLASSES_CONHECIDAS = [
  'Bárbaro', 'Bardo', 'Bruxo', 'Clérigo', 'Druida', 'Feiticeiro',
  'Guerreiro', 'Ladino', 'Mago', 'Monge', 'Paladino', 'Patrulheiro', 'Artífice',
]

export const dadoDaClasse = (nome: string): Dado | null => DADO_DA_CLASSE[sem(nome)] ?? null

/**
 * PV pela regra de valor médio: o 1º nível da 1ª classe tem o dado cheio; os demais níveis, a média arredondada
 * para cima (d6 → 4, d8 → 5, d10 → 6, d12 → 7); soma-se o modificador de Constituição por nível.
 * Devolve null se alguma classe não for reconhecida (aí o usuário digita).
 */
export function pvSugerido(f: Ficha): { pv: number; dadosVida: { dado: 'd6' | 'd8' | 'd10' | 'd12'; total: number; usados: number }[] } | null {
  const mod = modificador(f.atributos.con)
  let pv = 0
  const dados = new Map<Dado, number>()
  for (const [i, c] of f.classes.entries()) {
    const d = dadoDaClasse(c.nome)
    if (!d) return null
    const niveisMedios = i === 0 ? c.nivel - 1 : c.nivel
    pv += (i === 0 ? d : 0) + niveisMedios * (d / 2 + 1) + c.nivel * mod
    dados.set(d, (dados.get(d) ?? 0) + c.nivel)
  }
  return {
    pv: Math.max(1, Math.round(pv)),
    dadosVida: [...dados.entries()].map(([d, total]) => ({ dado: `d${d}` as 'd6' | 'd8' | 'd10' | 'd12', total, usados: 0 })),
  }
}

// ---------- Espaços de magia (tabelas do livro, para conjuradores de uma só classe) ----------

export type TipoConjurador = 'completo' | 'meio' | 'terco'

const COMPLETO: number[][] = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
]
const MEIO: number[][] = [
  [], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2],
  [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2],
]
const TERCO: number[][] = [
  [], [], [2], [3], [3], [3], [4, 2], [4, 2], [4, 2], [4, 3],
  [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1],
]

/** Total de espaços por nível de magia (índice 0 = 1º nível) para um conjurador de nível `nivel` (1–20). */
export function espacosDeMagia(tipo: TipoConjurador, nivel: number): number[] {
  const tabela = tipo === 'completo' ? COMPLETO : tipo === 'meio' ? MEIO : TERCO
  return tabela[Math.min(20, Math.max(1, nivel)) - 1]
}

export function aplicarEspacos(f: Ficha, tipo: TipoConjurador, nivel: number): Ficha {
  if (!f.conjuracao) return f
  const totais = espacosDeMagia(tipo, nivel)
  const espacos: NonNullable<Ficha['conjuracao']>['espacos'] = {}
  totais.forEach((total, i) => {
    const antigo = f.conjuracao!.espacos[String(i + 1)]
    espacos[String(i + 1)] = { total, usados: Math.min(total, antigo?.usados ?? 0) }
  })
  return { ...f, conjuracao: { ...f.conjuracao, espacos } }
}

// ---------- Conferência antes de salvar ----------

/** Problemas mais comuns, em linguagem direta (a validação completa do esquema roda depois). */
export function problemasDaFicha(f: Ficha): string[] {
  const p: string[] = []
  if (!f.nome.trim()) p.push('Informe o nome do personagem (aba Identidade).')
  if (f.classes.some((c) => !c.nome.trim())) p.push('Toda classe precisa de um nome (aba Identidade).')
  if (!f.especie.trim()) p.push(`Informe ${f.edicao === '2024' ? 'a espécie' : 'a raça'} (aba Identidade).`)
  if (!f.antecedente.trim()) p.push('Informe o antecedente (aba Identidade).')
  if (nivelTotal(f) > 20) p.push('A soma dos níveis das classes não pode passar de 20.')
  if (f.combate.pv.atual > f.combate.pv.max) p.push('O PV atual não pode ser maior que o PV máximo (aba Combate).')
  return p
}

// ---------- Rascunho do editor (pode estar incompleto, por isso não passa pela validação) ----------

const CHAVE_RASCUNHO_EDITOR = 'vtt:editor-rascunho'

export function gravarRascunhoEditor(f: Ficha) {
  try {
    localStorage.setItem(CHAVE_RASCUNHO_EDITOR, JSON.stringify(f))
  } catch {
    // sem armazenamento: segue sem rascunho
  }
}

export function limparRascunhoEditor() {
  try {
    localStorage.removeItem(CHAVE_RASCUNHO_EDITOR)
  } catch {
    // ignorado
  }
}

/** Lê o rascunho completando o que faltar com valores em branco, para a tela nunca quebrar. */
export function lerRascunhoEditor(): Ficha | null {
  try {
    const bruto = localStorage.getItem(CHAVE_RASCUNHO_EDITOR)
    if (!bruto) return null
    const r = JSON.parse(bruto) as Partial<Ficha>
    if (!r || typeof r !== 'object' || !Array.isArray(r.classes) || r.classes.length === 0) return null
    const base = fichaNova(r.edicao === '2024' ? '2024' : '2014')
    return {
      ...base,
      ...r,
      schemaVersion: 1,
      atributos: { ...base.atributos, ...r.atributos },
      proficiencias: { ...base.proficiencias, ...r.proficiencias },
      combate: { ...base.combate, ...r.combate, pv: { ...base.combate.pv, ...r.combate?.pv } },
      moedas: { ...base.moedas, ...r.moedas },
      notas: { ...base.notas, ...r.notas },
      ataques: r.ataques ?? [],
      caracteristicas: r.caracteristicas ?? [],
      talentos: r.talentos ?? [],
      inventario: r.inventario ?? [],
    }
  } catch {
    return null
  }
}

export type { Atributo }
