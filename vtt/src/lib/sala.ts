import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { obterId, type Papel } from './identidade'
import { validarRegistro, type Registro } from './dados'
import { assinar, verificar } from './seguranca'
import { MoverSchema, type Mapa } from './mapa'
import {
  EnvelopeSchema,
  IniciativaSchema,
  MensagemMestreSchema,
  type Comando,
  type Publico,
} from './combate'

// Sem 0/O e 1/I/L para evitar confusão ao ditar o código.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const TAMANHO_CODIGO = 6
const MAX_ROLAGENS = 100
const IDADE_MAXIMA_COMANDO = 10 * 60 * 1000

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
  condicoes: string[]
}

export type Participante = {
  id: string
  nome: string
  papel: Papel
  personagem?: ResumoPersonagem
}

type Meta = Omit<Participante, 'id'>

export type StatusConexao = 'conectando' | 'conectado' | 'erro'

type Opcoes = {
  codigo: string
  nome: string
  papel: Papel
  personagem?: ResumoPersonagem
  aoComando?: (c: Comando) => void // jogador: o mestre mandou alterar a minha ficha
  aoIniciativa?: (autorId: string, valor: number) => void // mestre: um jogador rolou iniciativa
  aoMover?: (autorId: string, tokenId: string, x: number, y: number) => void // mestre: jogador moveu um token
}

export function useSala({ codigo, nome, papel, personagem, aoComando, aoIniciativa, aoMover }: Opcoes) {
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [rolagens, setRolagens] = useState<Registro[]>([])
  const [combate, setCombate] = useState<Publico | null>(null)
  const [status, setStatus] = useState<StatusConexao>('conectando')
  const canalRef = useRef<RealtimeChannel | null>(null)
  const seqEnviadaRef = useRef(0)
  const seqRecebidaRef = useRef({ combate: 0, mapa: 0 })
  const [mapa, setMapa] = useState<Mapa | null>(null)
  const comandosAplicadosRef = useRef(new Set<string>())
  const aoComandoRef = useRef(aoComando)
  const aoIniciativaRef = useRef(aoIniciativa)
  const aoMoverRef = useRef(aoMover)
  const personagemJson = JSON.stringify(personagem ?? null)

  useEffect(() => {
    aoComandoRef.current = aoComando
    aoIniciativaRef.current = aoIniciativa
    aoMoverRef.current = aoMover
  })

  useEffect(() => {
    if (!supabase) return
    const id = obterId()
    const canal = supabase.channel(`sala:${codigo}`, {
      // self: true devolve ao remetente a própria rolagem, mantendo uma só ordem para todos.
      config: { presence: { key: id }, broadcast: { self: true } },
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

    canal.on('broadcast', { event: 'rolagem' }, ({ payload }) => {
      const registro = validarRegistro(payload) // dado de fora da rede: sempre validar
      if (!registro) return
      setRolagens((l) => (l.some((r) => r.id === registro.id) ? l : [registro, ...l].slice(0, MAX_ROLAGENS)))
    })

    // Mensagens do mestre: só valem se a assinatura bater com a chave dele.
    canal.on('broadcast', { event: 'mestre' }, async ({ payload }) => {
      if (papel === 'mestre') return
      const env = EnvelopeSchema.safeParse(payload)
      if (!env.success || !(await verificar(codigo, env.data))) return
      let bruto: unknown
      try {
        bruto = JSON.parse(env.data.payload)
      } catch {
        return
      }
      const msg = MensagemMestreSchema.safeParse(bruto)
      if (!msg.success) return
      if (msg.data.tipo === 'combate') {
        if (msg.data.seq <= seqRecebidaRef.current.combate) return // chegou fora de ordem: já temos algo mais novo
        seqRecebidaRef.current.combate = msg.data.seq
        setCombate(msg.data.combate)
      } else if (msg.data.tipo === 'mapa') {
        if (msg.data.seq <= seqRecebidaRef.current.mapa) return
        seqRecebidaRef.current.mapa = msg.data.seq
        setMapa(msg.data.mapa)
      } else if (msg.data.alvoId === id) {
        // Ignora comandos repetidos ou antigos (impede reaproveitar uma mensagem assinada gravada).
        const c = msg.data
        if (comandosAplicadosRef.current.has(c.id) || Math.abs(Date.now() - c.seq) > IDADE_MAXIMA_COMANDO) return
        comandosAplicadosRef.current.add(c.id)
        aoComandoRef.current?.(c)
      }
    })

    canal.on('broadcast', { event: 'mover' }, ({ payload }) => {
      if (papel !== 'mestre') return
      const r = MoverSchema.safeParse(payload)
      if (r.success) aoMoverRef.current?.(r.data.autorId, r.data.tokenId, r.data.x, r.data.y)
    })

    canal.on('broadcast', { event: 'iniciativa' }, ({ payload }) => {
      if (papel !== 'mestre') return
      const r = IniciativaSchema.safeParse(payload)
      if (r.success) aoIniciativaRef.current?.(r.data.autorId, r.data.valor)
    })

    canal.subscribe((s) => {
      if (s === 'SUBSCRIBED') setStatus('conectado')
      else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') setStatus('erro')
    })

    return () => {
      canalRef.current = null
      void supabase?.removeChannel(canal)
    }
  }, [codigo, papel])

  // Publica (e republica, quando a ficha muda) os dados desta pessoa na sala.
  useEffect(() => {
    if (status !== 'conectado') return
    const meta: Meta = { nome, papel, personagem: JSON.parse(personagemJson) ?? undefined }
    void canalRef.current?.track(meta)
  }, [status, nome, papel, personagemJson])

  // Rolagem pública: todos na sala veem.
  const enviarRolagem = useCallback((registro: Registro) => {
    void canalRef.current?.send({ type: 'broadcast', event: 'rolagem', payload: registro })
  }, [])

  // Rolagem secreta do mestre: fica só no navegador dele.
  const registrarLocal = useCallback((registro: Registro) => {
    setRolagens((l) => [{ ...registro, secreta: true }, ...l].slice(0, MAX_ROLAGENS))
  }, [])

  // Mestre → jogadores, assinado. O número de sequência cresce sempre.
  const enviarMestre = useCallback(
    async (msg: Record<string, unknown>) => {
      const canal = canalRef.current
      if (!canal) return
      seqEnviadaRef.current = Math.max(Date.now(), seqEnviadaRef.current + 1)
      const payload = JSON.stringify({ ...msg, seq: seqEnviadaRef.current })
      const envelope = await assinar(codigo, payload)
      if (!envelope) return
      await canal.send({ type: 'broadcast', event: 'mestre', payload: envelope })
    },
    [codigo],
  )

  // Jogador → mestre.
  const enviarIniciativa = useCallback((valor: number) => {
    void canalRef.current?.send({
      type: 'broadcast',
      event: 'iniciativa',
      payload: { autorId: obterId(), valor },
    })
  }, [])

  const enviarMovimento = useCallback((tokenId: string, x: number, y: number) => {
    void canalRef.current?.send({
      type: 'broadcast',
      event: 'mover',
      payload: { autorId: obterId(), tokenId, x, y },
    })
  }, [])

  return {
    participantes,
    rolagens,
    combate,
    mapa,
    status,
    enviarRolagem,
    registrarLocal,
    enviarMestre,
    enviarIniciativa,
    enviarMovimento,
  }
}
