import { useState } from 'react'
import { criticoDe, formulaTeste, totalDe, type ModoD20, type Registro, type Termo } from '../lib/dados'

type Props = {
  rolagens: Registro[]
  modo: ModoD20
  aoMudarModo: (m: ModoD20) => void
  ehMestre: boolean
  erro: string
  aoRolar: (formula: string, secreta: boolean) => void
}

const DADOS_RAPIDOS = [4, 6, 8, 10, 12, 20, 100]

export default function PainelDados({ rolagens, modo, aoMudarModo, ehMestre, erro, aoRolar }: Props) {
  const [formula, setFormula] = useState('1d20')
  const [secreta, setSecreta] = useState(false)

  return (
    <section className="dados">
      <h3 className="painel-titulo">Dados</h3>

      <div className="dados-rapidos">
        {DADOS_RAPIDOS.map((l) => (
          <button key={l} className={l === 20 ? 'd20' : ''} onClick={() => aoRolar(l === 20 ? formulaTeste(0, modo) : `1d${l}`, secreta && ehMestre)}>
            d{l}
          </button>
        ))}
      </div>

      <form
        className="acoes"
        onSubmit={(e) => {
          e.preventDefault()
          aoRolar(formula, secreta && ehMestre)
        }}
      >
        <input style={{ flex: 1, minWidth: 0 }} value={formula} onChange={(e) => setFormula(e.target.value)} placeholder="2d6+3" aria-label="Fórmula" />
        <button type="submit">Rolar</button>
      </form>

      <div className="acoes" style={{ marginTop: 8 }}>
        <select value={modo} onChange={(e) => aoMudarModo(e.target.value as ModoD20)} aria-label="Modo do d20">
          <option value="normal">Normal</option>
          <option value="vantagem">Vantagem</option>
          <option value="desvantagem">Desvantagem</option>
        </select>
        {ehMestre && (
          <label>
            <input type="checkbox" checked={secreta} onChange={(e) => setSecreta(e.target.checked)} /> Secreta (só eu vejo)
          </label>
        )}
      </div>

      {erro && (
        <p className="erro" role="alert" style={{ marginTop: 6 }}>
          {erro}
        </p>
      )}

      <h3 className="painel-titulo" style={{ marginTop: 14, marginBottom: 0 }}>Histórico</h3>
      <ul className="historico">
        {rolagens.map((r) => (
          <LinhaRolagem key={r.id} r={r} />
        ))}
        {rolagens.length === 0 && <li className="suave">Nenhuma rolagem ainda.</li>}
      </ul>
    </section>
  )
}

function LinhaRolagem({ r }: { r: Registro }) {
  const critico = criticoDe(r.termos)
  return (
    <li className={critico === 'max' ? 'critico' : critico === 'min' ? 'falha' : ''}>
      <strong>{r.autor}</strong>
      {r.secreta && <span className="selo"> secreta</span>}
      {r.rotulo && <> — {r.rotulo}</>} <span className="suave">{r.formula}</span>
      <div>
        {r.termos.map((t, i) => (
          <TermoVista key={i} t={t} primeiro={i === 0} />
        ))}{' '}
        = <strong className="total">{totalDe(r.termos)}</strong>
      </div>
    </li>
  )
}

function TermoVista({ t, primeiro }: { t: Termo; primeiro: boolean }) {
  const sinal = t.sinal === -1 ? ' − ' : primeiro ? '' : ' + '
  if (t.tipo === 'fixo') return <span>{sinal}{t.valor}</span>
  return (
    <span>
      {sinal}[
      {t.valores.map((v, i) => (
        <span key={i}>
          {i > 0 && ', '}
          {t.mantidos[i] ? v : <s className="suave">{v}</s>}
        </span>
      ))}
      ]
    </span>
  )
}
