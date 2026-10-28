import type { Publico } from '../lib/combate'
import type { Participante } from '../lib/sala'

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
      <h3>
        Combate {combate.ativo ? `— Rodada ${combate.rodada}` : '(preparando)'}
      </h3>
      {meuTurno && <p className="ok">É a sua vez!</p>}
      {preciso && <button onClick={aoRolarIniciativa}>Rolar minha iniciativa</button>}

      <ol className="ordem">
        {combate.combatentes.map((c) => {
          const resumo = participantes.find((p) => p.id === c.donoId)?.personagem
          const condicoes = c.tipo === 'pc' ? (resumo?.condicoes ?? []) : c.condicoes
          return (
            <li key={c.id} className={c.id === combate.turnoId ? 'turno' : ''}>
              <span className="ini">{c.iniciativa ?? '–'}</span>
              <span className="nome">
                {c.id === combate.turnoId && '▶ '}
                {c.nome}
                {c.donoId === meuId && ' (você)'}
              </span>
              <span className="suave">
                {c.tipo === 'pc'
                  ? resumo
                    ? `PV ${resumo.pv.atual}/${resumo.pv.max} · CA ${resumo.ca}`
                    : 'offline'
                  : c.estado}
              </span>
              {condicoes.length > 0 && (
                <span className="etiquetas">
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
      </ol>
    </section>
  )
}
