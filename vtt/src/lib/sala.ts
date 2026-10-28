import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { obterId, type Papel } from './identidade'

// Sem 0/O e 1/I/L para evitar confusão ao ditar o código.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const TAMANHO_CODIGO = 6

export function gerarCodigo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TAMANHO_CODIGO))
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('')
}

export function normalizarCodigo(texto: string): string {
  return texto.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

// O que cada jogador compartilha da própria ficha com a sala (nunca a ficha inteira).
export type ResumoPersonagem = {
  nome: string
  classe: string
  edicao: '2014' | '2024'
  pv: { atual: number; max: number }
  ca: number
}

export type Participante = {
  id: string
  nome: string
  papel: Papel
  personagem?: ResumoPersonagem
}

type Meta = Omit<Participante, 'id'>

export type StatusConexao = 'conectando' | 'conectado' | 'erro'

export function useSala(codigo: string, nome: string, papel: Papel, personagem?: ResumoPersonagem) {
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [status, setStatus] = useState<StatusConexao>('conectando')
  const canalRef = useRef<RealtimeChannel | null>(null)
  const personagemJson = JSON.stringify(personagem ?? null)

  useEffect(() => {
    if (!supabase) return
    const id = obterId()
    const canal = supabase.channel(`sala:${codigo}`, {
      config: { presence: { key: id } },
    })
    canalRef.current = canal

    canal.on('presence', { event: 'sync' }, () => {
      const estado = canal.presenceState<Meta>()
      const lista = Object.entries(estado).flatMap(([chave, metas]) =>
        metas.slice(0, 1).map((m) => ({ id: chave, nome: m.nome, papel: m.papel, personagem: m.personagem })),
      )
      // Mestre primeiro, depois ordem alfabética.
      lista.sort((a, b) =>
        a.papel === b.papel ? a.nome.localeCompare(b.nome) : a.papel === 'mestre' ? -1 : 1,
      )
      setParticipantes(lista)
    })

    canal.subscribe((s) => {
      if (s === 'SUBSCRIBED') setStatus('conectado')
      else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') setStatus('erro')
    })

    return () => {
      canalRef.current = null
      void supabase?.removeChannel(canal)
    }
  }, [codigo])

  // Publica (e republica, quando a ficha muda) os dados desta pessoa na sala.
  useEffect(() => {
    if (status !== 'conectado') return
    const meta: Meta = { nome, papel, personagem: JSON.parse(personagemJson) ?? undefined }
    void canalRef.current?.track(meta)
  }, [status, nome, papel, personagemJson])

  return { participantes, status }
}
