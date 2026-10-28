import { ATRIBUTOS, NOMES_ATRIBUTO, PERICIAS, type Atributo, type Ficha, type PericiaId } from '../esquema'
import { bonusPericia, bonusProficiencia, bonusSalvaguarda, formatarBonus } from '../regras'
import { Etiquetas } from './campos'

type Props = { ficha: Ficha; mudar: (f: Ficha) => void }

export default function SecaoProficiencias({ ficha: f, mudar }: Props) {
  const p = f.proficiencias
  const alterar = (parcial: Partial<Ficha['proficiencias']>) => mudar({ ...f, proficiencias: { ...p, ...parcial } })

  const alternarSalva = (a: Atributo) =>
    alterar({ salvaguardas: p.salvaguardas.includes(a) ? p.salvaguardas.filter((x) => x !== a) : [...p.salvaguardas, a] })

  const definirPericia = (id: PericiaId, nivel: string) => {
    const novas = { ...p.pericias }
    if (nivel === 'proficiente' || nivel === 'especialista') novas[id] = nivel
    else delete novas[id]
    alterar({ pericias: novas })
  }

  return (
    <div className="ed-secao">
      <p className="suave">Bônus de proficiência atual: <strong>{formatarBonus(bonusProficiencia(f))}</strong> (calculado pelo nível total).</p>

      <h4 className="ed-subtitulo">Salvaguardas</h4>
      <div className="ed-salvas">
        {ATRIBUTOS.map((a) => (
          <label key={a} className="ed-check">
            <input type="checkbox" checked={p.salvaguardas.includes(a)} onChange={() => alternarSalva(a)} />
            {NOMES_ATRIBUTO[a]} <b>{formatarBonus(bonusSalvaguarda(f, a))}</b>
          </label>
        ))}
      </div>

      <h4 className="ed-subtitulo">Perícias</h4>
      <div className="ed-pericias">
        {(Object.keys(PERICIAS) as PericiaId[]).map((id) => (
          <div className="ed-pericia" key={id}>
            <span>
              {PERICIAS[id].nome} <small className="suave">{PERICIAS[id].atributo.toUpperCase()}</small>
            </span>
            <select value={p.pericias[id] ?? ''} aria-label={`Proficiência em ${PERICIAS[id].nome}`} onChange={(e) => definirPericia(id, e.target.value)}>
              <option value="">—</option>
              <option value="proficiente">Proficiente</option>
              <option value="especialista">Especialista</option>
            </select>
            <b>{formatarBonus(bonusPericia(f, id))}</b>
          </div>
        ))}
      </div>

      <div className="ed-grade" style={{ marginTop: 16 }}>
        <Etiquetas rotulo="Idiomas" itens={p.idiomas} aoMudar={(idiomas) => alterar({ idiomas })} max={40} />
        <Etiquetas rotulo="Ferramentas" itens={p.ferramentas} aoMudar={(ferramentas) => alterar({ ferramentas })} />
        <Etiquetas rotulo="Armas" itens={p.armas} aoMudar={(armas) => alterar({ armas })} />
        <Etiquetas rotulo="Armaduras" itens={p.armaduras} aoMudar={(armaduras) => alterar({ armaduras })} />
      </div>
    </div>
  )
}
