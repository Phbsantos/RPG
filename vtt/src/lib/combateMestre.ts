import { useEffect, useRef, useState } from 'react'
import { carregarCombate, publico, salvarCombate, type Combate } from './combate'
import type { StatusConexao } from './sala'

// A cada tanto tempo o mestre reenvia o estado: mensagens em tempo real não ficam guardadas, então quem ficou
// sem rede por um instante se corrige sozinho em vez de ficar com a tela desatualizada.
export const INTERVALO_RESSINCRONIZACAO = 15_000

// Estado do combate do mestre: guardado no navegador dele e transmitido (versão pública)
// aos jogadores a cada mudança, quando alguém novo entra na sala e periodicamente.
export function useCombateMestre(
  codigo: string,
  ehMestre: boolean,
  status: StatusConexao,
  idsPresentes: string,
  enviarMestre: (msg: Record<string, unknown>) => Promise<void>,
) {
  const [combate, setCombate] = useState<Combate>(() => carregarCombate(codigo))
  const combateRef = useRef(combate)

  useEffect(() => {
    combateRef.current = combate
    if (ehMestre) salvarCombate(codigo, combate)
  }, [codigo, ehMestre, combate])

  useEffect(() => {
    if (!ehMestre || status !== 'conectado') return
    void enviarMestre({ tipo: 'combate', combate: publico(combate) })
  }, [ehMestre, status, combate, idsPresentes, enviarMestre])

  useEffect(() => {
    if (!ehMestre || status !== 'conectado') return
    const t = setInterval(() => void enviarMestre({ tipo: 'combate', combate: publico(combateRef.current) }), INTERVALO_RESSINCRONIZACAO)
    return () => clearInterval(t)
  }, [ehMestre, status, enviarMestre])

  return [combate, setCombate] as const
}
