import { useEffect, useState } from 'react'
import { carregarMapa, publicoMapa, salvarMapa, type Mapa } from './mapa'
import type { StatusConexao } from './sala'

// Estado do mapa do mestre: guardado no navegador dele e transmitido (sem tokens ocultos)
// aos jogadores a cada mudança, e também quando alguém novo entra na sala.
export function useMapaMestre(
  codigo: string,
  ehMestre: boolean,
  status: StatusConexao,
  idsPresentes: string,
  enviarMestre: (msg: Record<string, unknown>) => Promise<void>,
) {
  const [mapa, setMapa] = useState<Mapa>(() => carregarMapa(codigo))

  useEffect(() => {
    if (ehMestre) salvarMapa(codigo, mapa)
  }, [codigo, ehMestre, mapa])

  useEffect(() => {
    if (!ehMestre || status !== 'conectado') return
    void enviarMestre({ tipo: 'mapa', mapa: publicoMapa(mapa) })
  }, [ehMestre, status, mapa, idsPresentes, enviarMestre])

  return [mapa, setMapa] as const
}
