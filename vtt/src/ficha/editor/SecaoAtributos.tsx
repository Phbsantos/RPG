import { ATRIBUTOS, NOMES_ATRIBUTO, type Ficha } from '../esquema'
import { CONJUNTO_PADRAO, PONTOS_COMPRA, custoCompra } from '../novaFicha'
import { formatarBonus, modificador } from '../regras'
import { rolar, totalDe } from '../../lib/dados'
import { Num } from './campos'

type Props = { ficha: Ficha; mudar: (f: Ficha) => void }

export default function SecaoAtributos({ ficha: f, mudar }: Props) {
  const custo = custoCompra(f.atributos)

  function rolarTodos() {
    // 4d6, descarta o menor: um valor para cada atributo.
    const atributos = { ...f.atributos }
    for (const a of ATRIBUTOS) {
      const r = rolar('4d6kh3', { id: 'editor', nome: 'editor' })
      if (r.ok) atributos[a] = totalDe(r.registro.termos)
    }
    mudar({ ...f, atributos })
  }

  return (
    <div className="ed-secao">
      <p className="suave">Informe os valores <strong>finais</strong>, já somando os bônus de {f.edicao === '2014' ? 'raça' : 'antecedente'} e talentos.</p>

      <div className="atributos ed-atributos">
        {ATRIBUTOS.map((a) => (
          <div className="atributo ed-atributo" key={a}>
            <small>{NOMES_ATRIBUTO[a].toUpperCase()}</small>
            <Num valor={f.atributos[a]} aoMudar={(v) => mudar({ ...f, atributos: { ...f.atributos, [a]: v } })} min={1} max={30} rotulo={NOMES_ATRIBUTO[a]} />
            <span>{formatarBonus(modificador(f.atributos[a]))}</span>
          </div>
        ))}
      </div>

      <div className="acoes" style={{ marginTop: 12 }}>
        <button
          type="button"
          title="15, 14, 13, 12, 10 e 8, na ordem Força → Carisma. Depois troque como preferir."
          onClick={() => mudar({ ...f, atributos: Object.fromEntries(ATRIBUTOS.map((a, i) => [a, CONJUNTO_PADRAO[i]])) as Ficha['atributos'] })}
        >
          Conjunto padrão (15 14 13 12 10 8)
        </button>
        <button type="button" onClick={rolarTodos} title="Rola 4d6 e descarta o menor, para cada atributo">
          Rolar 4d6 (descarta o menor)
        </button>
        <button type="button" onClick={() => mudar({ ...f, atributos: { for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10 } })}>
          Zerar (tudo 10)
        </button>
      </div>

      <p className={custo !== null && custo > PONTOS_COMPRA ? 'erro' : 'suave'} style={{ marginTop: 10 }}>
        {custo === null
          ? 'Compra de pontos: só se aplica com todos os valores entre 8 e 15.'
          : `Compra de pontos: ${custo} de ${PONTOS_COMPRA} pontos usados${custo > PONTOS_COMPRA ? ' (passou do limite)' : custo === PONTOS_COMPRA ? ' (completo)' : ''}.`}
      </p>
    </div>
  )
}
