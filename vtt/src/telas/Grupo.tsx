import type { Participante } from '../lib/sala'

type Props = { participantes: Participante[]; meuId: string }

export default function Grupo({ participantes, meuId }: Props) {
  return (
    <section className="cartao">
      <h3>Na sala ({participantes.length})</h3>
      <ul className="participantes">
        {participantes.map((p) => (
          <li key={p.id}>
            <span>
              <strong style={{ color: 'var(--text-h)' }}>
                {p.nome}
                {p.id === meuId && ' (você)'}
              </strong>
              <span className={`selo ${p.papel}`}>{p.papel === 'mestre' ? 'Mestre' : 'Jogador'}</span>
            </span>
            {p.personagem && (
              <span className="suave" style={{ fontSize: '0.85rem' }}>
                {p.personagem.nome}, {p.personagem.classe} · PV {p.personagem.pv.atual}/{p.personagem.pv.max} · CA {p.personagem.ca} · {p.personagem.edicao}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
