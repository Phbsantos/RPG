import { corDoIndice } from './mapa'

/** "Goblin Warrior 2" → "G2"; "Brann Martelo" → "BR". */
export function iniciais(nome: string): string {
  const n = nome.trim()
  const numero = n.match(/\s(\d+)$/)
  if (numero) return (n[0] + numero[1]).toUpperCase()
  return n.slice(0, 2).toUpperCase()
}

export const corDeAvatar = corDoIndice

/** Cor da barra de PV conforme a fração restante. */
export function corDoPv(fracao: number): string {
  if (fracao > 0.5) return 'var(--ok)'
  if (fracao > 0.25) return 'var(--ouro)'
  return 'var(--perigo)'
}
