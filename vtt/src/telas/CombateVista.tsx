import type { Publico } from '../lib/combate'
import type { Participante } from '../lib/sala'
import { corDeAvatar, corDoPv, iniciais } from '../lib/visual'

type Props = {
  combate: Publico | null
  participantes: Participante[]
  meuId: string
  aoRolarIniciativa: () => void
}

// O que os jogadores veem do combate: ordem, turno, PV dos aliados e estado (não o PV) dos monstros.
export default function CombateVista({ combate, participantes, meuId, aoRolarIniciativa }: Props) {
  if (!combate || (!combate.ativo && combate.combatentes.length === 0)) {
    return (
      <section className="cartao">
        <h3>Combate</h3>
        <p className="suave">Nenhum combate em andamento.</p>
      </section>
    )
  }

  const meuTurno = combate.combatentes.find((c) => c.id === combate.turnoId)?.donoId === meuId
  const preciso = combate.combatentes.some((c) => c.donoId === meuId && c.iniciativa === null)

  return (
    <section className="cartao">
      <h3>Combate {combate.ativo ? `— Rodada ${combate.rodada}` : '(preparando)'}</h3>
      {meuTurno && <p className="ok">É a sua vez!</p>}
      {preciso && <button className="pri" onClick={aoRolarIniciativa}>Rolar minha iniciativa</button>}

      <ul className="ordem">
        {combate.combatentes.map((c, i) => {
          const resumo = participantes.find((p) => p.id === c.donoId)?.personagem
          const condicoes = c.tipo === 'pc' ? (resumo?.condicoes ?? []) : c.condicoes
          const fracao = resumo ? resumo.pv.atual / Math.max(1, resumo.pv.max) : null
          return (
            <li key={c.id} className={c.id === combate.turnoId ? 'turno' : ''} style={{ cursor: 'default' }}>
              <span className="ini">{c.iniciativa ?? '–'}</span>
              <span className="av" style={{ background: corDeAvatar(i) }}>{iniciais(c.nome)}</span>
              <span className="info">
                <b>
                  {c.id === combate.turnoId && '▶ '}
                  {c.nome}
                  {c.donoId === meuId && ' (você)'}
                </b>
                <small>
                  {c.tipo === 'pc'
                    ? resumo
                      ? `PV ${resumo.pv.atual}/${resumo.pv.max} · CA ${resumo.ca}`
                      : 'offline'
                    : c.estado}
                </small>
                {fracao !== null && (
                  <span className="barra"><i style={{ width: `${Math.max(0, Math.min(1, fracao)) * 100}%`, background: corDoPv(fracao) }} /></span>
                )}
              </span>
              {condicoes.length > 0 && (
                <span className="etiquetas" style={{ flexBasis: '100%' }}>
                  {condicoes.map((x) => (
                    <span key={x} className="selo">
                      {x}
                    </span>
                  ))}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
