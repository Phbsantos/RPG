import { useState } from 'react'
import {
  atualizar,
  curaPv,
  danoPv,
  encerrar,
  estadoNpc,
  iniciar,
  ordenados,
  proximoTurno,
  remover,
  type Combate,
  type Combatente,
} from '../lib/combate'
import { rolar, totalDe } from '../lib/dados'
import { CONDICOES } from '../ficha/esquema'
import type { Participante } from '../lib/sala'

type Props = {
  combate: Combate
  aoMudar: (atualizar: (c: Combate) => Combate) => void
  participantes: Participante[]
  enviarMestre: (msg: Record<string, unknown>) => Promise<void>
}

const NPC_INICIAL = { nome: '', pv: 10, ca: 12, bonus: 0, qtd: 1 }

const inteiro = (texto: string, padrao: number) => {
  const n = Math.floor(Number(texto))
  return Number.isFinite(n) ? n : padrao
}

export default function CombateMestre({ combate, aoMudar, participantes, enviarMestre }: Props) {
  const [quantia, setQuantia] = useState(1)
  const [condicao, setCondicao] = useState<string>(CONDICOES[0])
  const [npc, setNpc] = useState(NPC_INICIAL)

  const lista = ordenados(combate)
  const resumoDe = (c: Combatente) => participantes.find((p) => p.id === c.donoId)?.personagem
  const novos = participantes.filter(
    (p) => p.papel === 'jogador' && p.personagem && !combate.combatentes.some((c) => c.donoId === p.id),
  )
  const proximaOrdem = (c: Combate) => 1 + Math.max(-1, ...c.combatentes.map((x) => x.ordem))

  function adicionarJogadores() {
    aoMudar((c) => {
      let ordem = proximaOrdem(c)
      const adicionados: Combatente[] = novos.map((p) => ({
        id: crypto.randomUUID(),
        nome: p.personagem!.nome,
        tipo: 'pc',
        donoId: p.id,
        iniciativa: null,
        bonusIniciativa: 0,
        ordem: ordem++,
        pv: { atual: p.personagem!.pv.atual, max: Math.max(1, p.personagem!.pv.max), temp: 0 },
        ca: p.personagem!.ca,
        condicoes: [],
        oculto: false,
      }))
      return { ...c, combatentes: [...c.combatentes, ...adicionados] }
    })
  }

  function adicionarNpcs() {
    const nome = npc.nome.trim()
    if (!nome) return
    const qtd = Math.min(20, Math.max(1, npc.qtd))
    aoMudar((c) => {
      let ordem = proximaOrdem(c)
      const adicionados: Combatente[] = Array.from({ length: qtd }, (_, i) => ({
        id: crypto.randomUUID(),
        nome: qtd > 1 ? `${nome} ${i + 1}` : nome,
        tipo: 'npc',
        iniciativa: null,
        bonusIniciativa: npc.bonus,
        ordem: ordem++,
        pv: { atual: Math.max(1, npc.pv), max: Math.max(1, npc.pv), temp: 0 },
        ca: npc.ca,
        condicoes: [],
        oculto: false,
      }))
      return { ...c, combatentes: [...c.combatentes, ...adicionados] }
    })
    setNpc({ ...NPC_INICIAL, ca: npc.ca })
  }

  function rolarIniciativaDosNpcs() {
    aoMudar((c) => ({
      ...c,
      combatentes: c.combatentes.map((x) => {
        if (x.tipo !== 'npc' || x.iniciativa !== null) return x
        const formula = `1d20${x.bonusIniciativa >= 0 ? '+' : '-'}${Math.abs(x.bonusIniciativa)}`
        const r = rolar(formula, { id: 'mestre', nome: x.nome })
        return r.ok ? { ...x, iniciativa: totalDe(r.registro.termos) } : x
      }),
    }))
  }

  // PCs: o mestre pede e a ficha do jogador aplica (o jogador é dono dos próprios PV).
  // NPCs: o PV mora aqui, no navegador do mestre.
  function aplicar(c: Combatente, tipo: 'dano' | 'cura') {
    if (c.tipo === 'pc') {
      if (c.donoId) void enviarMestre({ tipo: 'aplicar', id: crypto.randomUUID(), alvoId: c.donoId, acao: { tipo, valor: quantia } })
      return
    }
    aoMudar((estado) =>
      atualizar(estado, c.id, { pv: tipo === 'dano' ? danoPv(c.pv, quantia) : curaPv(c.pv, quantia) }),
    )
  }

  function mudarCondicao(c: Combatente, nome: string, adicionar: boolean) {
    if (c.tipo === 'pc') {
      if (c.donoId) void enviarMestre({ tipo: 'aplicar', id: crypto.randomUUID(), alvoId: c.donoId, acao: { tipo: 'condicao', nome, adicionar } })
      return
    }
    const atuais = c.condicoes.filter((x) => x !== nome)
    aoMudar((estado) => atualizar(estado, c.id, { condicoes: adicionar ? [...atuais, nome] : atuais }))
  }

  const faltaIniciativa = combate.combatentes.some((c) => c.tipo === 'npc' && c.iniciativa === null)
  const vezDe = combate.combatentes.find((c) => c.id === combate.turnoId)

  return (
    <section className="cartao">
      <h3>Combate {combate.ativo ? `— Rodada ${combate.rodada}` : '(preparando)'}</h3>

      <div className="acoes">
        {!combate.ativo ? (
          <button disabled={lista.every((c) => c.iniciativa === null)} onClick={() => aoMudar(iniciar)}>
            Iniciar combate
          </button>
        ) : (
          <>
            <button onClick={() => aoMudar(proximoTurno)}>Próximo turno</button>
            <button onClick={() => window.confirm('Encerrar o combate?') && aoMudar(encerrar)}>Encerrar</button>
          </>
        )}
        {faltaIniciativa && <button onClick={rolarIniciativaDosNpcs}>Rolar iniciativa dos NPCs</button>}
        {novos.length > 0 && <button onClick={adicionarJogadores}>Adicionar jogadores ({novos.length})</button>}
        {combate.combatentes.length > 0 && (
          <button onClick={() => window.confirm('Limpar todos os combatentes?') && aoMudar(() => ({ ativo: false, rodada: 0, turnoId: null, combatentes: [] }))}>
            Limpar
          </button>
        )}
      </div>
      {combate.ativo && vezDe && <p>Vez de: <strong>{vezDe.nome}</strong></p>}

      <details open={combate.combatentes.length === 0}>
        <summary>Adicionar monstros / NPCs</summary>
        <div className="form-npc">
          <label>Nome<input value={npc.nome} onChange={(e) => setNpc({ ...npc, nome: e.target.value })} maxLength={50} /></label>
          <label>PV<input type="number" min={1} value={npc.pv} onChange={(e) => setNpc({ ...npc, pv: inteiro(e.target.value, 1) })} /></label>
          <label>CA<input type="number" min={0} value={npc.ca} onChange={(e) => setNpc({ ...npc, ca: inteiro(e.target.value, 10) })} /></label>
          <label>Bônus de iniciativa<input type="number" value={npc.bonus} onChange={(e) => setNpc({ ...npc, bonus: inteiro(e.target.value, 0) })} /></label>
          <label>Quantidade<input type="number" min={1} max={20} value={npc.qtd} onChange={(e) => setNpc({ ...npc, qtd: inteiro(e.target.value, 1) })} /></label>
          <button disabled={!npc.nome.trim()} onClick={adicionarNpcs}>Adicionar</button>
        </div>
      </details>

      <div className="acoes">
        <label>
          Valor{' '}
          <input type="number" min={1} className="curto" value={quantia} onChange={(e) => setQuantia(Math.max(1, inteiro(e.target.value, 1)))} />
        </label>
        <label>
          Condição{' '}
          <select value={condicao} onChange={(e) => setCondicao(e.target.value)}>
            {CONDICOES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <ol className="ordem">
        {lista.map((c) => {
          const resumo = resumoDe(c)
          const condicoes = c.tipo === 'pc' ? (resumo?.condicoes ?? []) : c.condicoes
          return (
            <li key={c.id} className={c.id === combate.turnoId ? 'turno' : ''}>
              <input
                type="number"
                className="curto ini"
                aria-label={`Iniciativa de ${c.nome}`}
                value={c.iniciativa ?? ''}
                placeholder="–"
                onChange={(e) =>
                  aoMudar((estado) => atualizar(estado, c.id, { iniciativa: e.target.value === '' ? null : Math.max(-20, Math.min(60, inteiro(e.target.value, 0))) }))
                }
              />
              <span className="nome">
                {c.id === combate.turnoId && '▶ '}
                {c.nome} <span className="selo">{c.tipo === 'pc' ? 'PC' : 'NPC'}</span>
                {c.oculto && <span className="selo"> oculto</span>}
              </span>
              <span>
                {c.tipo === 'pc'
                  ? resumo
                    ? `PV ${resumo.pv.atual}/${resumo.pv.max} · CA ${resumo.ca}`
                    : 'offline'
                  : `PV ${c.pv.atual}/${c.pv.max}${c.pv.temp ? ` (+${c.pv.temp})` : ''} · CA ${c.ca} · ${estadoNpc(c.pv)}`}
              </span>
              <span className="acoes">
                <button disabled={c.tipo === 'pc' && !resumo} onClick={() => aplicar(c, 'dano')}>Dano</button>
                <button disabled={c.tipo === 'pc' && !resumo} onClick={() => aplicar(c, 'cura')}>Cura</button>
                <button disabled={c.tipo === 'pc' && !resumo} onClick={() => mudarCondicao(c, condicao, true)}>+ Condição</button>
                {c.tipo === 'npc' && (
                  <button onClick={() => aoMudar((estado) => atualizar(estado, c.id, { oculto: !c.oculto }))}>
                    {c.oculto ? 'Revelar' : 'Ocultar'}
                  </button>
                )}
                <button onClick={() => aoMudar((estado) => remover(estado, c.id))}>Remover</button>
              </span>
              {condicoes.length > 0 && (
                <span className="etiquetas">
                  {condicoes.map((x) => (
                    <button key={x} className="etiqueta" title="Remover condição" onClick={() => mudarCondicao(c, x, false)}>
                      {x} ✕
                    </button>
                  ))}
                </span>
              )}
            </li>
          )
        })}
      </ol>
      <p className="suave">
        Dano e cura em jogadores são enviados à ficha deles. Monstros ocultos e o PV exato dos NPCs nunca vão para os jogadores.
      </p>
    </section>
  )
}
