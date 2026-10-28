import { useEffect, useRef, useState } from 'react'
import { carregarMapa, publicoMapa, salvarMapa, type Mapa } from './mapa'
import { INTERVALO_RESSINCRONIZACAO } from './combateMestre'
import type { StatusConexao } from './sala'

// Estado do mapa do mestre: guardado no navegador dele e transmitido (sem tokens ocultos)
// aos jogadores a cada mudança, quando alguém novo entra na sala e periodicamente.
export function useMapaMestre(
  codigo: string,
  ehMestre: boolean,
  status: StatusConexao,
  idsPresentes: string,
  enviarMestre: (msg: Record<string, unknown>) => Promise<void>,
) {
  const [mapa, setMapa] = useState<Mapa>(() => carregarMapa(codigo))
  const mapaRef = useRef(mapa)

  useEffect(() => {
    mapaRef.current = mapa
    if (ehMestre) salvarMapa(codigo, mapa)
  }, [codigo, ehMestre, mapa])

  useEffect(() => {
    if (!ehMestre || status !== 'conectado') return
    void enviarMestre({ tipo: 'mapa', mapa: publicoMapa(mapa) })
  }, [ehMestre, status, mapa, idsPresentes, enviarMestre])

  useEffect(() => {
    if (!ehMestre || status !== 'conectado') return
    const t = setInterval(() => void enviarMestre({ tipo: 'mapa', mapa: publicoMapa(mapaRef.current) }), INTERVALO_RESSINCRONIZACAO)
    return () => clearInterval(t)
  }, [ehMestre, status, enviarMestre])

  return [mapa, setMapa] as const
}
