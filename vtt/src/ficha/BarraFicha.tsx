import type { Ficha } from './esquema'
import { formatarBonus, iniciativa, resumoClasses } from './regras'
import { iniciais } from '../lib/visual'

type Props = {
  ficha: Ficha
  aoMudar: (f: Ficha) => void
  aoTestar: (rotulo: string, bonus: number) => void
  aoRolarDano: (rotulo: string, formula: string) => void
  aoAbrir: () => void
}

// Barra de ações rápidas sobre o mapa: PV, iniciativa, ataques e recursos com usos.
export default function BarraFicha({ ficha, aoMudar, aoTestar, aoRolarDano, aoAbrir }: Props) {
  const { pv } = ficha.combate

  const usar = (indice: number) =>
    aoMudar({
      ...ficha,
      caracteristicas: ficha.caracteristicas.map((c, i) =>
        i === indice && c.usosMax !== undefined ? { ...c, usosAtuais: Math.max(0, (c.usosAtuais ?? c.usosMax) - 1) } : c,
      ),
    })

  return (
    <div className="barra-ficha">
      <button className="quem" onClick={aoAbrir} title="Abrir ficha completa">
        <span className="av" style={{ background: 'var(--perigo)' }}>{iniciais(ficha.nome)}</span>
        <span>
          <b style={{ color: 'var(--text-h)' }}>{ficha.nome.split(' ')[0]}</b>
          <br />
          <strong style={{ color: 'var(--text-h)' }}>{pv.atual}</strong>{' '}
          <small className="suave">/ {pv.max} PV{pv.temporario > 0 && ` (+${pv.temporario})`}</small>
          <br />
          <small className="suave">CA {ficha.combate.ca} · {resumoClasses(ficha)} · {ficha.edicao}</small>
        </span>
      </button>

      <div className="acoes-rapidas">
        <button className="chip" onClick={() => aoTestar('Iniciativa', iniciativa(ficha))}>
          <b>{formatarBonus(iniciativa(ficha))}</b> Iniciativa
        </button>
        {ficha.ataques.map((a, i) => (
          <span className="chip" key={i}>
            ⚔ {a.nome}{' '}
            <button className="rolavel" title="Rolar ataque" onClick={() => aoTestar(`${a.nome} (ataque)`, a.bonus)}>
              {formatarBonus(a.bonus)}
            </button>{' '}
            <button className="rolavel" title="Rolar dano" onClick={() => aoRolarDano(`${a.nome} (dano)`, a.dano)}>
              {a.dano}
            </button>
          </span>
        ))}
        {ficha.caracteristicas.map((c, i) =>
          c.usosMax !== undefined ? (
            <button key={i} className="chip" title="Usar uma vez" onClick={() => usar(i)} disabled={(c.usosAtuais ?? c.usosMax) === 0}>
              {c.nome} <b>{c.usosAtuais}/{c.usosMax}</b>
            </button>
          ) : null,
        )}
      </div>
    </div>
  )
}
