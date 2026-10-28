import { useEffect, useState } from 'react'
import { carregarCombate, publico, salvarCombate, type Combate } from './combate'
import type { StatusConexao } from './sala'

// Estado do combate do mestre: guardado no navegador dele e transmitido (versão pública)
// aos jogadores a cada mudança, e também quando alguém novo entra na sala.
export function useCombateMestre(
  codigo: string,
  ehMestre: boolean,
  status: StatusConexao,
  idsPresentes: string,
  enviarMestre: (msg: Record<string, unknown>) => Promise<void>,
) {
  const [combate, setCombate] = useState<Combate>(() => carregarCombate(codigo))

  useEffect(() => {
    if (ehMestre) salvarCombate(codigo, combate)
  }, [codigo, ehMestre, combate])

  useEffect(() => {
    if (!ehMestre || status !== 'conectado') return
    void enviarMestre({ tipo: 'combate', combate: publico(combate) })
  }, [ehMestre, status, combate, idsPresentes, enviarMestre])

  return [combate, setCombate] as const
}
