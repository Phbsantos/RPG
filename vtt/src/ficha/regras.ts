import { PERICIAS, type Atributo, type Ficha, type PericiaId } from './esquema'

// Valores derivados e ações de jogo. As regras abaixo são iguais em 2014 e 2024.

export const modificador = (valor: number) => Math.floor((valor - 10) / 2)

export const formatarBonus = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

export const nivelTotal = (f: Ficha) => f.classes.reduce((soma, c) => soma + c.nivel, 0)

export const bonusProficiencia = (f: Ficha) => 2 + Math.floor((nivelTotal(f) - 1) / 4)

export const resumoClasses = (f: Ficha) => f.classes.map((c) => `${c.nome} ${c.nivel}`).join(' / ')

export function bonusSalvaguarda(f: Ficha, atributo: Atributo) {
  const proficiente = f.proficiencias.salvaguardas.includes(atributo)
  return modificador(f.atributos[atributo]) + (proficiente ? bonusProficiencia(f) : 0)
}

export function bonusPericia(f: Ficha, id: PericiaId) {
  const nivel = f.proficiencias.pericias[id]
  const multiplicador = nivel === 'especialista' ? 2 : nivel === 'proficiente' ? 1 : 0
  return modificador(f.atributos[PERICIAS[id].atributo]) + multiplicador * bonusProficiencia(f)
}

export const iniciativa = (f: Ficha) => modificador(f.atributos.des) + f.combate.iniciativaBonus

export const percepcaoPassiva = (f: Ficha) => 10 + bonusPericia(f, 'percepcao')

export function dadosDeConjuracao(f: Ficha) {
  if (!f.conjuracao) return null
  const mod = modificador(f.atributos[f.conjuracao.atributo])
  const bp = bonusProficiencia(f)
  return { cd: 8 + bp + mod, ataque: bp + mod }
}

// --- Ações: sempre devolvem uma nova ficha, sem alterar a original. ---

export function aplicarDano(f: Ficha, dano: number): Ficha {
  const { pv } = f.combate
  const absorvido = Math.min(pv.temporario, dano)
  const restante = dano - absorvido
  return atualizarPv(f, {
    temporario: pv.temporario - absorvido,
    atual: Math.max(0, pv.atual - restante),
  })
}

export function aplicarCura(f: Ficha, cura: number): Ficha {
  const { pv } = f.combate
  return atualizarPv(f, { atual: Math.min(pv.max, pv.atual + cura) })
}

export function atualizarPv(f: Ficha, mudanca: Partial<Ficha['combate']['pv']>): Ficha {
  return { ...f, combate: { ...f.combate, pv: { ...f.combate.pv, ...mudanca } } }
}

function recarregar(f: Ficha, recargas: ('curto' | 'longo')[]): Ficha {
  return {
    ...f,
    caracteristicas: f.caracteristicas.map((c) =>
      c.recarga && recargas.includes(c.recarga) && c.usosMax !== undefined ? { ...c, usosAtuais: c.usosMax } : c,
    ),
  }
}

export const descansoCurto = (f: Ficha): Ficha => recarregar(f, ['curto'])

export function descansoLongo(f: Ficha): Ficha {
  let aRecuperar = Math.max(1, Math.floor(f.combate.dadosVida.reduce((s, d) => s + d.total, 0) / 2))
  const dadosVida = f.combate.dadosVida.map((d) => {
    const volta = Math.min(d.usados, aRecuperar)
    aRecuperar -= volta
    return { ...d, usados: d.usados - volta }
  })

  const espacos = f.conjuracao
    ? Object.fromEntries(Object.entries(f.conjuracao.espacos).map(([n, e]) => [n, { ...e, usados: 0 }]))
    : undefined

  const base = recarregar(f, ['curto', 'longo'])
  return {
    ...base,
    combate: {
      ...base.combate,
      pv: { ...base.combate.pv, atual: base.combate.pv.max, temporario: 0 },
      dadosVida,
      salvaguardasContraMorte: { sucessos: 0, falhas: 0 },
      exaustao: Math.max(0, base.combate.exaustao - 1),
    },
    conjuracao: base.conjuracao && espacos ? { ...base.conjuracao, espacos } : base.conjuracao,
  }
}
